// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract HireWif {
    address public constant WIF = 0x5173b8eA6923c2d40267890D45C46a3480954773;
    address public constant BURN = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BURN_BPS = 1000;

    address public immutable operator;

    struct AgentInfo {
        address payee;
        uint256 price;
    }

    mapping(string => AgentInfo) public agentInfo;

    event Hired(address indexed user, string agent, address indexed payee, uint256 paid, uint256 burned);
    event AgentListed(string agent, address indexed payee, uint256 price);

    constructor(address _operator) {
        require(_operator != address(0), "operator 0");
        operator = _operator;
        _list("monitor", _operator, 2_000 ether);
        _list("ledger", _operator, 3_000 ether);
        _list("data", _operator, 5_000 ether);
        _list("research", _operator, 8_000 ether);
    }

    function listAgent(string calldata agent, address payee, uint256 price) external {
        uint256 len = bytes(agent).length;
        require(len > 0 && len <= 48, "bad agent id");
        require(payee == msg.sender, "payee must be sender");
        require(price > 0, "price 0");
        address current = agentInfo[agent].payee;
        require(current == address(0) || current == msg.sender, "agent taken");
        _list(agent, payee, price);
    }

    function hire(string calldata agent, uint256 amount) external {
        AgentInfo memory info = agentInfo[agent];
        address payee = info.payee == address(0) ? operator : info.payee;
        if (info.price != 0) require(amount == info.price, "wrong amount");
        require(amount > 0, "amount 0");

        uint256 burnAmount = (amount * BURN_BPS) / 10_000;
        uint256 payAmount = amount - burnAmount;

        require(IERC20(WIF).transferFrom(msg.sender, address(this), amount), "transfer failed");
        require(IERC20(WIF).transfer(BURN, burnAmount), "burn failed");
        require(IERC20(WIF).transfer(payee, payAmount), "pay failed");

        emit Hired(msg.sender, agent, payee, amount, burnAmount);
    }

    function _list(string memory agent, address payee, uint256 price) internal {
        agentInfo[agent] = AgentInfo(payee, price);
        emit AgentListed(agent, payee, price);
    }
}
