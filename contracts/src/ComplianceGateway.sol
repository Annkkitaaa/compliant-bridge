// SPDX-License-Identifier: MIT
// Chainlink Integration: CRE EVMClient (attestation destination) | CCIP (cross-chain receiver target)
// Purpose: Central attestation store that accepts compliance data from two Chainlink sources:
//          (1) CRE DON-signed reports via ComplianceConsumer.onReport() → attestCompliance()
//          (2) CCIP cross-chain messages via AttestationReceiver._ccipReceive() → receiveRemoteAttestation()
//          Only Chainlink-authorized sources (workflow/receiver addresses) can write attestations.
pragma solidity ^0.8.24;

import {IComplianceGateway} from "./IComplianceGateway.sol";

contract ComplianceGateway is IComplianceGateway {
    address public owner;

    mapping(address => ComplianceAttestation) private _attestations;
    mapping(address => bool) private _revoked;
    mapping(address => bool) public authorizedWorkflows;
    mapping(address => bool) public authorizedReceivers;
    mapping(address => bool) public isRemoteAttestation;

    error Unauthorized();
    error OnlyOwner();
    error ZeroAddress();
    error OnlyReceiver();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedWorkflows[msg.sender] && msg.sender != owner)
            revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setAuthorizedWorkflow(
        address workflow,
        bool authorized
    ) external onlyOwner {
        if (workflow == address(0)) revert ZeroAddress();
        authorizedWorkflows[workflow] = authorized;
    }

    function attestCompliance(
        address subject,
        ComplianceAttestation calldata attestation
    ) external onlyAuthorized {
        if (subject == address(0)) revert ZeroAddress();

        _attestations[subject] = attestation;
        _revoked[subject] = false;

        emit ComplianceAttested(
            subject,
            attestation.tier,
            attestation.validUntil,
            attestation.sourceChainId
        );
    }

    function revokeAttestation(
        address subject,
        string calldata reason
    ) external onlyAuthorized {
        bytes32 checkId = _attestations[subject].checkId;
        _revoked[subject] = true;

        emit AttestationRevoked(subject, checkId, reason);
    }

    function isCompliant(address subject) external view returns (bool) {
        return _hasAttestation(subject) && !_revoked[subject] && !_isExpired(subject);
    }

    function isAttestationValid(address subject) external view returns (bool) {
        return _hasAttestation(subject) && !_revoked[subject] && !_isExpired(subject);
    }

    function getAttestation(
        address subject
    ) external view returns (ComplianceAttestation memory) {
        return _attestations[subject];
    }

    function getPublicStatus(address subject) external view returns (bool compliant) {
        return _hasAttestation(subject) && !_revoked[subject] && !_isExpired(subject);
    }

    function isRevoked(address subject) external view returns (bool) {
        return _revoked[subject];
    }

    function isCompliantWithTier(address subject, uint8 requiredTier) external view returns (bool) {
        return _hasAttestation(subject) && !_revoked[subject] && !_isExpired(subject)
               && _attestations[subject].tier >= requiredTier;
    }

    function getComplianceTier(address subject) external view returns (uint8) {
        if (!_hasAttestation(subject) || _revoked[subject] || _isExpired(subject)) return 0;
        return _attestations[subject].tier;
    }

    // ── Cross-chain support ────────────────────────────────────────

    function setAuthorizedReceiver(
        address receiver,
        bool authorized
    ) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        authorizedReceivers[receiver] = authorized;
    }

    function receiveRemoteAttestation(
        ComplianceAttestation calldata attestation,
        uint64 sourceChain
    ) external {
        if (!authorizedReceivers[msg.sender]) revert OnlyReceiver();
        address subject = attestation.subject;
        if (subject == address(0)) revert ZeroAddress();

        ComplianceAttestation memory stored = attestation;
        stored.sourceChainId = sourceChain;

        _attestations[subject] = stored;
        _revoked[subject] = false;
        isRemoteAttestation[subject] = true;

        emit ComplianceAttested(
            subject,
            stored.tier,
            stored.validUntil,
            sourceChain
        );
    }

    function receiveRemoteRevocation(
        address subject,
        string calldata reason
    ) external {
        if (!authorizedReceivers[msg.sender]) revert OnlyReceiver();

        bytes32 checkId = _attestations[subject].checkId;
        _revoked[subject] = true;

        emit AttestationRevoked(subject, checkId, reason);
    }

    // ── Internal helpers ─────────────────────────────────────────

    function _hasAttestation(address subject) internal view returns (bool) {
        return _attestations[subject].issuedAt != 0;
    }

    function _isExpired(address subject) internal view returns (bool) {
        return block.timestamp > _attestations[subject].validUntil;
    }
}
