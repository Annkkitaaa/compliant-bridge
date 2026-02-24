// SPDX-License-Identifier: MIT
// Chainlink Integration: CCIP (IRouterClient interface)
// Purpose: Local copy of the official Chainlink CCIP IRouterClient interface.
//          Used by AttestationSender and AttestationInvalidator to call getFee() and ccipSend().
pragma solidity ^0.8.24;

import {Client} from "./Client.sol";

/// @notice Chainlink CCIP Router interface for sending cross-chain messages.
/// @dev Mirrors the official @chainlink/contracts-ccip IRouterClient.sol interface.
interface IRouterClient {
    error UnsupportedDestinationChain(uint64 destChainSelector);
    error InsufficientFeeTokenAmount();

    /// @notice Checks if a chain is supported by CCIP.
    function isChainSupported(
        uint64 destChainSelector
    ) external view returns (bool supported);

    /// @notice Gets the fee for sending a message to a destination chain.
    function getFee(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) external view returns (uint256 fee);

    /// @notice Sends a cross-chain message and returns the message ID.
    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable returns (bytes32);
}
