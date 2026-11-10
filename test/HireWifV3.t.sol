// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HireWifV3} from "../contracts/HireWifV3.sol";

interface Vm {
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function etch(address target, bytes calldata code) external;
    function roll(uint256 newHeight) external;
    function warp(uint256 newTimestamp) external;
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

    function assertEq(bytes32 a, bytes32 b, string memory msg_) internal pure {
        require(a == b, msg_);
    }

    function assertTrue(bool value, string memory msg_) internal pure {
        require(value, msg_);
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

contract HireWifV3Test is BaseTest {
    HireWifV3 hw;
    MockWIF wif;

    address constant OPERATOR = address(0xA11CE);
    address constant USER = address(0xB0B);
    address constant OTHER = address(0xCAFE);

    bytes32 constant MONITOR = keccak256("monitor");
    bytes32 constant TASK = keccak256("what is the wif price");

    uint256 constant PRICE = 250e18;
    uint256 constant BOND = 2500e18; // exactly 10x

    function setUp() public {
        hw = new HireWifV3();

        MockWIF impl = new MockWIF();
        vm.etch(hw.WIF(), address(impl).code);
        wif = MockWIF(hw.WIF());

        wif.mint(OPERATOR, 1_000_000e18);
        wif.mint(USER, 1_000_000e18);
        wif.mint(OTHER, 1_000_000e18);

        vm.prank(OPERATOR);
        wif.approve(address(hw), type(uint256).max);
        vm.prank(USER);
        wif.approve(address(hw), type(uint256).max);
        vm.prank(OTHER);
        wif.approve(address(hw), type(uint256).max);

        vm.prank(OPERATOR);
        hw.register(MONITOR, PRICE, OPERATOR, BOND);
    }

    // ------------------------------------------------------------ registration

    function testRegisterLocksBondAndListsAgent() public view {
        assertEq(hw.agentCount(), 1, "one agent listed");
        assertEq(hw.agentIdAt(0), MONITOR, "agent id listed");
        assertEq(wif.balanceOf(address(hw)), BOND, "bond held by the contract");

        (
            address payout,
            uint256 price,
            uint256 bond,
            uint256 hires,
            uint256 paid,
            uint256 burned,
            uint256 slashed,
            bool active
        ) = hw.agentInfo(MONITOR);
        assertEq(payout, OPERATOR, "payout");
        assertEq(price, PRICE, "price");
        assertEq(bond, BOND, "bond");
        assertEq(hires, 0, "no hires yet");
        assertEq(paid, 0, "nothing paid");
        assertEq(burned, 0, "nothing burned");
        assertEq(slashed, 0, "nothing slashed");
        assertTrue(active, "agent active");
    }

    function testRegisterRejectsThinBond() public {
        vm.prank(OTHER);
        vm.expectRevert();
        hw.register(keccak256("thin"), PRICE, OTHER, PRICE * 9);
    }

    function testRegisterRejectsDuplicate() public {
        vm.prank(OTHER);
        vm.expectRevert();
        hw.register(MONITOR, PRICE, OTHER, BOND);
    }

    function testOnlyOperatorCanUpdateTerms() public {
        vm.prank(USER);
        vm.expectRevert();
        hw.updateAgent(MONITOR, PRICE, BOND);

        vm.prank(OPERATOR);
        hw.updateAgent(MONITOR, 500e18, 5000e18);
        (, uint256 price, uint256 bond,,,,,) = hw.agentInfo(MONITOR);
        assertEq(price, 500e18, "price updated");
        assertEq(bond, 5000e18, "bond topped up");
    }

    // ------------------------------------------------------------------- hire

    function testHireChargesListedPriceAndSplits() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);

        uint256 burn = (PRICE * 1000) / 10_000;

        assertEq(hireId, 1, "hire id starts at one");
        assertEq(wif.balanceOf(USER), 1_000_000e18 - PRICE, "hirer paid exactly the listed price");
        assertEq(wif.balanceOf(hw.BURN()), burn, "10% burned");
        assertEq(hw.earnings(OPERATOR), PRICE - burn, "90% accrued to the operator");
        assertEq(hw.totalPaid(), PRICE, "total paid tracked");
        assertEq(hw.totalBurned(), burn, "total burned tracked");
        assertEq(wif.balanceOf(address(hw)), BOND + (PRICE - burn), "contract holds bond plus unsettled earnings");
    }

    function testHireRejectsUnknownAgent() public {
        vm.prank(USER);
        vm.expectRevert();
        hw.hire(keccak256("nobody"), TASK, 1, PRICE);
    }

    function testHireRejectsNonceReplay() public {
        vm.prank(USER);
        hw.hire(MONITOR, TASK, 7, PRICE);

        vm.prank(USER);
        vm.expectRevert();
        hw.hire(MONITOR, TASK, 7, PRICE);
    }

    function testHireRejectsEmptyTaskHash() public {
        vm.prank(USER);
        vm.expectRevert();
        hw.hire(MONITOR, bytes32(0), 1, PRICE);
    }

    function testWithdrawEarnings() public {
        vm.prank(USER);
        hw.hire(MONITOR, TASK, 1, PRICE);

        uint256 before = wif.balanceOf(OPERATOR);
        vm.prank(OPERATOR);
        hw.withdrawEarnings();

        assertEq(wif.balanceOf(OPERATOR), before + (PRICE - (PRICE * 1000) / 10_000), "operator withdraws the 90%");
        assertEq(hw.earnings(OPERATOR), 0, "earnings cleared");

        vm.prank(OPERATOR);
        vm.expectRevert();
        hw.withdrawEarnings();
    }

    // --------------------------------------------------------- commit / refund

    function testOperatorCommitsAnswer() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);

        bytes32 answerHash = keccak256("price 0.001294");
        vm.prank(OPERATOR);
        hw.commit(hireId, answerHash);

        (,,,, bool committed, bool refunded, bytes32 stored) = hw.hires(hireId);
        assertTrue(committed, "committed");
        assertTrue(!refunded, "not refunded");
        assertEq(stored, answerHash, "answer hash stored");
    }

    function testOnlyOperatorCanCommit() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);

        vm.prank(OTHER);
        vm.expectRevert();
        hw.commit(hireId, keccak256("forged"));
    }

    function testCommitRejectedAfterWindow() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);

        vm.warp(block.timestamp + hw.COMMIT_WINDOW() + 1);
        vm.prank(OPERATOR);
        vm.expectRevert();
        hw.commit(hireId, keccak256("late"));
    }

    function testRefundSlashesBondWhenNoAnswerCommitted() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);
        uint256 userAfterHire = wif.balanceOf(USER);

        vm.warp(block.timestamp + hw.COMMIT_WINDOW() + 1);
        vm.prank(USER);
        hw.claimRefund(hireId);

        assertEq(wif.balanceOf(USER), userAfterHire + PRICE, "hirer made whole from the bond");
        (, , uint256 bond, , , , uint256 slashed, ) = hw.agentInfo(MONITOR);
        assertEq(bond, BOND - PRICE, "bond reduced by the refund");
        assertEq(slashed, PRICE, "slash recorded");
    }

    function testRefundRejectedBeforeWindow() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);

        vm.prank(USER);
        vm.expectRevert();
        hw.claimRefund(hireId);
    }

    function testRefundRejectedWhenAnswerCommitted() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);

        vm.prank(OPERATOR);
        hw.commit(hireId, keccak256("answer"));

        vm.warp(block.timestamp + hw.COMMIT_WINDOW() + 1);
        vm.prank(USER);
        vm.expectRevert();
        hw.claimRefund(hireId);
    }

    function testNoDoubleRefund() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);

        vm.warp(block.timestamp + hw.COMMIT_WINDOW() + 1);
        vm.prank(USER);
        hw.claimRefund(hireId);

        vm.prank(USER);
        vm.expectRevert();
        hw.claimRefund(hireId);
    }

    function testAnyoneCanTriggerRefundButHirerIsPaid() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);
        uint256 userAfterHire = wif.balanceOf(USER);
        uint256 otherBefore = wif.balanceOf(OTHER);

        vm.warp(block.timestamp + hw.COMMIT_WINDOW() + 1);
        vm.prank(OTHER);
        hw.claimRefund(hireId);

        assertEq(wif.balanceOf(USER), userAfterHire + PRICE, "refund goes to the hirer");
        assertEq(wif.balanceOf(OTHER), otherBefore, "caller receives nothing");
        assertEq(hw.totalRefunded(), PRICE, "refund total tracked");
    }

    function testRefundRejectedForUnknownHire() public {
        vm.prank(USER);
        vm.expectRevert();
        hw.claimRefund(42);
    }

    function testCommitRejectsEmptyAnswerHash() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);

        vm.prank(OPERATOR);
        vm.expectRevert();
        hw.commit(hireId, bytes32(0));
    }

    // ------------------------------------------------------------ reserve

    function testHireReservesBondAndCommitReleasesIt() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);

        (uint256 reserved, uint256 open) = hw.agentReserve(MONITOR);
        assertEq(reserved, PRICE, "full price reserved");
        assertEq(open, 1, "one open hire");

        vm.prank(OPERATOR);
        hw.commit(hireId, keccak256("answer"));

        (reserved, open) = hw.agentReserve(MONITOR);
        assertEq(reserved, 0, "reserve released on commit");
        assertEq(open, 0, "no open hires");
    }

    function testHireRejectedWhenBondCannotCoverRefund() public {
        // A 10x bond covers exactly ten open hires.
        for (uint256 i = 1; i <= 10; i++) {
            vm.prank(USER);
            hw.hire(MONITOR, TASK, i, PRICE);
        }
        vm.prank(USER);
        vm.expectRevert();
        hw.hire(MONITOR, TASK, 11, PRICE);
    }

    function testEveryOverdueHireIsFullyRefundable() public {
        for (uint256 i = 1; i <= 10; i++) {
            vm.prank(USER);
            hw.hire(MONITOR, TASK, i, PRICE);
        }
        uint256 userAfterHires = wif.balanceOf(USER);

        vm.warp(block.timestamp + hw.COMMIT_WINDOW() + 1);
        for (uint256 i = 1; i <= 10; i++) {
            hw.claimRefund(i);
        }

        assertEq(wif.balanceOf(USER), userAfterHires + PRICE * 10, "all ten paid back in full");
        (, , uint256 bond, , , , uint256 slashed, ) = hw.agentInfo(MONITOR);
        assertEq(bond, 0, "bond fully used");
        assertEq(slashed, BOND, "whole bond slashed");
    }

    // ------------------------------------------------- operator escape attempts

    function testOperatorCannotCloseToDodgeRefund() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);
        uint256 userAfterHire = wif.balanceOf(USER);

        vm.warp(block.timestamp + hw.COMMIT_WINDOW() + 1);

        // Deadline passed with no commit: the operator tries to pull the bond first.
        vm.prank(OPERATOR);
        vm.expectRevert();
        hw.closeAgent(MONITOR);

        vm.prank(USER);
        hw.claimRefund(hireId);
        assertEq(wif.balanceOf(USER), userAfterHire + PRICE, "hirer still made whole");
    }

    function testOperatorCanCloseAfterSettlingOverdueHire() public {
        vm.prank(USER);
        uint256 hireId = hw.hire(MONITOR, TASK, 1, PRICE);
        uint256 userAfterHire = wif.balanceOf(USER);

        vm.warp(block.timestamp + hw.COMMIT_WINDOW() + 1);

        // The operator settles the overdue hire itself, which pays the hirer, then closes.
        vm.prank(OPERATOR);
        hw.claimRefund(hireId);
        assertEq(wif.balanceOf(USER), userAfterHire + PRICE, "hirer paid by operator-triggered refund");

        uint256 before = wif.balanceOf(OPERATOR);
        vm.prank(OPERATOR);
        hw.closeAgent(MONITOR);
        assertEq(wif.balanceOf(OPERATOR), before + BOND - PRICE, "operator gets the rest of the bond");
    }

    function testOperatorCannotDrainBondWhileHireOpen() public {
        vm.prank(USER);
        hw.hire(MONITOR, TASK, 1, PRICE);

        // Dropping the price to 1 wei would otherwise allow a 10 wei bond.
        vm.prank(OPERATOR);
        vm.expectRevert();
        hw.updateAgent(MONITOR, 1, 10);

        // Releasing bond down to exactly the reserve is allowed.
        vm.prank(OPERATOR);
        hw.updateAgent(MONITOR, PRICE / 10, PRICE);
        (, , uint256 bond, , , , , ) = hw.agentInfo(MONITOR);
        assertEq(bond, PRICE, "bond kept at the reserve");
    }

    function testPriceRaiseCannotOvercharge() public {
        vm.prank(OPERATOR);
        hw.updateAgent(MONITOR, PRICE * 2, BOND * 2);

        vm.prank(USER);
        vm.expectRevert();
        hw.hire(MONITOR, TASK, 1, PRICE);
    }

    function testClosedAgentIdCannotBeReused() public {
        vm.prank(OPERATOR);
        hw.closeAgent(MONITOR);

        vm.prank(OTHER);
        vm.expectRevert();
        hw.register(MONITOR, PRICE, OTHER, BOND);
        assertEq(hw.agentCount(), 1, "no duplicate listing");
    }

    // ------------------------------------------------------------------ close

    function testCloseBlockedWhileHireOpen() public {
        vm.prank(USER);
        hw.hire(MONITOR, TASK, 1, PRICE);

        vm.prank(OPERATOR);
        vm.expectRevert();
        hw.closeAgent(MONITOR);
    }

    function testCloseReturnsBondAndStopsHires() public {
        vm.prank(USER);
        hw.hire(MONITOR, TASK, 1, PRICE);
        vm.prank(OPERATOR);
        hw.commit(1, keccak256("answer"));

        uint256 before = wif.balanceOf(OPERATOR);
        vm.prank(OPERATOR);
        hw.closeAgent(MONITOR);
        assertEq(wif.balanceOf(OPERATOR), before + BOND, "bond returned");

        vm.prank(USER);
        vm.expectRevert();
        hw.hire(MONITOR, TASK, 2, PRICE);
    }

    function testClosedAgentStaysOffTheList() public {
        vm.prank(OPERATOR);
        hw.closeAgent(MONITOR);

        (,,,,,,, bool active) = hw.agentInfo(MONITOR);
        assertTrue(!active, "inactive after close");
    }

    // ------------------------------------------------------------------ fuzz

    /// The contract must always hold at least every bond plus unwithdrawn earnings.
    function testFuzzSolvency(uint8 hiresN, uint8 commitMask, uint16 skip) public {
        uint256 n = uint256(hiresN) % 10 + 1;
        for (uint256 i = 1; i <= n; i++) {
            vm.prank(USER);
            hw.hire(MONITOR, TASK, i, PRICE);
            if ((uint256(commitMask) >> (i % 8)) & 1 == 1) {
                vm.prank(OPERATOR);
                hw.commit(i, keccak256(abi.encode(i)));
            }
        }

        vm.warp(block.timestamp + hw.COMMIT_WINDOW() + 1 + skip);
        for (uint256 i = 1; i <= n; i++) {
            (,,,, bool committed,,) = hw.hires(i);
            if (!committed) hw.claimRefund(i);
        }

        (, , uint256 bond, , , , , ) = hw.agentInfo(MONITOR);
        (uint256 reserved, uint256 open) = hw.agentReserve(MONITOR);
        assertEq(reserved, 0, "nothing reserved once settled");
        assertEq(open, 0, "nothing open once settled");
        assertTrue(wif.balanceOf(address(hw)) >= bond + hw.earnings(OPERATOR), "contract solvent");

        vm.prank(OPERATOR);
        hw.closeAgent(MONITOR);
    }
}
