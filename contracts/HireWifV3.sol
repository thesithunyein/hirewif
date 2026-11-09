// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20V3 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title HireWif V3 - a permissionless market for paid agent answers.
/// @notice Anyone can list an agent by locking a WIF bond of at least 10x its price.
///         The price is enforced by the contract, the 10% burn cannot be redirected,
///         and a hirer can reclaim the full payment from the operator's bond if the
///         operator never commits an answer within COMMIT_WINDOW blocks.
/// @dev No owner, no pause, no upgrade, no rescue. The only mutating paths are below.
contract HireWifV3 {
    address public constant WIF = 0x5173b8eA6923c2d40267890D45C46a3480954773;
    address public constant BURN = 0x000000000000000000000000000000000000dEaD;

    uint256 public constant BURN_BPS = 1000; // 10% of every hire is burned
    uint256 public constant BOND_MULTIPLE = 10; // bond must be at least 10x the listed price
    uint256 public constant COMMIT_WINDOW = 300; // blocks an operator has to commit an answer

    struct Agent {
        address payout;
        uint256 price;
        uint256 bond;
        uint256 hires;
        uint256 paid;
        uint256 burned;
        uint256 slashed;
        uint256 lastHireBlock;
        bool active;
    }

    struct HireRecord {
        bytes32 agentId;
        address hirer;
        uint256 paid;
        uint256 blockNumber;
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
    function register(bytes32 agentId, uint256 price, address payout, uint256 bond) external {
        require(agentId != bytes32(0), "agent id required");
        require(!_agents[agentId].active, "agent already registered");
        require(payout != address(0), "payout required");
        require(price > 0, "price required");
        require(bond >= price * BOND_MULTIPLE, "bond must be 10x price");

        _pull(msg.sender, bond);

        _agents[agentId] = Agent({
            payout: payout,
            price: price,
            bond: bond,
            hires: 0,
            paid: 0,
            burned: 0,
            slashed: 0,
            lastHireBlock: block.number,
            active: true
        });
        _ids.push(agentId);

        emit AgentRegistered(agentId, payout, price, bond);
    }

    /// @notice Change the listed price and top up or release the bond. Operator only.
    function updateAgent(bytes32 agentId, uint256 price, uint256 bond) external {
        Agent storage a = _agents[agentId];
        require(a.active, "unknown agent");
        require(a.payout == msg.sender, "not the operator");
        require(price > 0, "price required");
        require(bond >= price * BOND_MULTIPLE, "bond must be 10x price");

        if (bond > a.bond) {
            _pull(msg.sender, bond - a.bond);
        } else if (bond < a.bond) {
            _push(msg.sender, a.bond - bond);
        }

        a.price = price;
        a.bond = bond;

        emit AgentUpdated(agentId, price, bond);
    }

    /// @notice Stop taking new hires and recover the bond once every hire is settled.
    function closeAgent(bytes32 agentId) external {
        Agent storage a = _agents[agentId];
        require(a.active, "unknown agent");
        require(a.payout == msg.sender, "not the operator");
        require(block.number > a.lastHireBlock + COMMIT_WINDOW, "hire still open");

        a.active = false;
        uint256 bond = a.bond;
        a.bond = 0;
        if (bond > 0) _push(msg.sender, bond);

        emit AgentClosed(agentId, bond);
    }

    // ------------------------------------------------------------------- hires

    /// @notice Hire a listed agent at its listed price. The price is not a client choice.
    function hire(bytes32 agentId, bytes32 taskHash, uint256 nonce) external returns (uint256 hireId) {
        Agent storage a = _agents[agentId];
        require(a.active, "unknown agent");
        require(taskHash != bytes32(0), "task hash required");
        require(!usedNonce[msg.sender][nonce], "nonce already used");
        usedNonce[msg.sender][nonce] = true;

        uint256 paid = a.price;
        uint256 burned = (paid * BURN_BPS) / 10_000;
        uint256 toPayout = paid - burned;

        _pull(msg.sender, paid);
        if (burned > 0) require(IERC20V3(WIF).transfer(BURN, burned), "burn failed");
        earnings[a.payout] += toPayout;

        hireId = ++hireCount;
        hires[hireId] = HireRecord({
            agentId: agentId,
            hirer: msg.sender,
            paid: paid,
            blockNumber: block.number,
            committed: false,
            refunded: false,
            answerHash: bytes32(0)
        });

        a.hires += 1;
        a.paid += paid;
        a.burned += burned;
        a.lastHireBlock = block.number;
        totalPaid += paid;
        totalBurned += burned;

        emit Hired(hireId, agentId, msg.sender, paid, burned, taskHash, nonce);
    }

    /// @notice Record the answer hash for a hire. Operator only, inside the window.
    function commit(uint256 hireId, bytes32 answerHash) external {
        HireRecord storage h = hires[hireId];
        require(h.hirer != address(0), "unknown hire");
        require(!h.committed, "already committed");
        require(!h.refunded, "already refunded");
        require(block.number <= h.blockNumber + COMMIT_WINDOW, "commit window closed");

        Agent storage a = _agents[h.agentId];
        require(a.payout == msg.sender, "not the operator");

        h.committed = true;
        h.answerHash = answerHash;

        emit Committed(hireId, answerHash);
    }

    /// @notice Hirer reclaims the payment from the bond if no answer was committed.
    function claimRefund(uint256 hireId) external {
        HireRecord storage h = hires[hireId];
        require(h.hirer == msg.sender, "not the hirer");
        require(!h.committed, "answer was committed");
        require(!h.refunded, "already refunded");
        require(block.number > h.blockNumber + COMMIT_WINDOW, "commit window still open");

        Agent storage a = _agents[h.agentId];
        uint256 amount = h.paid < a.bond ? h.paid : a.bond;
        h.refunded = true;
        a.bond -= amount;
        a.slashed += amount;

        if (amount > 0) _push(msg.sender, amount);

        emit Refunded(hireId, msg.sender, amount);
        emit BondSlashed(h.agentId, msg.sender, amount);
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

    // ---------------------------------------------------------------- internal

    function _pull(address from, uint256 amount) private {
        require(IERC20V3(WIF).transferFrom(from, address(this), amount), "transferFrom failed");
    }

    function _push(address to, uint256 amount) private {
        require(IERC20V3(WIF).transfer(to, amount), "transfer failed");
    }
}
