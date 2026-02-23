// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {ComplianceToken} from "../src/ComplianceToken.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";

/// @title VerifyCrossChain
/// @notice Read-only script that prints attestation state on any chain.
///         Run before bridging (on Sepolia) and after CCIP delivery (on Arb Sepolia).
///
///   Sepolia:
///     forge script script/VerifyCrossChain.s.sol --rpc-url $SEPOLIA_RPC_URL -vvv
///
///   Arbitrum Sepolia (after CCIP delivery):
///     forge script script/VerifyCrossChain.s.sol --rpc-url $ARB_SEPOLIA_RPC_URL -vvv
contract VerifyCrossChain is Script {
    // Test addresses from SetupTestData (also match mock API seed data)
    address constant ALICE   = 0xAA00000000000000000000000000000000000001; // Tier 2, US
    address constant BOB     = 0xAa00000000000000000000000000000000000002; // Tier 3, GB
    address constant CHARLIE = 0xBb00000000000000000000000000000000000001; // Tier 1, DE
    address constant DAVE    = 0xcC00000000000000000000000000000000000001; // Tier 1, short expiry

    function run() external view {
        // Load correct gateway for this chain
        string memory gatewayKey = _isArbSepolia()
            ? "DST_GATEWAY_ADDRESS"
            : "SRC_GATEWAY_ADDRESS";
        string memory tokenKey = "TOKEN_ADDRESS";

        address gatewayAddr = vm.envAddress(gatewayKey);
        address tokenAddr   = vm.envOr(tokenKey, address(0));

        ComplianceGateway gateway = ComplianceGateway(gatewayAddr);

        console.log("=== Compliant Bridge - Chain Status ===");
        console.log("Chain ID: ", block.chainid);
        console.log("Gateway:  ", gatewayAddr);
        if (tokenAddr != address(0)) {
            console.log("Token:    ", tokenAddr);
        }
        console.log("");

        address[4] memory subjects = [ALICE, BOB, CHARLIE, DAVE];
        string[4] memory names = ["Alice (0xAA..01)", "Bob (0xAA..02)", "Charlie (0xBB..01)", "Dave (0xCC..01)"];

        for (uint256 i = 0; i < subjects.length; i++) {
            _printAttestation(gateway, subjects[i], names[i]);
        }

        // Also check custom TEST_SUBJECT if set
        address customSubject = vm.envOr("TEST_SUBJECT", address(0));
        if (customSubject != address(0)) {
            console.log("--- Custom TEST_SUBJECT ---");
            _printAttestation(gateway, customSubject, "TEST_SUBJECT");
        }

        // Token balances if token is set
        if (tokenAddr != address(0)) {
            console.log("=== Token Balances ===");
            ComplianceToken token = ComplianceToken(tokenAddr);
            for (uint256 i = 0; i < subjects.length; i++) {
                uint256 bal = token.balanceOf(subjects[i]);
                console.log(names[i], ":", bal);
            }
        }
    }

    function _printAttestation(
        ComplianceGateway gateway,
        address subject,
        string memory name
    ) internal view {
        bool compliant = gateway.isCompliant(subject);
        bool revoked   = gateway.isRevoked(subject);
        bool remote    = gateway.isRemoteAttestation(subject);

        IComplianceGateway.ComplianceAttestation memory att = gateway.getAttestation(subject);
        bool hasAttestation = att.issuedAt != 0;

        console.log("--- %s ---", name);
        console.log("  Address:      ", subject);

        if (!hasAttestation) {
            console.log("  Status:        NO ATTESTATION");
            console.log("");
            return;
        }

        console.log("  Compliant:    ", compliant ? "YES" : "NO");
        console.log("  Revoked:      ", revoked    ? "YES" : "NO");
        console.log("  Remote:       ", remote     ? "YES (bridged)" : "NO (local)");
        console.log("  Tier:         ", att.tier);
        console.log("  MaxTransfer:  ", att.maxTransferValue);
        console.log("  ValidUntil:   ", att.validUntil);
        console.log("  SourceChain:  ", att.sourceChainId);
        console.log("  IssuedAt:     ", att.issuedAt);

        if (block.timestamp > att.validUntil) {
            console.log("  NOTE: Attestation is EXPIRED");
        }
        console.log("");
    }

    function _isArbSepolia() internal view returns (bool) {
        return block.chainid == 421614;
    }
}
