// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Chainlink CCIP Client library — message types for cross-chain communication.
/// @dev Mirrors the official @chainlink/contracts-ccip Client.sol interface.
library Client {
    /// @dev Outbound cross-chain message struct.
    struct EVM2AnyMessage {
        bytes receiver; // abi.encode(receiverAddress) for EVM destinations
        bytes data; // arbitrary data payload
        EVMTokenAmount[] tokenAmounts; // tokens to transfer
        address feeToken; // address(0) for native, or LINK token address
        bytes extraArgs; // e.g., gas limit for destination execution
    }

    /// @dev Inbound cross-chain message struct.
    struct Any2EVMMessage {
        bytes32 messageId; // unique CCIP message identifier
        uint64 sourceChainSelector; // source chain selector
        bytes sender; // abi.encode(senderAddress) on source chain
        bytes data; // decoded data payload
        EVMTokenAmount[] destTokenAmounts; // tokens received
    }

    /// @dev Token amount struct for cross-chain token transfers.
    struct EVMTokenAmount {
        address token; // token address (on local chain)
        uint256 amount; // amount of tokens
    }

    /// @dev Encodes extra args with gas limit for destination execution.
    /// @param gasLimit The gas limit for destination chain execution.
    /// @return Encoded extra args.
    function _argsToBytes(
        uint256 gasLimit
    ) internal pure returns (bytes memory) {
        return abi.encode(gasLimit);
    }
}
