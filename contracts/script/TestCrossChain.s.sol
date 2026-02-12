// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {AttestationSender} from "../src/AttestationSender.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";

/// @title TestCrossChain
/// @notice Executes the cross-chain attestation flow on live testnets.
///
///         This script runs in two phases (set PHASE env var):
///
///         Phase 1 (run on Sepolia): Submit attestation + send via CCIP
///           PHASE=1 forge script script/TestCrossChain.s.sol --rpc-url sepolia --broadcast
///
///         Phase 2 (run on destination after CCIP delivers ~5-20 min):
///           PHASE=2 forge script script/TestCrossChain.s.sol --rpc-url arb-sepolia --broadcast
///
///         Phase 2 is read-only: it just verifies the attestation arrived.
contract TestCrossChain is Script {
    uint64 constant ARB_SEPOLIA_SELECTOR = 3478487238524512106;
    uint64 constant BASE_SEPOLIA_SELECTOR = 10344971235874465080;

    function run() external {
        uint256 phase = vm.envOr("PHASE", uint256(1));

        if (phase == 1) {
            _phase1_sendAttestation();
        } else if (phase == 2) {
            _phase2_verifyDelivery();
        } else {
            revert("Invalid PHASE. Use PHASE=1 or PHASE=2");
        }
    }

    /// @dev Phase 1: Run on Sepolia. Submits attestation locally and sends cross-chain.
    function _phase1_sendAttestation() internal {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address gatewayAddr = vm.envAddress("SRC_GATEWAY_ADDRESS");
        address senderAddr = vm.envAddress("SENDER_ADDRESS");
        address receiverAddr = vm.envAddress("RECEIVER_ADDRESS");
        address testSubject = vm.envOr("TEST_SUBJECT", deployer);
        uint64 destSelector = uint64(vm.envOr(
            "DEST_CHAIN_SELECTOR",
            uint256(ARB_SEPOLIA_SELECTOR)
        ));

        ComplianceGateway gateway = ComplianceGateway(gatewayAddr);
        AttestationSender sender = AttestationSender(payable(senderAddr));

        console.log("=== Phase 1: Send Attestation (Sepolia) ===");
        console.log("Gateway:  ", gatewayAddr);
        console.log("Sender:   ", senderAddr);
        console.log("Receiver: ", receiverAddr);
        console.log("Subject:  ", testSubject);
        console.log("");

        // Build attestation
        IComplianceGateway.ComplianceAttestation memory att = IComplianceGateway
            .ComplianceAttestation({
                subject: testSubject,
                tier: 2,
                maxTransferValue: 5000 ether,
                validUntil: block.timestamp + 365 days,
                checkId: keccak256(
                    abi.encodePacked(testSubject, block.timestamp, "crosschain-test")
                ),
                jurisdictionData: abi.encode("US"),
                issuedAt: block.timestamp,
                sourceChainId: block.chainid
            });

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Attest locally on source chain
        gateway.attestCompliance(testSubject, att);
        console.log("Step 1: Local attestation submitted");

        // Step 2: Estimate fee
        uint256 fee = sender.estimateFee(destSelector, receiverAddr, att);
        console.log("Step 2: Estimated CCIP fee:", fee);

        // Step 3: Send attestation cross-chain
        bytes32 messageId = sender.sendAttestation(
            destSelector,
            receiverAddr,
            att
        );
        console.log("Step 3: CCIP message sent!");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Phase 1 Complete ===");
        console.log("Message ID:");
        console.logBytes32(messageId);
        console.log("");
        console.log("Monitor delivery at: https://ccip.chain.link");
        console.log("Wait 5-20 minutes for CCIP delivery, then run Phase 2:");
        console.log("  PHASE=2 forge script script/TestCrossChain.s.sol --rpc-url arb-sepolia");
    }

    /// @dev Phase 2: Run on destination chain. Verifies the attestation was delivered.
    function _phase2_verifyDelivery() internal {
        address gatewayAddr = vm.envAddress("DST_GATEWAY_ADDRESS");
        address testSubject = vm.envOr(
            "TEST_SUBJECT",
            vm.addr(vm.envUint("PRIVATE_KEY"))
        );

        ComplianceGateway gateway = ComplianceGateway(gatewayAddr);

        console.log("=== Phase 2: Verify Delivery ===");
        console.log("Gateway:", gatewayAddr);
        console.log("Subject:", testSubject);
        console.log("");

        bool compliant = gateway.isCompliant(testSubject);
        bool remote = gateway.isRemoteAttestation(testSubject);

        if (compliant) {
            console.log("PASS: Subject is compliant on destination chain");

            IComplianceGateway.ComplianceAttestation memory att = gateway
                .getAttestation(testSubject);
            console.log("  Tier:           ", att.tier);
            console.log("  MaxTransfer:    ", att.maxTransferValue);
            console.log("  ValidUntil:     ", att.validUntil);
            console.log("  SourceChainId:  ", att.sourceChainId);
            console.log("  IsRemote:       ", remote ? "true" : "false");
        } else {
            console.log("PENDING: Attestation not yet delivered.");
            console.log("  CCIP delivery typically takes 5-20 minutes.");
            console.log("  Check https://ccip.chain.link for message status.");

            bool revoked = gateway.isRevoked(testSubject);
            if (revoked) {
                console.log("  NOTE: Subject is revoked on destination.");
            }
        }

        console.log("");
        console.log("=== Phase 2 Complete ===");
    }
}
