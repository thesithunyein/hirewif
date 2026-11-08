// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HireWif} from "../contracts/HireWif.sol";

interface Vm {
    function prank(address sender) external;
    function etch(address target, bytes calldata code) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData, address emitter) external;
}

abstract contract BaseTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 a, uint256 b, string memory msg_) internal pure {
        require(a == b, msg_);
    }

    function assertEq(address a, address b, string memory msg_) internal pure {
        require(a == b, msg_);
    }

    function assertEq(string memory a, string memory b, string memory msg_) internal pure {
        require(keccak256(bytes(a)) == keccak256(bytes(b)), msg_);
    }

    function fail(string memory msg_) internal pure {
        require(false, msg_);
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
    event Hired(address indexed user, string agent, address indexed payee, uint256 paid, uint256 burned);
    event AgentListed(string agent, address indexed payee, uint256 price);

    HireWif hw;
    MockWIF wif;

    address constant OP = address(0xA11CE);
    address constant USER = address(0xB0B);
    address constant OTHER = address(0xCAFE);

    function setUp() public {
        hw = new HireWif(OP);

        MockWIF impl = new MockWIF();
        vm.etch(hw.WIF(), address(impl).code);
        wif = MockWIF(hw.WIF());

        wif.mint(USER, 1_000_000e18);
        vm.prank(USER);
        wif.approve(address(hw), type(uint256).max);
    }

    function testSplitIs90_10() public {
        vm.prank(USER);
        hw.hire("research", 8_000e18);

        assertEq(wif.balanceOf(hw.BURN()), 800e18, "burn should be 10%");
        assertEq(wif.balanceOf(OP), 7_200e18, "operator should get 90%");
        assertEq(wif.balanceOf(address(hw)), 0, "contract should keep nothing");
    }

    function testEmitsHired() public {
        vm.expectEmit(true, true, false, true, address(hw));
        emit Hired(USER, "research", OP, 8_000e18, 800e18);
        vm.prank(USER);
        hw.hire("research", 8_000e18);
    }

    function testListedAgentEarnsTheSplit() public {
        vm.prank(OTHER);
        vm.expectEmit(true, true, false, true, address(hw));
        emit AgentListed("whale-watch", OTHER, 1_000e18);
        hw.listAgent("whale-watch", OTHER, 1_000e18);

        (address payee, uint256 price) = hw.agentInfo("whale-watch");
        assertEq(payee, OTHER, "payee should be recorded");
        assertEq(price, 1_000e18, "price should be recorded");

        vm.prank(USER);
        hw.hire("whale-watch", 1_000e18);

        assertEq(wif.balanceOf(OTHER), 900e18, "supplier should get 90%");
        assertEq(wif.balanceOf(hw.BURN()), 100e18, "burn should be 10%");
    }

    function testRejectsWrongAmountForListedAgent() public {
        vm.prank(USER);
        try hw.hire("research", 9_000e18) {
            fail("paying the wrong price should revert");
        } catch {}
    }

    function testOperatorCanReprice() public {
        vm.prank(OP);
        hw.listAgent("research", OP, 12_000e18);

        vm.prank(USER);
        hw.hire("research", 12_000e18);

        assertEq(wif.balanceOf(OP), 10_800e18, "operator gets 90% of the new price");
        assertEq(wif.balanceOf(hw.BURN()), 1_200e18, "burn is 10%");
    }

    function testUnlistedAgentFallsBackToOperator() public {
        vm.prank(USER);
        hw.hire("nobody-home", 1_000e18);
        assertEq(wif.balanceOf(OP), 900e18, "operator is the fallback payee");
    }

    function testBuiltInIdsCannotBeSquatted() public {
        vm.prank(OTHER);
        try hw.listAgent("research", OTHER, 1_000e18) {
            fail("squatting a built-in id should revert");
        } catch {}
    }

    function testPayeeMustBeSender() public {
        vm.prank(OTHER);
        try hw.listAgent("sneaky", USER, 1_000e18) {
            fail("listing someone else as payee should revert");
        } catch {}
    }

    function testRejectsZeroAmount() public {
        vm.prank(USER);
        try hw.hire("nobody-home", 0) {
            fail("zero amount should revert");
        } catch {}
    }

    function testRejectsEmptyAgentId() public {
        vm.prank(OTHER);
        try hw.listAgent("", OTHER, 1_000e18) {
            fail("empty agent id should revert");
        } catch {}
    }

    function testRejectsZeroPrice() public {
        vm.prank(OTHER);
        try hw.listAgent("free-work", OTHER, 0) {
            fail("zero price should revert");
        } catch {}
    }

    function testRejectsZeroOperator() public {
        try new HireWif(address(0)) {
            fail("zero operator should revert");
        } catch {}
    }
}
