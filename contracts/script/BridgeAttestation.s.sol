// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {AttestationSender} from "../src/AttestationSender.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title BridgeAttestation
/// @notice Bridges an existing Sepolia attestation to Arbitrum Sepolia via CCIP.
///         Reads from the live gateway — no need to create a new attestation.
///
///   Usage (run on Sepolia):
///     forge script script/BridgeAttestation.s.sol \
///       --rpc-url $SEPOLIA_RPC_URL --broadcast -vvvv
contract BridgeAttestation is Script {
    uint64 constant ARB_SEPOLIA_SELECTOR = 3478487238524512106;
    address constant DEFAULT_SUBJECT = 0xAA00000000000000000000000000000000000001;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        address subject     = vm.envOr("TEST_SUBJECT", DEFAULT_SUBJECT);
        uint64 destSelector = uint64(vm.envOr("DEST_CHAIN_SELECTOR", uint256(ARB_SEPOLIA_SELECTOR)));

        _checkAndBridge(pk, subject, destSelector);
    }

    function _checkAndBridge(uint256 pk, address subject, uint64 destSelector) internal {
        address gatewayAddr  = vm.envAddress("SRC_GATEWAY_ADDRESS");
        address senderAddr   = vm.envAddress("SENDER_ADDRESS");
        address receiverAddr = vm.envAddress("RECEIVER_ADDRESS");
        address linkAddr     = vm.envAddress("LINK_TOKEN_SEPOLIA");

        ComplianceGateway gateway = ComplianceGateway(gatewayAddr);
        AttestationSender sender  = AttestationSender(payable(senderAddr));

        console.log("=== Bridge Attestation: Sepolia -> Arbitrum Sepolia ===");
        console.log("Subject:  ", subject);
        console.log("Receiver: ", receiverAddr);
        console.log("");

        IComplianceGateway.ComplianceAttestation memory att = gateway.getAttestation(subject);
        require(att.issuedAt != 0, "No attestation found for subject on Sepolia");
        require(gateway.isCompliant(subject), "Subject not compliant on Sepolia");

        console.log("Source attestation:");
        console.log("  Tier:       ", att.tier);
        console.log("  ValidUntil: ", att.validUntil);
        console.log("");

        _fundAndSend(pk, sender, att, destSelector, receiverAddr, linkAddr);
    }

    function _fundAndSend(
        uint256 pk,
        AttestationSender sender,
        IComplianceGateway.ComplianceAttestation memory att,
        uint64 destSelector,
        address receiverAddr,
        address linkAddr
    ) internal {
        IERC20 link = IERC20(linkAddr);
        address deployer = vm.addr(pk);

        uint256 fee = sender.estimateFee(destSelector, receiverAddr, att);
        console.log("CCIP fee (LINK wei): ", fee);

        uint256 senderLink = link.balanceOf(address(sender));
        console.log("Sender LINK balance: ", senderLink);

        vm.startBroadcast(pk);

        // Top up sender with LINK if needed
        if (senderLink < fee) {
            uint256 topUp = fee - senderLink + fee / 10; // 10% buffer
            require(link.balanceOf(deployer) >= topUp, "Insufficient LINK in deployer wallet");
            link.transfer(address(sender), topUp);
            console.log("Topped up sender LINK (wei): ", topUp);
        }

        bytes32 messageId = sender.sendAttestation(destSelector, receiverAddr, att);

        vm.stopBroadcast();

        console.log("");
        console.log("=== CCIP Message Sent ===");
        console.logBytes32(messageId);
        console.log("");
        console.log("Monitor: https://ccip.chain.link");
        console.log("After delivery, verify: make verify-arb-sepolia");
    }
}
