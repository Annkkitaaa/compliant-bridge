// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AttestationSender} from "../src/AttestationSender.sol";
import {AttestationReceiver} from "../src/AttestationReceiver.sol";
import {AttestationInvalidator} from "../src/AttestationInvalidator.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ConfigureCCIP
/// @notice Configures cross-chain trust relationships after deployment on both chains.
///         Run this script TWICE: once on the source chain and once on the destination chain.
///
///         On source chain (Sepolia):
///           - Fund AttestationSender with LINK or native for fees
///           - Fund AttestationInvalidator with LINK or native for fees
///           - Authorize the compliance bot as an authorized sender
///
///         On destination chain (Arb/Base Sepolia):
///           - Allowlist the source chain selector on the receiver
///           - Allowlist the source chain sender address on the receiver
///           - Allowlist the source chain invalidator address on the receiver
contract ConfigureCCIP is Script {
    uint256 constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 constant ARB_SEPOLIA_CHAIN_ID = 421614;
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84532;

    // CCIP chain selectors
    uint64 constant SEPOLIA_SELECTOR = 16015286601757825753;
    uint64 constant ARB_SEPOLIA_SELECTOR = 3478487238524512106;
    uint64 constant BASE_SEPOLIA_SELECTOR = 10344971235874465080;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        console.log("=== CCIP Configuration ===");
        console.log("Chain ID:", block.chainid);

        if (block.chainid == SEPOLIA_CHAIN_ID) {
            _configureSourceChain(deployerPrivateKey);
        } else if (
            block.chainid == ARB_SEPOLIA_CHAIN_ID
                || block.chainid == BASE_SEPOLIA_CHAIN_ID
        ) {
            _configureDestChain(deployerPrivateKey);
        } else {
            console.log("Unknown chain ID. Skipping configuration.");
        }
    }

    function _configureSourceChain(uint256 deployerPrivateKey) internal {
        address senderAddr = vm.envAddress("SENDER_ADDRESS");
        address invalidatorAddr = vm.envAddress("SRC_INVALIDATOR_ADDRESS");
        address complianceBot = vm.envOr("COMPLIANCE_BOT", vm.addr(deployerPrivateKey));
        address linkToken = vm.envOr("LINK_TOKEN", address(0));

        AttestationSender sender = AttestationSender(payable(senderAddr));
        AttestationInvalidator invalidator = AttestationInvalidator(
            payable(invalidatorAddr)
        );

        console.log("Configuring SOURCE chain (Sepolia)");
        console.log("Sender:     ", senderAddr);
        console.log("Invalidator:", invalidatorAddr);
        console.log("Bot:        ", complianceBot);

        vm.startBroadcast(deployerPrivateKey);

        // Authorize the compliance bot as a sender
        sender.setAuthorizedSender(complianceBot, true);
        console.log("Authorized compliance bot on sender");

        // Fund sender for CCIP fees
        if (linkToken != address(0)) {
            uint256 linkFund = vm.envOr("LINK_FUND_AMOUNT", uint256(5 ether));
            IERC20(linkToken).transfer(senderAddr, linkFund);
            console.log("Funded sender with LINK:", linkFund);

            IERC20(linkToken).transfer(invalidatorAddr, linkFund);
            console.log("Funded invalidator with LINK:", linkFund);
        } else {
            uint256 nativeFund = vm.envOr(
                "NATIVE_FUND_AMOUNT",
                uint256(0.1 ether)
            );
            (bool s1, ) = senderAddr.call{value: nativeFund}("");
            require(s1, "Failed to fund sender");
            console.log("Funded sender with native:", nativeFund);

            (bool s2, ) = invalidatorAddr.call{value: nativeFund}("");
            require(s2, "Failed to fund invalidator");
            console.log("Funded invalidator with native:", nativeFund);
        }

        vm.stopBroadcast();

        console.log("");
        console.log("Source chain configured.");
        console.log(">>> Now run this script on the destination chain <<<");
    }

    function _configureDestChain(uint256 deployerPrivateKey) internal {
        address receiverAddr = vm.envAddress("RECEIVER_ADDRESS");
        address srcSenderAddr = vm.envAddress("SENDER_ADDRESS");
        address srcInvalidatorAddr = vm.envAddress("SRC_INVALIDATOR_ADDRESS");

        AttestationReceiver receiver = AttestationReceiver(receiverAddr);

        console.log("Configuring DESTINATION chain");
        console.log("Receiver:        ", receiverAddr);
        console.log("Source sender:    ", srcSenderAddr);
        console.log("Source invalidator:", srcInvalidatorAddr);

        vm.startBroadcast(deployerPrivateKey);

        // Allowlist Sepolia as a source chain
        receiver.allowlistChain(SEPOLIA_SELECTOR, true);
        console.log("Allowlisted Sepolia chain selector");

        // Allowlist the sender contract on Sepolia
        receiver.allowlistSender(SEPOLIA_SELECTOR, srcSenderAddr, true);
        console.log("Allowlisted sender from Sepolia");

        // Allowlist the invalidator contract on Sepolia
        receiver.allowlistSender(SEPOLIA_SELECTOR, srcInvalidatorAddr, true);
        console.log("Allowlisted invalidator from Sepolia");

        vm.stopBroadcast();

        console.log("");
        console.log("Destination chain configured.");
        console.log(">>> Cross-chain setup complete! <<<");
        console.log(">>> Run: make test-crosschain <<<");
    }
}
