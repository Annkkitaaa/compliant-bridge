// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/IComplianceGateway.sol";

/**
 * @notice Attest a wallet address on a ComplianceGateway.
 *
 * Usage:
 *   forge script script/AttestWallet.s.sol \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --broadcast \
 *     --private-key $PRIVATE_KEY
 *
 * Required env vars:
 *   GATEWAY_ADDRESS  — the gateway contract to attest on
 *   SUBJECT_ADDRESS  — the wallet to attest
 *   TIER             — 1, 2, or 3
 */
contract AttestWallet is Script {
    function run() external {
        address gateway = vm.envAddress("GATEWAY_ADDRESS");
        address subject = vm.envAddress("SUBJECT_ADDRESS");
        uint8   tier    = uint8(vm.envUint("TIER"));

        IComplianceGateway.ComplianceAttestation memory att = IComplianceGateway.ComplianceAttestation({
            subject:          subject,
            tier:             tier,
            maxTransferValue: tier == 1 ? 10_000 ether : tier == 2 ? 100_000 ether : 1_000_000 ether,
            validUntil:       block.timestamp + 365 days,
            checkId:          bytes32(uint256(1)),
            jurisdictionData: abi.encode("US", "NY", false),
            issuedAt:         block.timestamp,
            sourceChainId:    block.chainid
        });

        vm.startBroadcast();
        IComplianceGateway(gateway).attestCompliance(subject, att);
        vm.stopBroadcast();

        console.log("Attested", subject, "at Tier", tier, "on gateway", gateway);
    }
}
