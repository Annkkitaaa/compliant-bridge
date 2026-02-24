// SPDX-License-Identifier: MIT
// Chainlink Integration: CCIP (CCIPReceiver base contract)
// Purpose: Local copy of the official Chainlink CCIPReceiver base. AttestationReceiver extends
//          this to receive cross-chain messages. The router address is set in the constructor
//          and validated on every incoming message via the ccipReceive() entry point.
pragma solidity ^0.8.24;

import {Client} from "./Client.sol";
import {IRouterClient} from "./IRouterClient.sol";

/// @notice Chainlink CCIP Receiver base contract.
/// @dev Mirrors the official @chainlink/contracts-ccip CCIPReceiver.sol.
///      Contracts that want to receive CCIP messages must inherit this and
///      implement _ccipReceive().
abstract contract CCIPReceiver {
    address internal immutable i_ccipRouter;

    error InvalidRouter(address router);

    constructor(address router) {
        if (router == address(0)) revert InvalidRouter(address(0));
        i_ccipRouter = router;
    }

    /// @notice Entry point called by the CCIP Router.
    /// @dev Only the router can call this function.
    function ccipReceive(
        Client.Any2EVMMessage calldata message
    ) external virtual {
        if (msg.sender != i_ccipRouter) revert InvalidRouter(msg.sender);
        _ccipReceive(message);
    }

    /// @notice Override this to handle inbound CCIP messages.
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal virtual;

    /// @notice Returns the CCIP router address.
    function getRouter() public view returns (address) {
        return i_ccipRouter;
    }

    /// @notice CCIP receiver supports the IAny2EVMMessageReceiver interface.
    function supportsInterface(
        bytes4 interfaceId
    ) public pure virtual returns (bool) {
        return
            interfaceId == type(CCIPReceiver).interfaceId ||
            interfaceId == 0x01ffc9a7; // ERC165
    }
}
