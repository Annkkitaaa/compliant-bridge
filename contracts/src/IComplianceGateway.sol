// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IComplianceGateway {
    struct ComplianceAttestation {
        address subject;
        uint8 tier; // 1 = basic, 2 = accredited, 3 = institutional
        uint256 maxTransferValue;
        uint256 validUntil;
        bytes32 checkId;
        bytes jurisdictionData;
        uint256 issuedAt;
        uint256 sourceChainId;
    }

    event ComplianceAttested(
        address indexed subject,
        uint8 tier,
        uint256 validUntil,
        uint256 sourceChainId
    );

    event AttestationRevoked(
        address indexed subject,
        bytes32 checkId,
        string reason
    );

    function attestCompliance(
        address subject,
        ComplianceAttestation calldata attestation
    ) external;

    function getAttestation(
        address subject
    ) external view returns (ComplianceAttestation memory);

    function isCompliant(address subject) external view returns (bool);

    function isAttestationValid(address subject) external view returns (bool);
}
