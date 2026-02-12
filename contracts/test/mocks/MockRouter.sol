// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRouterClient} from "../../src/ccip/IRouterClient.sol";
import {Client} from "../../src/ccip/Client.sol";

/// @notice Mock CCIP Router for testing. Records sent messages and returns
///         deterministic message IDs.
contract MockRouter is IRouterClient {
    uint256 public constant MOCK_FEE = 0.01 ether;
    uint256 public messageCount;

    struct SentMessage {
        uint64 destinationChainSelector;
        bytes receiver;
        bytes data;
        uint256 tokenAmountsLength;
        uint256 fee;
    }

    SentMessage[] public sentMessages;

    function isChainSupported(uint64) external pure returns (bool) {
        return true;
    }

    function getFee(
        uint64,
        Client.EVM2AnyMessage memory
    ) external pure returns (uint256) {
        return MOCK_FEE;
    }

    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable returns (bytes32) {
        messageCount++;
        bytes32 messageId = keccak256(
            abi.encodePacked(block.timestamp, messageCount)
        );

        sentMessages.push(
            SentMessage({
                destinationChainSelector: destinationChainSelector,
                receiver: message.receiver,
                data: message.data,
                tokenAmountsLength: message.tokenAmounts.length,
                fee: msg.value
            })
        );

        return messageId;
    }

    function getSentMessage(
        uint256 index
    ) external view returns (SentMessage memory) {
        return sentMessages[index];
    }

    function getSentMessageCount() external view returns (uint256) {
        return sentMessages.length;
    }
}
