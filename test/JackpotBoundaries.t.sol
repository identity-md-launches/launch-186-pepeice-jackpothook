// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {JackpotFixture, JackpotHook} from "./fixtures/JackpotFixture.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/IERC6093.sol";

/// @notice Checks the complete outcome table and atomic rollback at the settlement boundary.
contract JackpotBoundariesTest is JackpotFixture {
    using StateLibrary for IPoolManager;

    function test_everyRollInBothFeeCurrenciesMatchesThePayoutTable() public {
        _seed();
        _fill(1000);
        for (uint256 roll = 1; roll <= 100; ++roll) {
            _checkRoll(roll, true);
            _checkRoll(roll, false);
        }
    }

    function _checkRoll(uint256 roll, bool ethTicket) private {
        uint256 id = hook.nextTicketId(poolId);
        _swap(ethTicket, ethTicket ? -int256(0.001 ether) : -int256(100 ether), abi.encode(PLAYER));
        _forceRoll(id, roll);
        (uint256 ethPot, uint256 icePot) = hook.pots(poolId);
        uint256 expectedEth;
        uint256 expectedIce;
        if (roll == 77) {
            expectedEth = ethPot * 90 / 100;
            expectedIce = icePot * 90 / 100;
        } else if (roll == 20 || roll == 40 || roll == 60 || roll == 80 || roll == 100) {
            uint256 reward = hook.ticket(poolId, id).fee * 20;
            uint256 cap = (ethTicket ? ethPot : icePot) / 10;
            if (ethTicket) expectedEth = reward < cap ? reward : cap;
            else expectedIce = reward < cap ? reward : cap;
        }

        uint256 ethBefore = PLAYER.balance;
        uint256 iceBefore = ice.balanceOf(PLAYER);
        vm.expectEmit(true, true, true, true, address(hook));
        emit Drawn(poolId, id, PLAYER, roll, expectedEth, expectedIce);
        hook.draw(poolId, id);
        assertEq(PLAYER.balance - ethBefore, expectedEth);
        assertEq(ice.balanceOf(PLAYER) - iceBefore, expectedIce);
        (uint256 ethAfter, uint256 iceAfter) = hook.pots(poolId);
        assertEq(ethAfter, ethPot - expectedEth);
        assertEq(iceAfter, icePot - expectedIce);
        assertTrue(hook.ticket(poolId, id).drawn);
        vm.expectRevert(JackpotHook.AlreadyDrawn.selector);
        hook.draw(poolId, id);
        _assertBacking();
    }

    function test_unpaidSwapRollsBackAmmFeeAndTicket() public {
        _seed();
        (uint256 ethBefore, uint256 iceBefore) = hook.pots(poolId);
        uint256 nextId = hook.nextTicketId(poolId);
        (uint160 priceBefore,,,) = IPoolManager(address(manager)).getSlot0(poolId);
        // The AMM/hook execute before the router attempts to collect this missing input.
        uint256 traderBalance = ice.balanceOf(TRADER);
        vm.prank(TRADER);
        assertTrue(ice.transfer(address(this), traderBalance));
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, TRADER, 0, 100 ether));
        _swap(false, -int256(100 ether), abi.encode(PLAYER));
        (uint256 ethAfter, uint256 iceAfter) = hook.pots(poolId);
        (uint160 priceAfter,,,) = IPoolManager(address(manager)).getSlot0(poolId);
        assertEq(ethAfter, ethBefore);
        assertEq(iceAfter, iceBefore);
        assertEq(priceAfter, priceBefore);
        assertEq(hook.nextTicketId(poolId), nextId);
        vm.expectRevert(JackpotHook.UnknownTicket.selector);
        hook.ticket(poolId, nextId);
        _assertBacking();
    }

    function test_unfundedTankPurchaseRollsBackExistingPot() public {
        _fill(1);
        uint256 traderBalance = ice.balanceOf(TRADER);
        vm.prank(TRADER);
        assertTrue(ice.transfer(address(this), traderBalance));
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, TRADER, 0, 10 ether));
        _fill(1);
        (uint256 ethPot, uint256 icePot) = hook.pots(poolId);
        assertEq(ethPot, 0);
        assertEq(icePot, 10 ether);
        assertEq(hook.nextTicketId(poolId), 0);
        _assertBacking();
    }
}
