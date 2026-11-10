// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20V3 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title HireWif V3 - a permissionless market for paid agent answers.
/// @notice Anyone can list an agent by locking a WIF bond of at least 10x its price.
///         The price is enforced by the contract, the 10% burn cannot be redirected,
///         and every open hire reserves its full payment out of the operator's bond.
///         If the operator does not commit an answer within COMMIT_WINDOW, anyone can
///         trigger the refund and the hirer is paid back in full from that reserve.
/// @dev No owner, no pause, no upgrade, no rescue. The only mutating paths are below.
///
///      Invariant: for every agent, reserved <= bond, where reserved is the sum of
///      `paid` over its hires that are neither committed nor refunded. The operator
///      cannot close the agent, lower the bond below the reserve, or reuse a closed
///      agent id, so a refund that is owed can always be paid.
contract HireWifV3 {
    address public constant WIF = 0x5173b8eA6923c2d40267890D45C46a3480954773;
    address public constant BURN = 0x000000000000000000000000000000000000dEaD;

    uint256 public constant BURN_BPS = 1000; // 10% of every hire is burned
    uint256 public constant BOND_MULTIPLE = 10; // bond must be at least 10x the listed price
    uint256 public constant COMMIT_WINDOW = 10 minutes; // time an operator has to commit an answer

    struct Agent {
        address payout;
        uint256 price;
        uint256 bond;
        uint256 reserved; // bond earmarked for open hires
        uint256 open; // hires neither committed nor refunded
        uint256 hires;
        uint256 paid;
        uint256 burned;
        uint256 slashed;
        bool active;
    }

    struct HireRecord {
        bytes32 agentId;
        address hirer;
        uint256 paid;
        uint256 deadline; // unix time after which an uncommitted hire is refundable
        bool committed;
        bool refunded;
        bytes32 answerHash;
    }

    mapping(bytes32 => Agent) private _agents;
    bytes32[] private _ids;
    mapping(uint256 => HireRecord) public hires;
    mapping(address => uint256) public earnings;
    mapping(address => mapping(uint256 => bool)) public usedNonce;

    uint256 public hireCount;
    uint256 public totalPaid;
    uint256 public totalBurned;
    uint256 public totalRefunded;

    event AgentRegistered(bytes32 indexed agentId, address indexed payout, uint256 price, uint256 bond);
    event AgentUpdated(bytes32 indexed agentId, uint256 price, uint256 bond);
    event AgentClosed(bytes32 indexed agentId, uint256 bondReturned);
    event Hired(
        uint256 indexed hireId,
        bytes32 indexed agentId,
        address indexed hirer,
        uint256 paid,
        uint256 burned,
        bytes32 taskHash,
        uint256 nonce
    );
    event Committed(uint256 indexed hireId, bytes32 answerHash);
    event Refunded(uint256 indexed hireId, address indexed hirer, uint256 amount);
    event BondSlashed(bytes32 indexed agentId, address indexed hirer, uint256 amount);
    event EarningsWithdrawn(address indexed payout, uint256 amount);

    // ---------------------------------------------------------------- registry

    /// @notice List an agent. The bond is pulled from msg.sender and held by this contract.
    /// @dev An id can be registered once. A closed id stays closed, so old hires can never
    ///      be settled against a new operator's bond.
    function register(bytes32 agentId, uint256 price, address payout, uint256 bond) external {
        require(agentId != bytes32(0), "agent id required");
        require(_agents[agentId].payout == address(0), "agent id taken");
        require(payout != address(0), "payout required");
        require(price > 0, "price required");
        require(bond >= price * BOND_MULTIPLE, "bond must be 10x price");

        _pull(msg.sender, bond);

        Agent storage a = _agents[agentId];
        a.payout = payout;
        a.price = price;
        a.bond = bond;
        a.active = true;
        _ids.push(agentId);

        emit AgentRegistered(agentId, payout, price, bond);
    }

    /// @notice Change the listed price and top up or release bond. Operator only.
    /// @dev Bond held for open hires can never be released.
    function updateAgent(bytes32 agentId, uint256 price, uint256 bond) external {
        Agent storage a = _agents[agentId];
        require(a.active, "unknown agent");
        require(a.payout == msg.sender, "not the operator");
        require(price > 0, "price required");
        require(bond >= price * BOND_MULTIPLE, "bond must be 10x price");
        require(bond >= a.reserved, "bond reserved for open hires");

        uint256 current = a.bond;
        a.price = price;
        a.bond = bond;

        if (bond > current) {
            _pull(msg.sender, bond - current);
        } else if (bond < current) {
            _push(msg.sender, current - bond);
        }

        emit AgentUpdated(agentId, price, bond);
    }

    /// @notice Stop taking new hires and recover the bond. Every hire must be settled first:
    ///         committed in time, or refunded (anyone can trigger an overdue refund).
    function closeAgent(bytes32 agentId) external {
        Agent storage a = _agents[agentId];
        require(a.active, "unknown agent");
        require(a.payout == msg.sender, "not the operator");
        require(a.open == 0, "hire still open");

        a.active = false;
        uint256 bond = a.bond;
        a.bond = 0;
        if (bond > 0) _push(msg.sender, bond);

        emit AgentClosed(agentId, bond);
    }

    // ------------------------------------------------------------------- hires

    /// @notice Hire a listed agent at its listed price. The price is not a client choice, and
    ///         `maxPrice` stops the operator from raising it between signing and inclusion.
    function hire(bytes32 agentId, bytes32 taskHash, uint256 nonce, uint256 maxPrice)
        external
        returns (uint256 hireId)
    {
        Agent storage a = _agents[agentId];
        require(a.active, "unknown agent");
        require(taskHash != bytes32(0), "task hash required");
        require(!usedNonce[msg.sender][nonce], "nonce already used");

        uint256 paid = a.price;
        require(paid <= maxPrice, "price above max");
        require(a.bond - a.reserved >= paid, "bond cannot cover refund");

        usedNonce[msg.sender][nonce] = true;

        uint256 burned = (paid * BURN_BPS) / 10_000;
        uint256 toPayout = paid - burned;

        a.reserved += paid;
        a.open += 1;
        a.hires += 1;
        a.paid += paid;
        a.burned += burned;
        earnings[a.payout] += toPayout;
        totalPaid += paid;
        totalBurned += burned;

        hireId = ++hireCount;
        hires[hireId] = HireRecord({
            agentId: agentId,
            hirer: msg.sender,
            paid: paid,
            deadline: block.timestamp + COMMIT_WINDOW,
            committed: false,
            refunded: false,
            answerHash: bytes32(0)
        });

        _pull(msg.sender, paid);
        if (burned > 0) _push(BURN, burned);

        emit Hired(hireId, agentId, msg.sender, paid, burned, taskHash, nonce);
    }

    /// @notice Record the answer hash for a hire. Operator only, before the deadline.
    function commit(uint256 hireId, bytes32 answerHash) external {
        HireRecord storage h = hires[hireId];
        require(h.hirer != address(0), "unknown hire");
        require(answerHash != bytes32(0), "answer hash required");
        require(!h.committed, "already committed");
        require(!h.refunded, "already refunded");
        require(block.timestamp <= h.deadline, "commit window closed");

        Agent storage a = _agents[h.agentId];
        require(a.payout == msg.sender, "not the operator");

        h.committed = true;
        h.answerHash = answerHash;
        a.reserved -= h.paid;
        a.open -= 1;

        emit Committed(hireId, answerHash);
    }

    /// @notice Refund an uncommitted hire after its deadline. Anyone may call it, and the
    ///         full payment always goes to the hirer, taken from the operator's reserved bond.
    function claimRefund(uint256 hireId) external {
        HireRecord storage h = hires[hireId];
        require(h.hirer != address(0), "unknown hire");
        require(!h.committed, "answer was committed");
        require(!h.refunded, "already refunded");
        require(block.timestamp > h.deadline, "commit window still open");

        Agent storage a = _agents[h.agentId];
        uint256 amount = h.paid;

        h.refunded = true;
        a.reserved -= amount;
        a.open -= 1;
        a.bond -= amount;
        a.slashed += amount;
        totalRefunded += amount;

        _push(h.hirer, amount);

        emit Refunded(hireId, h.hirer, amount);
        emit BondSlashed(h.agentId, h.hirer, amount);
    }

    /// @notice Operators pull their accumulated 90% share. Held so a reverting payout cannot block hires.
    function withdrawEarnings() external {
        uint256 amount = earnings[msg.sender];
        require(amount > 0, "nothing to withdraw");
        earnings[msg.sender] = 0;
        _push(msg.sender, amount);

        emit EarningsWithdrawn(msg.sender, amount);
    }

    // ------------------------------------------------------------------- views

    function agentCount() external view returns (uint256) {
        return _ids.length;
    }

    function agentIdAt(uint256 index) external view returns (bytes32) {
        return _ids[index];
    }

    function agentInfo(bytes32 agentId)
        external
        view
        returns (
            address payout,
            uint256 price,
            uint256 bond,
            uint256 hires_,
            uint256 paid,
            uint256 burned,
            uint256 slashed,
            bool active
        )
    {
        Agent storage a = _agents[agentId];
        return (a.payout, a.price, a.bond, a.hires, a.paid, a.burned, a.slashed, a.active);
    }

    /// @notice Bond earmarked for open hires, and how many hires are still open.
    function agentReserve(bytes32 agentId) external view returns (uint256 reserved, uint256 open) {
        Agent storage a = _agents[agentId];
        return (a.reserved, a.open);
    }

    // ---------------------------------------------------------------- internal

    function _pull(address from, uint256 amount) private {
        require(IERC20V3(WIF).transferFrom(from, address(this), amount), "transferFrom failed");
    }

    function _push(address to, uint256 amount) private {
        require(IERC20V3(WIF).transfer(to, amount), "transfer failed");
    }
}
