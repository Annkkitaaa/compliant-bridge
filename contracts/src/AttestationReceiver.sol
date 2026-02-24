// SPDX-License-Identifier: MIT
// Chainlink Integration: CCIP (CCIPReceiver)
// Purpose: Receives cross-chain compliance attestations and revocations via Chainlink CCIP.
//          Extends CCIPReceiver — the CCIP router calls _ccipReceive() after verifying the message.
//          Uses an allowlist of approved source chains and senders for security.
pragma solidity ^0.8.24;

import {CCIPReceiver} from "./ccip/CCIPReceiver.sol";
import {Client} from "./ccip/Client.sol";
import {ComplianceGateway} from "./ComplianceGateway.sol";
import {IComplianceGateway} from "./IComplianceGateway.sol";

/// @title AttestationReceiver
/// @notice Receives cross-chain compliance attestations via Chainlink CCIP
///         and stores them in the local ComplianceGateway.
contract AttestationReceiver is CCIPReceiver {
    /// @dev Must match AttestationSender message type constants.
    uint8 public constant MSG_ATTESTATION = 1;
    uint8 public constant MSG_TOKEN_WITH_ATTESTATION = 2;
    uint8 public constant MSG_REVOCATION = 3;

    ComplianceGateway public immutable gateway;
    address public owner;

    /// @dev Allowlisted source chain => sender address => allowed.
    mapping(uint64 => mapping(address => bool)) public allowlistedSenders;
    /// @dev Allowlisted source chains.
    mapping(uint64 => bool) public allowlistedChains;

    event AttestationReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChain,
        address indexed subject
    );
    event RevocationReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChain,
        address indexed subject,
        string reason
    );

    error OnlyOwner();
    error SourceChainNotAllowed(uint64 sourceChainSelector);
    error SenderNotAllowed(uint64 sourceChainSelector, address sender);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address _router, address _gateway) CCIPReceiver(_router) {
        gateway = ComplianceGateway(_gateway);
        owner = msg.sender;
    }

    // ── Allowlist management ─────────────────────────────────────

    function allowlistChain(
        uint64 chainSelector,
        bool allowed
    ) external onlyOwner {
        allowlistedChains[chainSelector] = allowed;
    }

    function allowlistSender(
        uint64 chainSelector,
        address sender,
        bool allowed
    ) external onlyOwner {
        allowlistedSenders[chainSelector][sender] = allowed;
    }

    // ── CCIP receive handler ─────────────────────────────────────

    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        uint64 sourceChain = message.sourceChainSelector;
        address sender = abi.decode(message.sender, (address));

        if (!allowlistedChains[sourceChain])
            revert SourceChainNotAllowed(sourceChain);
        if (!allowlistedSenders[sourceChain][sender])
            revert SenderNotAllowed(sourceChain, sender);

        (uint8 msgType, bytes memory payload) = abi.decode(
            message.data,
            (uint8, bytes)
        );

        if (msgType == MSG_ATTESTATION || msgType == MSG_TOKEN_WITH_ATTESTATION) {
            _handleAttestation(message.messageId, sourceChain, payload);
        } else if (msgType == MSG_REVOCATION) {
            _handleRevocation(message.messageId, sourceChain, payload);
        }
    }

    function _handleAttestation(
        bytes32 messageId,
        uint64 sourceChain,
        bytes memory payload
    ) internal {
        IComplianceGateway.ComplianceAttestation memory attestation = abi
            .decode(payload, (IComplianceGateway.ComplianceAttestation));

        gateway.receiveRemoteAttestation(attestation, sourceChain);

        emit AttestationReceived(
            messageId,
            sourceChain,
            attestation.subject
        );
    }

    function _handleRevocation(
        bytes32 messageId,
        uint64 sourceChain,
        bytes memory payload
    ) internal {
        (address subject, string memory reason) = abi.decode(
            payload,
            (address, string)
        );

        gateway.receiveRemoteRevocation(subject, reason);

        emit RevocationReceived(messageId, sourceChain, subject, reason);
    }
}
