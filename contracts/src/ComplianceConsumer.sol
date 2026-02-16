// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IComplianceGateway} from "./IComplianceGateway.sol";

/// @title ComplianceConsumer
/// @notice CRE report receiver that decodes compliance attestation data
///         and forwards it to the ComplianceGateway contract.
///         Implements the IReceiver interface for Chainlink CRE report delivery.
contract ComplianceConsumer {
    IComplianceGateway public immutable gateway;
    address public forwarder;
    address public owner;

    event AttestationReceived(
        address indexed subject,
        uint8 tier,
        uint256 maxTransferValue,
        uint256 validUntil
    );

    error OnlyOwner();
    error OnlyForwarder();
    error ZeroAddress();
    error AttestationFailed(address subject);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyForwarder() {
        if (msg.sender != forwarder) revert OnlyForwarder();
        _;
    }

    constructor(address _gateway, address _forwarder) {
        if (_gateway == address(0)) revert ZeroAddress();
        gateway = IComplianceGateway(_gateway);
        forwarder = _forwarder;
        owner = msg.sender;
    }

    /// @notice Called by the Chainlink Forwarder to deliver a signed CRE report.
    /// @param report ABI-encoded attestation data matching the inner call payload.
    function onReport(bytes calldata /* metadata */, bytes calldata report) external onlyForwarder {
        // Decode the attestation fields from the report payload.
        // The report contains ABI-encoded: (address subject, uint8 tier, uint256 maxTransferValue,
        //   uint256 validUntil, bytes32 checkId, bytes jurisdictionData, uint256 issuedAt, uint256 sourceChainId)
        (
            address subject,
            uint8 tier,
            uint256 maxTransferValue,
            uint256 validUntil,
            bytes32 checkId,
            bytes memory jurisdictionData,
            uint256 issuedAt,
            uint256 sourceChainId
        ) = abi.decode(report, (address, uint8, uint256, uint256, bytes32, bytes, uint256, uint256));

        IComplianceGateway.ComplianceAttestation memory attestation = IComplianceGateway
            .ComplianceAttestation({
                subject: subject,
                tier: tier,
                maxTransferValue: maxTransferValue,
                validUntil: validUntil,
                checkId: checkId,
                jurisdictionData: jurisdictionData,
                issuedAt: issuedAt,
                sourceChainId: sourceChainId
            });

        gateway.attestCompliance(subject, attestation);

        emit AttestationReceived(subject, tier, maxTransferValue, validUntil);
    }

    /// @notice Update the forwarder address (e.g. if Chainlink deploys a new one).
    function setForwarder(address _forwarder) external onlyOwner {
        forwarder = _forwarder;
    }

    /// @notice ERC-165 interface support for IReceiver.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // IReceiver interface ID = bytes4(keccak256("onReport(bytes,bytes)"))
        return interfaceId == 0xe3401711 || interfaceId == 0x01ffc9a7; // IReceiver || ERC165
    }
}
