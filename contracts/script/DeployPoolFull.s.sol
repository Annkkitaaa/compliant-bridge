// SPDX-License-Identifier: MIT
// One-shot script: deploys a fresh ComplianceGateway (with tier queries),
// attests the deployer at Tier 3, then deploys MockERC20 tokens and
// three CompliancePools (tier 1 / 2 / 3) with initial liquidity.
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {CompliancePool} from "../src/CompliancePool.sol";

contract DeployPoolFull is Script {
    uint256 constant MINT_IUSD  = 10_000_000 * 1e6;
    uint256 constant MINT_TREAS = 10_000_000 * 1e18;
    uint256 constant LIQ_IUSD   =    100_000 * 1e6;
    uint256 constant LIQ_TREAS  =    100_000 * 1e18;

    function run() external {
        uint256 pk       = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console.log("=== DeployPoolFull ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(pk);

        // ── 1. Deploy a fresh ComplianceGateway (has isCompliantWithTier) ────
        ComplianceGateway gateway = new ComplianceGateway();
        console.log("Gateway:  ", address(gateway));

        // ── 2. Attest deployer at Tier 3, valid 1 year ────────────────────
        IComplianceGateway.ComplianceAttestation memory att = IComplianceGateway.ComplianceAttestation({
            subject:          deployer,
            tier:             3,
            maxTransferValue: 1_000_000 ether,
            validUntil:       block.timestamp + 365 days,
            checkId:          bytes32(uint256(1)),
            jurisdictionData: abi.encode("US", "NY", false),
            issuedAt:         block.timestamp,
            sourceChainId:    block.chainid
        });
        gateway.attestCompliance(deployer, att);
        console.log("Deployer attested at Tier 3");

        // ── 3. Deploy mock tokens ──────────────────────────────────────────
        MockERC20 iusd   = new MockERC20("Institutional USD",  "IUSD",   6);
        MockERC20 tTreas = new MockERC20("Tokenized Treasury", "tTREAS", 18);
        iusd.mint(deployer,   MINT_IUSD);
        tTreas.mint(deployer, MINT_TREAS);
        console.log("IUSD:    ", address(iusd));
        console.log("tTREAS:  ", address(tTreas));

        // ── 4. Deploy 3 compliance pools ──────────────────────────────────
        CompliancePool p1 = new CompliancePool(address(gateway), address(iusd), address(tTreas), 1, "Tier1");
        CompliancePool p2 = new CompliancePool(address(gateway), address(iusd), address(tTreas), 2, "Tier2");
        CompliancePool p3 = new CompliancePool(address(gateway), address(iusd), address(tTreas), 3, "Tier3");
        console.log("Pool T1: ", address(p1));
        console.log("Pool T2: ", address(p2));
        console.log("Pool T3: ", address(p3));

        // ── 5. Approve and seed initial liquidity in all three pools ──────
        iusd.approve(address(p1), LIQ_IUSD);
        tTreas.approve(address(p1), LIQ_TREAS);
        p1.addLiquidity(LIQ_IUSD, LIQ_TREAS, 0, 0);

        iusd.approve(address(p2), LIQ_IUSD);
        tTreas.approve(address(p2), LIQ_TREAS);
        p2.addLiquidity(LIQ_IUSD, LIQ_TREAS, 0, 0);

        iusd.approve(address(p3), LIQ_IUSD);
        tTreas.approve(address(p3), LIQ_TREAS);
        p3.addLiquidity(LIQ_IUSD, LIQ_TREAS, 0, 0);
        console.log("All pools seeded with 100k IUSD + 100k tTREAS");

        vm.stopBroadcast();

        // ── Summary (copy these into contracts.ts) ─────────────────────────
        console.log("\n=== POOL_ADDRESSES for contracts.ts ===");
        console.log("gateway:  ", address(gateway));
        console.log("iusd:     ", address(iusd));
        console.log("tTreas:   ", address(tTreas));
        console.log("tier1Pool:", address(p1));
        console.log("tier2Pool:", address(p2));
        console.log("tier3Pool:", address(p3));
    }
}
