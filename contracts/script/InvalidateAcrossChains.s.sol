// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AttestationInvalidator} from "../src/AttestationInvalidator.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title InvalidateAcrossChains
/// @notice Revokes an attestation on Sepolia AND broadcasts the revocation to Arbitrum Sepolia.
///         Demonstrates the "sanctions update" cross-chain invalidation scenario.
///
///   Usage (run on Sepolia):
///     forge script script/InvalidateAcrossChains.s.sol \
///       --rpc-url $SEPOLIA_RPC_URL --broadcast -vvvv
contract InvalidateAcrossChains is Script {
    uint64 constant ARB_SEPOLIA_SELECTOR = 3478487238524512106;
    address constant DEFAULT_SUBJECT = 0xAa00000000000000000000000000000000000002;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address subject = vm.envOr("TEST_SUBJECT", DEFAULT_SUBJECT);
        string memory reason = vm.envOr(
            "REVOKE_REASON",
            string("Sanctions update: address added to OFAC SDN list")
        );
        _invalidate(pk, subject, reason);
    }

    function _invalidate(uint256 pk, address subject, string memory reason) internal {
        address gatewayAddr     = vm.envAddress("SRC_GATEWAY_ADDRESS");
        address invalidatorAddr = vm.envAddress("SRC_INVALIDATOR_ADDRESS");
        address receiverAddr    = vm.envAddress("RECEIVER_ADDRESS");
        address linkAddr        = vm.envAddress("LINK_TOKEN_SEPOLIA");

        ComplianceGateway gateway = ComplianceGateway(gatewayAddr);
        AttestationInvalidator inv = AttestationInvalidator(payable(invalidatorAddr));

        console.log("=== Cross-Chain Invalidation ===");
        console.log("Subject: ", subject);
        console.log("Was compliant: ", gateway.isCompliant(subject) ? "YES" : "NO");
        console.log("");

        uint64[] memory selectors = new uint64[](1);
        address[] memory receivers = new address[](1);
        selectors[0] = ARB_SEPOLIA_SELECTOR;
        receivers[0] = receiverAddr;

        uint256 fee = inv.estimateInvalidationFee(subject, reason, selectors, receivers);
        console.log("Estimated CCIP fee (LINK wei): ", fee);

        _fundAndRevoke(pk, inv, subject, reason, selectors, receivers, fee, linkAddr);

        console.log("");
        console.log("Revoked on Sepolia:  ", gateway.isRevoked(subject) ? "YES" : "NO");
        console.log("CCIP revocation sent to Arbitrum Sepolia.");
        console.log("Monitor: https://ccip.chain.link");
    }

    function _fundAndRevoke(
        uint256 pk,
        AttestationInvalidator inv,
        address subject,
        string memory reason,
        uint64[] memory selectors,
        address[] memory receivers,
        uint256 fee,
        address linkAddr
    ) internal {
        IERC20 link = IERC20(linkAddr);
        address deployer = vm.addr(pk);

        uint256 invLink = link.balanceOf(address(inv));
        console.log("Invalidator LINK balance: ", invLink);

        vm.startBroadcast(pk);

        if (invLink < fee) {
            uint256 topUp = fee - invLink + fee / 10;
            require(link.balanceOf(deployer) >= topUp, "Insufficient LINK in wallet");
            link.transfer(address(inv), topUp);
            console.log("Topped up invalidator LINK: ", topUp);
        }

        inv.invalidateAcrossChains(subject, reason, selectors, receivers);

        vm.stopBroadcast();
    }
}
