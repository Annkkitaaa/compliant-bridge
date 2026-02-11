// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ComplianceGateway} from "./ComplianceGateway.sol";
import {IComplianceGateway} from "./IComplianceGateway.sol";

contract RegulatorView {
    struct TransferRecord {
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        uint256 blockNumber;
    }

    ComplianceGateway public immutable gateway;
    address public owner;

    mapping(address => bool) public hasRegulatorRole;

    // Transfer history per address (both as sender and receiver)
    mapping(address => TransferRecord[]) private _transferHistory;

    error OnlyOwner();
    error OnlyRegulator();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyRegulator() {
        if (!hasRegulatorRole[msg.sender] && msg.sender != owner)
            revert OnlyRegulator();
        _;
    }

    constructor(address gatewayAddress) {
        gateway = ComplianceGateway(gatewayAddress);
        owner = msg.sender;
    }

    function setRegulatorRole(
        address regulator,
        bool authorized
    ) external onlyOwner {
        hasRegulatorRole[regulator] = authorized;
    }

    function getFullComplianceDetails(
        address subject
    )
        external
        view
        onlyRegulator
        returns (
            IComplianceGateway.ComplianceAttestation memory attestation,
            bool compliant,
            bool revoked
        )
    {
        attestation = gateway.getAttestation(subject);
        compliant = gateway.isCompliant(subject);
        revoked = gateway.isRevoked(subject);
    }

    function recordTransfer(
        address from,
        address to,
        uint256 amount
    ) external {
        TransferRecord memory record = TransferRecord({
            from: from,
            to: to,
            amount: amount,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        _transferHistory[from].push(record);
        _transferHistory[to].push(record);
    }

    function getTransferHistory(
        address subject
    ) external view onlyRegulator returns (TransferRecord[] memory) {
        return _transferHistory[subject];
    }

    function getTransferCount(
        address subject
    ) external view onlyRegulator returns (uint256) {
        return _transferHistory[subject].length;
    }
}
