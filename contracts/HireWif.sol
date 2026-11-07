// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract HireWif {
    address public constant WIF = 0x5173b8eA6923c2d40267890D45C46a3480954773;
    address public constant BURN = 0x000000000000000000000000000000000000dEaD;
    address public operator;

    event Hired(address indexed user, string agent, uint256 paid, uint256 burned);

    constructor(address _operator) {
        operator = _operator;
    }

    function hire(string calldata agent, uint256 amount) external {
        uint256 burnAmount = amount / 10;
        uint256 operatorAmount = amount - burnAmount;

        require(IERC20(WIF).transferFrom(msg.sender, address(this), amount), "transfer failed");
        require(IERC20(WIF).transfer(BURN, burnAmount), "burn failed");
        require(IERC20(WIF).transfer(operator, operatorAmount), "operator failed");

        emit Hired(msg.sender, agent, amount, burnAmount);
    }
}
