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

    /// @dev EVMExtraArgsV1 tag required by the CCIP router (0x97a657c9).
    bytes4 private constant EVM_EXTRA_ARGS_V1_TAG = 0x97a657c9;

    /// @dev Encodes extra args with gas limit for destination execution.
    ///      Format: bytes4(EVM_EXTRA_ARGS_V1_TAG) || abi.encode(gasLimit)
    /// @param gasLimit The gas limit for destination chain execution.
    /// @return Encoded extra args.
    function _argsToBytes(
        uint256 gasLimit
    ) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(EVM_EXTRA_ARGS_V1_TAG, gasLimit);
    }
}
