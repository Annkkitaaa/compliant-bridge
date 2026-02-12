// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {ComplianceToken} from "../src/ComplianceToken.sol";
import {RegulatorView} from "../src/RegulatorView.sol";
import {AttestationSender} from "../src/AttestationSender.sol";
import {AttestationReceiver} from "../src/AttestationReceiver.sol";
import {AttestationInvalidator} from "../src/AttestationInvalidator.sol";

/// @title Deploy
/// @notice Chain-aware deployment script for Compliant Bridge.
///         Detects the target chain and deploys the appropriate contracts:
///         - All chains:   ComplianceGateway, ComplianceToken, RegulatorView, AttestationInvalidator
///         - Source chain:  + AttestationSender
///         - Dest chain:    + AttestationReceiver
contract Deploy is Script {
    // Chain IDs
    uint256 constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 constant ARB_SEPOLIA_CHAIN_ID = 421614;
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84532;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address ccipRouter = vm.envAddress("CCIP_ROUTER");
        address linkToken = vm.envOr("LINK_TOKEN", address(0));

        bool isSource = _isSourceChain();
        bool isDest = _isDestChain();
        string memory chainName = _chainName();

        console.log("=== Compliant Bridge Deployment ===");
        console.log("Chain:    ", chainName);
        console.log("Chain ID: ", block.chainid);
        console.log("Deployer: ", deployer);
        console.log("Router:   ", ccipRouter);
        console.log("LINK:     ", linkToken);
        console.log("Role:      %s", isSource ? "SOURCE" : "DESTINATION");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ── Core contracts (all chains) ──────────────────────────────
        ComplianceGateway gateway = new ComplianceGateway();
        console.log("ComplianceGateway:", address(gateway));

        ComplianceToken token = new ComplianceToken(
            "Compliant Bridge Token",
            "CBT",
            address(gateway)
        );
        console.log("ComplianceToken:  ", address(token));

        RegulatorView regulatorView = new RegulatorView(address(gateway));
        console.log("RegulatorView:    ", address(regulatorView));

        // Authorize deployer as workflow for admin operations
        gateway.setAuthorizedWorkflow(deployer, true);

        // ── Source chain: AttestationSender ───────────────────────────
        if (isSource) {
            AttestationSender sender = new AttestationSender(
                ccipRouter,
                linkToken
            );
            console.log("AttestationSender:", address(sender));

            // Authorize deployer as sender for testing
            sender.setAuthorizedSender(deployer, true);
        }

        // ── Destination chain: AttestationReceiver ───────────────────
        if (isDest) {
            AttestationReceiver receiver = new AttestationReceiver(
                ccipRouter,
                address(gateway)
            );
            console.log("AttestationReceiver:", address(receiver));

            // Authorize receiver in gateway
            gateway.setAuthorizedReceiver(address(receiver), true);
        }

        // ── All chains: AttestationInvalidator ───────────────────────
        AttestationInvalidator invalidator = new AttestationInvalidator(
            ccipRouter,
            linkToken,
            address(gateway)
        );
        console.log("AttestationInvalidator:", address(invalidator));

        // Authorize invalidator as workflow so it can revoke locally
        gateway.setAuthorizedWorkflow(address(invalidator), true);

        // Authorize deployer as compliance officer for testing
        invalidator.setComplianceOfficer(deployer, true);

        vm.stopBroadcast();

        // ── Summary ──────────────────────────────────────────────────
        console.log("");
        console.log("=== Deployment Summary (%s) ===", chainName);
        console.log("ComplianceGateway:     ", address(gateway));
        console.log("ComplianceToken:       ", address(token));
        console.log("RegulatorView:         ", address(regulatorView));
        console.log("AttestationInvalidator:", address(invalidator));
        console.log("");
        console.log(">>> Copy these addresses into your .env file <<<");
        console.log(">>> Then run: make configure-ccip <<<");
    }

    function _isSourceChain() internal view returns (bool) {
        return block.chainid == SEPOLIA_CHAIN_ID;
    }

    function _isDestChain() internal view returns (bool) {
        return block.chainid == ARB_SEPOLIA_CHAIN_ID
            || block.chainid == BASE_SEPOLIA_CHAIN_ID;
    }

    function _chainName() internal view returns (string memory) {
        if (block.chainid == SEPOLIA_CHAIN_ID) return "Sepolia";
        if (block.chainid == ARB_SEPOLIA_CHAIN_ID) return "Arbitrum Sepolia";
        if (block.chainid == BASE_SEPOLIA_CHAIN_ID) return "Base Sepolia";
        if (block.chainid == 31337) return "Anvil (local)";
        return "Unknown";
    }
}
