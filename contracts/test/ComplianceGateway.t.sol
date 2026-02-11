// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";

contract ComplianceGatewayTest is Test {
    ComplianceGateway public gateway;

    address public deployer = address(this);
    address public workflow = makeAddr("workflow");
    address public unauthorized = makeAddr("unauthorized");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

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

    function setUp() public {
        gateway = new ComplianceGateway();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    function _makeAttestation(
        address subject,
        uint8 tier,
        uint256 maxTransfer,
        uint256 validUntil
    ) internal view returns (IComplianceGateway.ComplianceAttestation memory) {
        return
            IComplianceGateway.ComplianceAttestation({
                subject: subject,
                tier: tier,
                maxTransferValue: maxTransfer,
                validUntil: validUntil,
                checkId: keccak256(abi.encodePacked(subject, block.timestamp)),
                jurisdictionData: abi.encode("US"),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            });
    }

    // ── Deployment ───────────────────────────────────────────────────

    function test_DeploymentSetsOwner() public view {
        assertEq(gateway.owner(), deployer);
    }

    // ── Authorization ────────────────────────────────────────────────

    function test_OwnerCanAuthorizeWorkflow() public {
        gateway.setAuthorizedWorkflow(workflow, true);
        assertTrue(gateway.authorizedWorkflows(workflow));
    }

    function test_OwnerCanDeauthorizeWorkflow() public {
        gateway.setAuthorizedWorkflow(workflow, true);
        gateway.setAuthorizedWorkflow(workflow, false);
        assertFalse(gateway.authorizedWorkflows(workflow));
    }

    function test_NonOwnerCannotAuthorizeWorkflow() public {
        vm.prank(unauthorized);
        vm.expectRevert(ComplianceGateway.OnlyOwner.selector);
        gateway.setAuthorizedWorkflow(workflow, true);
    }

    function test_CannotAuthorizeZeroAddress() public {
        vm.expectRevert(ComplianceGateway.ZeroAddress.selector);
        gateway.setAuthorizedWorkflow(address(0), true);
    }

    // ── Attestation submission ───────────────────────────────────────

    function test_AuthorizedWorkflowCanSubmitAttestation() public {
        gateway.setAuthorizedWorkflow(workflow, true);

        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            2,
            1000 ether,
            block.timestamp + 365 days
        );

        vm.prank(workflow);
        gateway.attestCompliance(alice, att);

        IComplianceGateway.ComplianceAttestation memory stored = gateway
            .getAttestation(alice);
        assertEq(stored.subject, alice);
        assertEq(stored.tier, 2);
        assertEq(stored.maxTransferValue, 1000 ether);
        assertEq(stored.sourceChainId, 11155111);
    }

    function test_OwnerCanSubmitAttestationDirectly() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 30 days
        );

        gateway.attestCompliance(alice, att);

        assertTrue(gateway.isCompliant(alice));
    }

    function test_UnauthorizedCannotSubmitAttestation() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 30 days
        );

        vm.prank(unauthorized);
        vm.expectRevert(ComplianceGateway.Unauthorized.selector);
        gateway.attestCompliance(alice, att);
    }

    function test_CannotAttestForZeroAddress() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            address(0),
            1,
            500 ether,
            block.timestamp + 30 days
        );

        vm.expectRevert(ComplianceGateway.ZeroAddress.selector);
        gateway.attestCompliance(address(0), att);
    }

    function test_AttestEmitsEvent() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            3,
            5000 ether,
            block.timestamp + 180 days
        );

        vm.expectEmit(true, false, false, true);
        emit ComplianceAttested(alice, 3, block.timestamp + 180 days, 11155111);

        gateway.attestCompliance(alice, att);
    }

    // ── Attestation retrieval ────────────────────────────────────────

    function test_GetAttestationReturnsCorrectData() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            2,
            1000 ether,
            block.timestamp + 365 days
        );

        gateway.attestCompliance(alice, att);

        IComplianceGateway.ComplianceAttestation memory stored = gateway
            .getAttestation(alice);
        assertEq(stored.subject, alice);
        assertEq(stored.tier, 2);
        assertEq(stored.maxTransferValue, 1000 ether);
        assertEq(stored.validUntil, block.timestamp + 365 days);
        assertEq(stored.issuedAt, block.timestamp);
        assertEq(
            stored.jurisdictionData,
            abi.encode("US")
        );
    }

    function test_GetAttestationReturnsEmptyForUnknownAddress() public view {
        IComplianceGateway.ComplianceAttestation memory stored = gateway
            .getAttestation(alice);
        assertEq(stored.issuedAt, 0);
        assertEq(stored.subject, address(0));
    }

    // ── Public status ────────────────────────────────────────────────

    function test_PublicStatusReturnsTrueForValidAttestation() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 365 days
        );
        gateway.attestCompliance(alice, att);

        assertTrue(gateway.getPublicStatus(alice));
    }

    function test_PublicStatusReturnsFalseForNoAttestation() public view {
        assertFalse(gateway.getPublicStatus(alice));
    }

    // ── Compliance check ─────────────────────────────────────────────

    function test_IsCompliantTrueForValidAttestation() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 365 days
        );
        gateway.attestCompliance(alice, att);

        assertTrue(gateway.isCompliant(alice));
        assertTrue(gateway.isAttestationValid(alice));
    }

    function test_IsCompliantFalseForNoAttestation() public view {
        assertFalse(gateway.isCompliant(alice));
        assertFalse(gateway.isAttestationValid(alice));
    }

    // ── Expiry ───────────────────────────────────────────────────────

    function test_IsCompliantFalseAfterExpiry() public {
        uint256 validUntil = block.timestamp + 30 days;
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            500 ether,
            validUntil
        );
        gateway.attestCompliance(alice, att);

        assertTrue(gateway.isCompliant(alice));

        // Warp past expiry
        vm.warp(validUntil + 1);

        assertFalse(gateway.isCompliant(alice));
        assertFalse(gateway.isAttestationValid(alice));
        assertFalse(gateway.getPublicStatus(alice));
    }

    // ── Revocation ───────────────────────────────────────────────────

    function test_OwnerCanRevokeAttestation() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 365 days
        );
        gateway.attestCompliance(alice, att);
        assertTrue(gateway.isCompliant(alice));

        gateway.revokeAttestation(alice, "Suspicious activity");

        assertFalse(gateway.isCompliant(alice));
        assertTrue(gateway.isRevoked(alice));
    }

    function test_AuthorizedWorkflowCanRevoke() public {
        gateway.setAuthorizedWorkflow(workflow, true);

        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 365 days
        );
        gateway.attestCompliance(alice, att);

        vm.prank(workflow);
        gateway.revokeAttestation(alice, "Workflow-triggered revocation");

        assertFalse(gateway.isCompliant(alice));
    }

    function test_UnauthorizedCannotRevoke() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 365 days
        );
        gateway.attestCompliance(alice, att);

        vm.prank(unauthorized);
        vm.expectRevert(ComplianceGateway.Unauthorized.selector);
        gateway.revokeAttestation(alice, "Should fail");
    }

    function test_RevokeEmitsEvent() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 365 days
        );
        gateway.attestCompliance(alice, att);

        vm.expectEmit(true, false, false, true);
        emit AttestationRevoked(alice, att.checkId, "Bad actor");

        gateway.revokeAttestation(alice, "Bad actor");
    }

    // ── Re-attestation ───────────────────────────────────────────────

    function test_ReAttestationOverwritesOld() public {
        IComplianceGateway.ComplianceAttestation memory att1 = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 30 days
        );
        gateway.attestCompliance(alice, att1);

        assertEq(gateway.getAttestation(alice).tier, 1);
        assertEq(gateway.getAttestation(alice).maxTransferValue, 500 ether);

        // Overwrite with upgraded attestation
        IComplianceGateway.ComplianceAttestation memory att2 = _makeAttestation(
            alice,
            3,
            10000 ether,
            block.timestamp + 365 days
        );
        gateway.attestCompliance(alice, att2);

        assertEq(gateway.getAttestation(alice).tier, 3);
        assertEq(gateway.getAttestation(alice).maxTransferValue, 10000 ether);
    }

    function test_ReAttestationClearsRevocation() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 365 days
        );
        gateway.attestCompliance(alice, att);
        gateway.revokeAttestation(alice, "Revoked");

        assertFalse(gateway.isCompliant(alice));
        assertTrue(gateway.isRevoked(alice));

        // Re-attest clears revocation
        gateway.attestCompliance(alice, att);

        assertTrue(gateway.isCompliant(alice));
        assertFalse(gateway.isRevoked(alice));
    }

    // ── Multiple addresses ───────────────────────────────────────────

    function test_IndependentAttestationsPerAddress() public {
        IComplianceGateway.ComplianceAttestation memory attAlice = _makeAttestation(
            alice,
            1,
            500 ether,
            block.timestamp + 30 days
        );
        IComplianceGateway.ComplianceAttestation memory attBob = _makeAttestation(
            bob,
            3,
            10000 ether,
            block.timestamp + 365 days
        );

        gateway.attestCompliance(alice, attAlice);
        gateway.attestCompliance(bob, attBob);

        assertEq(gateway.getAttestation(alice).tier, 1);
        assertEq(gateway.getAttestation(bob).tier, 3);

        // Revoke alice — bob unaffected
        gateway.revokeAttestation(alice, "Revoked alice");

        assertFalse(gateway.isCompliant(alice));
        assertTrue(gateway.isCompliant(bob));
    }
}
