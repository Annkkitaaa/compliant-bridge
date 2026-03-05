// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CompliancePool} from "../src/CompliancePool.sol";
import {MockERC20} from "../src/MockERC20.sol";

// ── Lightweight mock gateway (no external dependencies) ─────────────────────
contract MockGateway {
    mapping(address => uint8)   public tiers;
    mapping(address => bool)    public revoked;
    mapping(address => uint256) public expiry;

    function setTier(address u, uint8 t)    external { tiers[u]  = t; }
    function revoke(address u)              external { revoked[u] = true; }
    function setExpiry(address u, uint256 t) external { expiry[u] = t; }

    function isCompliantWithTier(address u, uint8 r) external view returns (bool) {
        return !revoked[u] && block.timestamp <= expiry[u] && tiers[u] >= r;
    }

    function getComplianceTier(address u) external view returns (uint8) {
        if (revoked[u] || block.timestamp > expiry[u]) return 0;
        return tiers[u];
    }
}

// ── Test suite ────────────────────────────────────────────────────────────────
contract CompliancePoolTest is Test {
    MockGateway   gateway;
    MockERC20     iusd;
    MockERC20     tTreas;
    CompliancePool pool1; // tier 1
    CompliancePool pool2; // tier 2
    CompliancePool pool3; // tier 3

    address tier3User  = address(0x1);
    address tier2User  = address(0x2);
    address tier1User  = address(0x3);
    address noTierUser = address(0x4);

    uint256 constant INIT_BALANCE = 1_000_000e6; // 1M IUSD (6 dec)
    uint256 constant INIT_TREAS   = 1_000_000e18;
    uint256 constant LIQ_A        = 100_000e6;
    uint256 constant LIQ_B        = 100_000e18;
    uint256 constant FAR_FUTURE   = 9_999_999_999;

    function setUp() public {
        // Deploy tokens
        iusd   = new MockERC20("Institutional USD", "IUSD",  6);
        tTreas = new MockERC20("Tokenized Treasury", "tTREAS", 18);

        // Deploy gateway and set user tiers
        gateway = new MockGateway();
        gateway.setTier(tier3User, 3);  gateway.setExpiry(tier3User, FAR_FUTURE);
        gateway.setTier(tier2User, 2);  gateway.setExpiry(tier2User, FAR_FUTURE);
        gateway.setTier(tier1User, 1);  gateway.setExpiry(tier1User, FAR_FUTURE);
        // noTierUser has tier=0 (default)

        // Deploy pools
        pool1 = new CompliancePool(address(gateway), address(iusd), address(tTreas), 1, "Tier1");
        pool2 = new CompliancePool(address(gateway), address(iusd), address(tTreas), 2, "Tier2");
        pool3 = new CompliancePool(address(gateway), address(iusd), address(tTreas), 3, "Tier3");

        // Fund users
        address[4] memory users = [tier3User, tier2User, tier1User, noTierUser];
        for (uint256 i = 0; i < 4; i++) {
            iusd.mint(users[i], INIT_BALANCE);
            tTreas.mint(users[i], INIT_TREAS);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _approveBoth(address user, address pool) internal {
        vm.startPrank(user);
        iusd.approve(pool, type(uint256).max);
        tTreas.approve(pool, type(uint256).max);
        vm.stopPrank();
    }

    function _addLiq(address user, CompliancePool pool, uint256 a, uint256 b) internal {
        _approveBoth(user, address(pool));
        vm.prank(user);
        pool.addLiquidity(a, b, 0, 0);
    }

    // ── 1. Deployment / config ────────────────────────────────────────────────

    function test_deploymentConfig() public view {
        assertEq(pool1.gateway(),      address(gateway));
        assertEq(pool1.tokenA(),       address(iusd));
        assertEq(pool1.tokenB(),       address(tTreas));
        assertEq(pool1.requiredTier(), 1);
        assertEq(pool2.requiredTier(), 2);
        assertEq(pool3.requiredTier(), 3);
    }

    // ── 2. canInteract view ───────────────────────────────────────────────────

    function test_canInteract_tier1Pool() public view {
        assertTrue(pool1.canInteract(tier3User));
        assertTrue(pool1.canInteract(tier2User));
        assertTrue(pool1.canInteract(tier1User));
        assertFalse(pool1.canInteract(noTierUser));
    }

    function test_canInteract_tier2Pool() public view {
        assertTrue(pool2.canInteract(tier3User));
        assertTrue(pool2.canInteract(tier2User));
        assertFalse(pool2.canInteract(tier1User));
        assertFalse(pool2.canInteract(noTierUser));
    }

    function test_canInteract_tier3Pool() public view {
        assertTrue(pool3.canInteract(tier3User));
        assertFalse(pool3.canInteract(tier2User));
        assertFalse(pool3.canInteract(tier1User));
        assertFalse(pool3.canInteract(noTierUser));
    }

    // ── 3. addLiquidity — happy path ──────────────────────────────────────────

    function test_addLiquidity_firstDeposit() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        (uint256 rA, uint256 rB) = pool1.getReserves();
        assertEq(rA, LIQ_A);
        assertEq(rB, LIQ_B);
        // LP shares = sqrt(LIQ_A * LIQ_B) - MINIMUM_LIQUIDITY
        uint256 expected = _sqrt(LIQ_A * LIQ_B) - pool1.MINIMUM_LIQUIDITY();
        assertEq(pool1.getLPBalance(tier1User), expected);
        // MINIMUM_LIQUIDITY locked in address(1)
        assertEq(pool1.getLPBalance(address(1)), pool1.MINIMUM_LIQUIDITY());
    }

    function test_addLiquidity_secondDeposit_maintainsRatio() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        uint256 supplyBefore = pool1.totalSupply();
        uint256 rABefore = LIQ_A;

        _addLiq(tier2User, pool1, LIQ_A / 2, LIQ_B / 2);

        (uint256 rA, uint256 rB) = pool1.getReserves();
        assertEq(rA, LIQ_A + LIQ_A / 2);
        assertEq(rB, LIQ_B + LIQ_B / 2);

        uint256 expectedShares = (LIQ_A / 2) * supplyBefore / rABefore;
        assertEq(pool1.getLPBalance(tier2User), expectedShares);
    }

    // ── 4. addLiquidity — compliance blocks ───────────────────────────────────

    function test_addLiquidity_noTier_reverts() public {
        _approveBoth(noTierUser, address(pool1));
        vm.prank(noTierUser);
        vm.expectRevert(CompliancePool.NotCompliant.selector);
        pool1.addLiquidity(LIQ_A, LIQ_B, 0, 0);
    }

    function test_addLiquidity_tier1_blockedOnTier2Pool() public {
        _approveBoth(tier1User, address(pool2));
        vm.prank(tier1User);
        vm.expectRevert(CompliancePool.NotCompliant.selector);
        pool2.addLiquidity(LIQ_A, LIQ_B, 0, 0);
    }

    function test_addLiquidity_emitsComplianceBlocked() public {
        _approveBoth(noTierUser, address(pool1));
        vm.prank(noTierUser);
        vm.expectEmit(true, false, false, false);
        emit CompliancePool.ComplianceBlocked(noTierUser, 0, 1, "addLiquidity");
        vm.expectRevert(CompliancePool.NotCompliant.selector);
        pool1.addLiquidity(LIQ_A, LIQ_B, 0, 0);
    }

    // ── 5. removeLiquidity ────────────────────────────────────────────────────

    function test_removeLiquidity_happy() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);
        uint256 lpBal = pool1.getLPBalance(tier1User);

        uint256 usdBefore   = iusd.balanceOf(tier1User);
        uint256 trBefore    = tTreas.balanceOf(tier1User);
        uint256 supplyBefore = pool1.totalSupply();

        vm.prank(tier1User);
        pool1.removeLiquidity(lpBal);

        assertEq(pool1.getLPBalance(tier1User), 0);
        assertGt(iusd.balanceOf(tier1User),   usdBefore);
        assertGt(tTreas.balanceOf(tier1User), trBefore);
        // Only MINIMUM_LIQUIDITY locked shares remain
        assertEq(pool1.totalSupply(), pool1.MINIMUM_LIQUIDITY());
    }

    function test_removeLiquidity_blockedWhenNotCompliant() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);
        uint256 lp = pool1.getLPBalance(tier1User);

        // Revoke tier1User
        gateway.revoke(tier1User);

        vm.prank(tier1User);
        vm.expectRevert(CompliancePool.NotCompliant.selector);
        pool1.removeLiquidity(lp);
    }

    function test_removeLiquidity_insufficientLPBalance() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);
        uint256 lp = pool1.getLPBalance(tier1User);

        vm.prank(tier1User);
        vm.expectRevert(CompliancePool.InsufficientLPBalance.selector);
        pool1.removeLiquidity(lp + 1);
    }

    // ── 6. swap — happy path ──────────────────────────────────────────────────

    function test_swap_aToB() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        uint256 swapIn = 1_000e6;
        uint256 expectedOut = pool1.getAmountOut(swapIn, LIQ_A, LIQ_B);

        vm.startPrank(tier2User);
        iusd.approve(address(pool1), swapIn);
        uint256 amountOut = pool1.swap(address(iusd), swapIn, 0);
        vm.stopPrank();

        assertEq(amountOut, expectedOut);
        assertGt(amountOut, 0);
        // Reserves updated
        (uint256 rA,) = pool1.getReserves();
        assertEq(rA, LIQ_A + swapIn);
    }

    function test_swap_bToA() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        uint256 swapIn = 1_000e18;
        uint256 expectedOut = pool1.getAmountOut(swapIn, LIQ_B, LIQ_A);

        vm.startPrank(tier2User);
        tTreas.approve(address(pool1), swapIn);
        uint256 amountOut = pool1.swap(address(tTreas), swapIn, 0);
        vm.stopPrank();

        assertEq(amountOut, expectedOut);
    }

    function test_swap_blockedNoCompliance() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        vm.startPrank(noTierUser);
        iusd.approve(address(pool1), 1_000e6);
        vm.expectRevert(CompliancePool.NotCompliant.selector);
        pool1.swap(address(iusd), 1_000e6, 0);
        vm.stopPrank();
    }

    function test_swap_invalidToken() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        vm.startPrank(tier1User);
        vm.expectRevert(CompliancePool.InvalidToken.selector);
        pool1.swap(address(0xdead), 1_000e6, 0);
        vm.stopPrank();
    }

    function test_swap_slippageExceeded() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        uint256 swapIn = 1_000e6;
        uint256 out    = pool1.getAmountOut(swapIn, LIQ_A, LIQ_B);

        vm.startPrank(tier2User);
        iusd.approve(address(pool1), swapIn);
        vm.expectRevert(CompliancePool.SlippageExceeded.selector);
        pool1.swap(address(iusd), swapIn, out + 1);
        vm.stopPrank();
    }

    // ── 7. getAmountOut edge cases ────────────────────────────────────────────

    function test_getAmountOut_revertsZeroReserves() public {
        vm.expectRevert(CompliancePool.InsufficientLiquidity.selector);
        pool1.getAmountOut(1_000e6, 0, LIQ_B);
    }

    function test_getAmountOut_revertsZeroInput() public {
        vm.expectRevert(CompliancePool.ZeroAmount.selector);
        pool1.getAmountOut(0, LIQ_A, LIQ_B);
    }

    function test_getAmountOut_feeApplied() public view {
        // Without fee: 1000 in / 1M+1000 ≈ 999 out (slightly less due to fee)
        uint256 out = pool1.getAmountOut(1_000e6, LIQ_A, LIQ_B);
        // With 0.3% fee, output is < perfect ratio
        uint256 perfectOut = 1_000e6 * LIQ_B / (LIQ_A + 1_000e6);
        assertLt(out, perfectOut);
        assertGt(out, 0);
    }

    // ── 8. compliance state changes ───────────────────────────────────────────

    function test_revokedUser_cannotSwap() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        gateway.revoke(tier2User);

        vm.startPrank(tier2User);
        iusd.approve(address(pool1), 1_000e6);
        vm.expectRevert(CompliancePool.NotCompliant.selector);
        pool1.swap(address(iusd), 1_000e6, 0);
        vm.stopPrank();
    }

    function test_expiredAttestation_cannotInteract() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        // Warp time past expiry
        gateway.setExpiry(tier2User, block.timestamp - 1);
        assertFalse(pool1.canInteract(tier2User));

        vm.startPrank(tier2User);
        iusd.approve(address(pool1), 1_000e6);
        vm.expectRevert(CompliancePool.NotCompliant.selector);
        pool1.swap(address(iusd), 1_000e6, 0);
        vm.stopPrank();
    }

    function test_renewedAttestation_canInteractAgain() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        gateway.setExpiry(tier2User, block.timestamp - 1);
        assertFalse(pool1.canInteract(tier2User));

        // Renew
        gateway.setExpiry(tier2User, FAR_FUTURE);
        assertTrue(pool1.canInteract(tier2User));
    }

    // ── 9. getPoolInfo / getReserves / getLPBalance views ────────────────────

    function test_getPoolInfo() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);
        (
            address gw, address ta, address tb,
            uint8 rt, uint256 rA, uint256 rB, uint256 ts
        ) = pool1.getPoolInfo();

        assertEq(gw, address(gateway));
        assertEq(ta, address(iusd));
        assertEq(tb, address(tTreas));
        assertEq(rt, 1);
        assertEq(rA, LIQ_A);
        assertEq(rB, LIQ_B);
        assertGt(ts, 0);
    }

    function test_getReserves_beforeLiquidity() public view {
        (uint256 rA, uint256 rB) = pool1.getReserves();
        assertEq(rA, 0);
        assertEq(rB, 0);
    }

    function test_getLPBalance_zero_forNewUser() public view {
        assertEq(pool1.getLPBalance(tier3User), 0);
    }

    // ── 10. ZeroAmount guards ─────────────────────────────────────────────────

    function test_addLiquidity_zeroAmountReverts() public {
        vm.prank(tier1User);
        iusd.approve(address(pool1), type(uint256).max);
        vm.prank(tier1User);
        tTreas.approve(address(pool1), type(uint256).max);

        vm.prank(tier1User);
        vm.expectRevert(CompliancePool.ZeroAmount.selector);
        pool1.addLiquidity(0, LIQ_B, 0, 0);
    }

    function test_removeLiquidity_zeroReverts() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        vm.prank(tier1User);
        vm.expectRevert(CompliancePool.ZeroAmount.selector);
        pool1.removeLiquidity(0);
    }

    function test_swap_zeroAmountReverts() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);

        vm.prank(tier1User);
        iusd.approve(address(pool1), type(uint256).max);

        vm.prank(tier1User);
        vm.expectRevert(CompliancePool.ZeroAmount.selector);
        pool1.swap(address(iusd), 0, 0);
    }

    // ── 11. k invariant check ─────────────────────────────────────────────────

    function test_kInvariant_heldAfterSwap() public {
        _addLiq(tier1User, pool1, LIQ_A, LIQ_B);
        (uint256 rA0, uint256 rB0) = pool1.getReserves();
        uint256 k0 = rA0 * rB0;

        vm.startPrank(tier2User);
        iusd.approve(address(pool1), 1_000e6);
        pool1.swap(address(iusd), 1_000e6, 0);
        vm.stopPrank();

        (uint256 rA1, uint256 rB1) = pool1.getReserves();
        uint256 k1 = rA1 * rB1;
        // k must be >= k0 (fees increase k slightly)
        assertGe(k1, k0);
    }

    // ── 12. Tier-3 pool only accessible by tier-3 ─────────────────────────────

    function test_tier3Pool_onlyTier3CanAdd() public {
        // tier2 cannot
        _approveBoth(tier2User, address(pool3));
        vm.prank(tier2User);
        vm.expectRevert(CompliancePool.NotCompliant.selector);
        pool3.addLiquidity(LIQ_A, LIQ_B, 0, 0);

        // tier3 can
        _addLiq(tier3User, pool3, LIQ_A, LIQ_B);
        (uint256 rA,) = pool3.getReserves();
        assertEq(rA, LIQ_A);
    }

    // ── Internal helper (mirrors CompliancePool._sqrt) ────────────────────────
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) { z = x; x = (y / x + x) / 2; }
        } else if (y != 0) { z = 1; }
    }
}
