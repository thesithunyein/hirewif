// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HireWif} from "../contracts/HireWif.sol";

interface Vm {
    function prank(address sender) external;
    function etch(address target, bytes calldata code) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData, address emitter) external;
    function expectRevert() external;
}

abstract contract BaseTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 a, uint256 b, string memory msg_) internal pure {
        require(a == b, msg_);
    }

    function assertEq(address a, address b, string memory msg_) internal pure {
        require(a == b, msg_);
    }
}

contract MockWIF {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "balance");
        require(allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract HireWifTest is BaseTest {
    event Hired(address indexed user, string agent, uint256 paid, uint256 burned);

    HireWif hw;
    MockWIF wif;

    address constant OP = address(0xA11CE);
    address constant USER = address(0xB0B);

    function setUp() public {
        hw = new HireWif(OP);

        MockWIF impl = new MockWIF();
        vm.etch(hw.WIF(), address(impl).code);
        wif = MockWIF(hw.WIF());

        wif.mint(USER, 1_000_000e18);
        vm.prank(USER);
        wif.approve(address(hw), type(uint256).max);
    }

    function testConstructorSetsOperator() public view {
        assertEq(hw.operator(), OP, "operator should be the constructor argument");
    }

    function testConstantsMatchDeployment() public view {
        assertEq(hw.WIF(), 0x5173b8eA6923c2d40267890D45C46a3480954773, "WIF address");
        assertEq(hw.BURN(), 0x000000000000000000000000000000000000dEaD, "burn address");
    }

    function testSplitIs90ToOperator10Burned() public {
        vm.prank(USER);
        hw.hire("research", 8_000e18);

        assertEq(wif.balanceOf(hw.BURN()), 800e18, "burn should be 10%");
        assertEq(wif.balanceOf(OP), 7_200e18, "operator should get 90%");
        assertEq(wif.balanceOf(USER), 992_000e18, "user should pay exactly the amount");
        assertEq(wif.balanceOf(address(hw)), 0, "contract should keep nothing");
    }

    function testEmitsHired() public {
        vm.expectEmit(true, false, false, true, address(hw));
        emit Hired(USER, "research", 8_000e18, 800e18);
        vm.prank(USER);
        hw.hire("research", 8_000e18);
    }

    function testBurnRoundsDown() public {
        vm.prank(USER);
        hw.hire("monitor", 19);

        assertEq(wif.balanceOf(hw.BURN()), 1, "burn is the floor of one tenth");
        assertEq(wif.balanceOf(OP), 18, "operator gets the remainder");
    }

    function testAnyAgentIdIsAccepted() public {
        vm.prank(USER);
        hw.hire("not-a-registered-id", 1_000e18);

        assertEq(wif.balanceOf(OP), 900e18, "operator is paid for every id");
        assertEq(wif.balanceOf(hw.BURN()), 100e18, "burn is still 10%");
    }

    function testNoRegistrySurface() public view {
        (bool ok,) = address(hw).staticcall(abi.encodeWithSignature("agentInfo(string)", "monitor"));
        require(!ok, "deployed contract has no agentInfo");
    }

    function testRevertsWithoutAllowance() public {
        vm.prank(USER);
        wif.approve(address(hw), 0);

        vm.expectRevert();
        vm.prank(USER);
        hw.hire("monitor", 1_000e18);

        assertEq(wif.balanceOf(hw.BURN()), 0, "no burn on a failed hire");
        assertEq(wif.balanceOf(OP), 0, "no operator payout on a failed hire");
        assertEq(wif.balanceOf(USER), 1_000_000e18, "user keeps the balance");
    }
}
