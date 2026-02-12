// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";

contract SetupTestData is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gatewayAddr = vm.envAddress("GATEWAY_ADDRESS");

        ComplianceGateway gateway = ComplianceGateway(gatewayAddr);

        address addr1 = 0xAA00000000000000000000000000000000000001;
        address addr2 = 0xAA00000000000000000000000000000000000002;
        address addr3 = 0xBB00000000000000000000000000000000000001;
        address addr4 = 0xCC00000000000000000000000000000000000001;

        vm.startBroadcast(deployerPrivateKey);

        // Attestation 1: Tier 2 (accredited), US jurisdiction, 1-year expiry
        gateway.attestCompliance(
            addr1,
            IComplianceGateway.ComplianceAttestation({
                subject: addr1,
                tier: 2,
                maxTransferValue: 5000 ether,
                validUntil: block.timestamp + 365 days,
                checkId: keccak256(abi.encodePacked(addr1, block.timestamp, "test-1")),
                jurisdictionData: abi.encode("US", "NY", false),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            })
        );
        console.log("Attested addr1 (tier 2, US/NY, 1yr):", addr1);

        // Attestation 2: Tier 3 (institutional), GB jurisdiction, 1-year expiry
        gateway.attestCompliance(
            addr2,
            IComplianceGateway.ComplianceAttestation({
                subject: addr2,
                tier: 3,
                maxTransferValue: 50_000 ether,
                validUntil: block.timestamp + 365 days,
                checkId: keccak256(abi.encodePacked(addr2, block.timestamp, "test-2")),
                jurisdictionData: abi.encode("GB", "LDN", false),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            })
        );
        console.log("Attested addr2 (tier 3, GB/LDN, 1yr):", addr2);

        // Attestation 3: Tier 1 (basic), DE jurisdiction, 30-day expiry
        gateway.attestCompliance(
            addr3,
            IComplianceGateway.ComplianceAttestation({
                subject: addr3,
                tier: 1,
                maxTransferValue: 1000 ether,
                validUntil: block.timestamp + 30 days,
                checkId: keccak256(abi.encodePacked(addr3, block.timestamp, "test-3")),
                jurisdictionData: abi.encode("DE", "BER", false),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            })
        );
        console.log("Attested addr3 (tier 1, DE/BER, 30d):", addr3);

        // Attestation 4: Tier 1 (basic), US jurisdiction, 5-MINUTE expiry (demo)
        gateway.attestCompliance(
            addr4,
            IComplianceGateway.ComplianceAttestation({
                subject: addr4,
                tier: 1,
                maxTransferValue: 500 ether,
                validUntil: block.timestamp + 5 minutes,
                checkId: keccak256(abi.encodePacked(addr4, block.timestamp, "test-4")),
                jurisdictionData: abi.encode("US", "CA", false),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            })
        );
        console.log("Attested addr4 (tier 1, US/CA, 5min!):", addr4);

        vm.stopBroadcast();

        console.log("");
        console.log("=== Test Data Setup Complete ===");
        console.log("4 attestations submitted to gateway:", gatewayAddr);
        console.log("addr4 expires in 5 minutes - use it to demo expiry behavior");
    }
}
