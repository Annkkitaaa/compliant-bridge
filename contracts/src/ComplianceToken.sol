// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ComplianceGateway} from "./ComplianceGateway.sol";
import {IComplianceGateway} from "./IComplianceGateway.sol";

contract ComplianceToken is ERC20 {
    ComplianceGateway public immutable gateway;
    address public owner;
    bool public paused;

    error OnlyOwner();
    error TransfersPaused();
    error ComplianceCheckFailed(address account);
    error TransferLimitExceeded(uint256 amount, uint256 maxAllowed);
    error AttestationExpired(address account);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address gatewayAddress
    ) ERC20(name, symbol) {
        gateway = ComplianceGateway(gatewayAddress);
        owner = msg.sender;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        if (paused && from != address(0)) revert TransfersPaused();

        // Bypass compliance for minting (from == address(0))
        if (from != address(0)) {
            // Check sender compliance
            if (!gateway.isCompliant(from)) {
                IComplianceGateway.ComplianceAttestation memory att = gateway
                    .getAttestation(from);
                if (att.issuedAt != 0 && block.timestamp > att.validUntil) {
                    revert AttestationExpired(from);
                }
                revert ComplianceCheckFailed(from);
            }

            // Check receiver compliance (skip for burns to address(0))
            if (to != address(0)) {
                if (!gateway.isCompliant(to)) {
                    IComplianceGateway.ComplianceAttestation memory att = gateway
                        .getAttestation(to);
                    if (att.issuedAt != 0 && block.timestamp > att.validUntil) {
                        revert AttestationExpired(to);
                    }
                    revert ComplianceCheckFailed(to);
                }
            }

            // Check transfer limit
            IComplianceGateway.ComplianceAttestation memory senderAtt = gateway
                .getAttestation(from);
            if (value > senderAtt.maxTransferValue) {
                revert TransferLimitExceeded(value, senderAtt.maxTransferValue);
            }
        }

        super._update(from, to, value);
    }
}
