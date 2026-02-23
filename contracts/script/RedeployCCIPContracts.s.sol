// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AttestationSender} from "../src/AttestationSender.sol";
import {AttestationInvalidator} from "../src/AttestationInvalidator.sol";

/// @title RedeployCCIPContracts
/// @notice Redeploys AttestationSender and AttestationInvalidator with the
///         corrected Client._argsToBytes() (EVMExtraArgsV1Tag = 0x97a657c9).
///         Run this on Sepolia after fixing Client.sol.
///
///   Usage:
///     forge script script/RedeployCCIPContracts.s.sol \
///       --rpc-url $SEPOLIA_RPC_URL --broadcast --verify -vvvv
contract RedeployCCIPContracts is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address router  = vm.envAddress("CCIP_ROUTER_SEPOLIA");
        address link    = vm.envAddress("LINK_TOKEN_SEPOLIA");
        address gateway = vm.envAddress("SRC_GATEWAY_ADDRESS");

        console.log("=== Redeploying CCIP Contracts (extraArgs fix) ===");
        console.log("Deployer: ", deployer);
        console.log("Router:   ", router);
        console.log("LINK:     ", link);
        console.log("Gateway:  ", gateway);
        console.log("");

        vm.startBroadcast(pk);

        AttestationSender sender = new AttestationSender(router, link);
        console.log("AttestationSender:     ", address(sender));

        AttestationInvalidator invalidator = new AttestationInvalidator(
            router,
            link,
            gateway
        );
        console.log("AttestationInvalidator:", address(invalidator));

        // Authorize deployer as sender on the new AttestationSender
        sender.setAuthorizedSender(deployer, true);
        console.log("Deployer authorized as sender");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Action Required ===");
        console.log("1. Update .env:");
        console.log("   SENDER_ADDRESS=", address(sender));
        console.log("   SRC_INVALIDATOR_ADDRESS=", address(invalidator));
        console.log("2. Run: make reconfigure-ccip-dest");
        console.log("3. Run: make bridge-attestation");
    }
}
