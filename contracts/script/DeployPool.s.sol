// SPDX-License-Identifier: MIT
// Deploy script for Compliance Liquidity Pool infrastructure.
// Usage:
//   forge script script/DeployPool.s.sol --rpc-url $SEPOLIA_RPC \
//     --private-key $PRIVATE_KEY --broadcast
//
// Required env vars:
//   PRIVATE_KEY          — deployer private key
//   GATEWAY_ADDRESS      — address of the ComplianceGateway to use
//                          (deploy a new gateway first if needed)
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {CompliancePool} from "../src/CompliancePool.sol";

contract DeployPool is Script {
    // Initial liquidity amounts
    uint256 constant IUSD_DECIMALS   = 6;
    uint256 constant TREAS_DECIMALS  = 18;
    uint256 constant MINT_AMOUNT     = 10_000_000 * 1e6;   // 10M IUSD
    uint256 constant MINT_TREAS      = 10_000_000 * 1e18;  // 10M tTREAS
    uint256 constant LIQ_IUSD        = 100_000 * 1e6;      // 100k per pool
    uint256 constant LIQ_TREAS       = 100_000 * 1e18;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address gatewayAddr = vm.envAddress("GATEWAY_ADDRESS");

        console.log("=== Compliance Liquidity Pool Deployment ===");
        console.log("Deployer:        ", deployer);
        console.log("Gateway:         ", gatewayAddr);
        console.log("Chain ID:        ", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // ── 1. Deploy mock tokens ────────────────────────────────────────
        MockERC20 iusd   = new MockERC20("Institutional USD",    "IUSD",   uint8(IUSD_DECIMALS));
        MockERC20 tTreas = new MockERC20("Tokenized Treasury",   "tTREAS", uint8(TREAS_DECIMALS));
        console.log("IUSD deployed:   ", address(iusd));
        console.log("tTREAS deployed: ", address(tTreas));

        // ── 2. Mint tokens to deployer ───────────────────────────────────
        iusd.mint(deployer, MINT_AMOUNT);
        tTreas.mint(deployer, MINT_TREAS);
        console.log("Minted 10M IUSD and 10M tTREAS to deployer");

        // ── 3. Deploy 3 pools (tier 1 / 2 / 3) ──────────────────────────
        CompliancePool tier1Pool = new CompliancePool(gatewayAddr, address(iusd), address(tTreas), 1, "Tier1");
        CompliancePool tier2Pool = new CompliancePool(gatewayAddr, address(iusd), address(tTreas), 2, "Tier2");
        CompliancePool tier3Pool = new CompliancePool(gatewayAddr, address(iusd), address(tTreas), 3, "Tier3");
        console.log("Pool Tier1:      ", address(tier1Pool));
        console.log("Pool Tier2:      ", address(tier2Pool));
        console.log("Pool Tier3:      ", address(tier3Pool));

        // ── 4. Seed liquidity if deployer has attestation (tier >= 1) ────
        bool deployerCompliant = ComplianceGateway(gatewayAddr).isCompliantWithTier(deployer, 1);
        if (deployerCompliant) {
            // Approve all 3 pools for both tokens
            iusd.approve(address(tier1Pool), LIQ_IUSD * 3);
            tTreas.approve(address(tier1Pool), LIQ_TREAS * 3);
            iusd.approve(address(tier2Pool), LIQ_IUSD);
            tTreas.approve(address(tier2Pool), LIQ_TREAS);
            iusd.approve(address(tier3Pool), LIQ_IUSD);
            tTreas.approve(address(tier3Pool), LIQ_TREAS);

            tier1Pool.addLiquidity(LIQ_IUSD, LIQ_TREAS, 0, 0);
            console.log("Seeded Tier1 pool with 100k IUSD + 100k tTREAS");

            // Tier2 and tier3 require higher attestation
            bool tier2Compliant = ComplianceGateway(gatewayAddr).isCompliantWithTier(deployer, 2);
            if (tier2Compliant) {
                tier2Pool.addLiquidity(LIQ_IUSD, LIQ_TREAS, 0, 0);
                console.log("Seeded Tier2 pool with 100k IUSD + 100k tTREAS");
            } else {
                console.log("WARNING: deployer not tier2 — Tier2 pool unseeded");
            }

            bool tier3Compliant = ComplianceGateway(gatewayAddr).isCompliantWithTier(deployer, 3);
            if (tier3Compliant) {
                tier3Pool.addLiquidity(LIQ_IUSD, LIQ_TREAS, 0, 0);
                console.log("Seeded Tier3 pool with 100k IUSD + 100k tTREAS");
            } else {
                console.log("WARNING: deployer not tier3 — Tier3 pool unseeded");
            }
        } else {
            console.log("WARNING: deployer not attested — all pools unseeded (add liquidity manually)");
        }

        vm.stopBroadcast();

        // ── Summary ──────────────────────────────────────────────────────
        console.log("");
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("Copy these into frontend/lib/contracts.ts POOL_ADDRESSES:");
        console.log("  gateway:   ", gatewayAddr);
        console.log("  iusd:      ", address(iusd));
        console.log("  tTreas:    ", address(tTreas));
        console.log("  tier1Pool: ", address(tier1Pool));
        console.log("  tier2Pool: ", address(tier2Pool));
        console.log("  tier3Pool: ", address(tier3Pool));
    }
}
