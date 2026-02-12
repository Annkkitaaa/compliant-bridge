// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {ComplianceToken} from "../src/ComplianceToken.sol";
import {RegulatorView} from "../src/RegulatorView.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Test addresses to receive initial tokens
        address testAddr1 = 0xAA00000000000000000000000000000000000001;
        address testAddr2 = 0xAa00000000000000000000000000000000000002;
        address testAddr3 = 0xBb00000000000000000000000000000000000001;
        address testAddr4 = 0xcC00000000000000000000000000000000000001;

        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ComplianceGateway
        ComplianceGateway gateway = new ComplianceGateway();
        console.log("ComplianceGateway deployed at:", address(gateway));

        // 2. Deploy ComplianceToken
        ComplianceToken token = new ComplianceToken(
            "Compliant Bridge Token",
            "CBT",
            address(gateway)
        );
        console.log("ComplianceToken deployed at:", address(token));

        // 3. Deploy RegulatorView
        RegulatorView regulatorView = new RegulatorView(address(gateway));
        console.log("RegulatorView deployed at:", address(regulatorView));

        // 4. Authorize deployer as a workflow (for test data setup)
        gateway.setAuthorizedWorkflow(deployer, true);
        console.log("Authorized deployer as workflow:", deployer);

        // 5. Mint test tokens
        uint256 mintAmount = 10_000 ether;
        token.mint(testAddr1, mintAmount);
        token.mint(testAddr2, mintAmount);
        token.mint(testAddr3, mintAmount);
        token.mint(testAddr4, mintAmount);
        console.log("Minted", mintAmount / 1 ether, "CBT to 4 test addresses");

        vm.stopBroadcast();

        // Summary
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("ComplianceGateway:", address(gateway));
        console.log("ComplianceToken:  ", address(token));
        console.log("RegulatorView:    ", address(regulatorView));
        console.log("");
        console.log("Next step: Run SetupTestData script to submit attestations");
        console.log("  forge script script/SetupTestData.s.sol --rpc-url sepolia --broadcast");
    }
}
