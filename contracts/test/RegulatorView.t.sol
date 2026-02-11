// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {RegulatorView} from "../src/RegulatorView.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";

contract RegulatorViewTest is Test {
    ComplianceGateway public gateway;
    RegulatorView public regulatorView;

    address public deployer = address(this);
    address public regulator = makeAddr("regulator");
    address public nonRegulator = makeAddr("nonRegulator");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        gateway = new ComplianceGateway();
        regulatorView = new RegulatorView(address(gateway));
    }

    // ── Helpers ──────────────────────────────────────────────────────

    function _attestAddress(
        address subject,
        uint8 tier,
        bytes memory jurisdictionData
    ) internal {
        IComplianceGateway.ComplianceAttestation
            memory att = IComplianceGateway.ComplianceAttestation({
                subject: subject,
                tier: tier,
                maxTransferValue: 1000 ether,
                validUntil: block.timestamp + 365 days,
                checkId: keccak256(
                    abi.encodePacked(subject, block.timestamp)
                ),
                jurisdictionData: jurisdictionData,
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            });
        gateway.attestCompliance(subject, att);
    }

    // ── Role management ──────────────────────────────────────────────

    function test_OwnerCanSetRegulatorRole() public {
        regulatorView.setRegulatorRole(regulator, true);
        assertTrue(regulatorView.hasRegulatorRole(regulator));
    }

    function test_OwnerCanRevokeRegulatorRole() public {
        regulatorView.setRegulatorRole(regulator, true);
        regulatorView.setRegulatorRole(regulator, false);
        assertFalse(regulatorView.hasRegulatorRole(regulator));
    }

    function test_NonOwnerCannotSetRegulatorRole() public {
        vm.prank(nonRegulator);
        vm.expectRevert(RegulatorView.OnlyOwner.selector);
        regulatorView.setRegulatorRole(regulator, true);
    }

    // ── getFullComplianceDetails ─────────────────────────────────────

    function test_RegulatorGetsFullDetails() public {
        regulatorView.setRegulatorRole(regulator, true);
        bytes memory jurisdictionData = abi.encode("US", "NY", true);
        _attestAddress(alice, 2, jurisdictionData);

        vm.prank(regulator);
        (
            IComplianceGateway.ComplianceAttestation memory att,
            bool compliant,
            bool revoked
        ) = regulatorView.getFullComplianceDetails(alice);

        assertEq(att.subject, alice);
        assertEq(att.tier, 2);
        assertEq(att.jurisdictionData, jurisdictionData);
        assertEq(att.maxTransferValue, 1000 ether);
        assertEq(att.sourceChainId, 11155111);
        assertTrue(compliant);
        assertFalse(revoked);
    }

    function test_RegulatorSeesRevokedStatus() public {
        regulatorView.setRegulatorRole(regulator, true);
        _attestAddress(alice, 1, abi.encode("US"));

        gateway.revokeAttestation(alice, "Suspicious");

        vm.prank(regulator);
        (
            IComplianceGateway.ComplianceAttestation memory att,
            bool compliant,
            bool revoked
        ) = regulatorView.getFullComplianceDetails(alice);

        assertEq(att.subject, alice);
        assertFalse(compliant);
        assertTrue(revoked);
    }

    function test_OwnerCanCallRegulatorFunctions() public {
        _attestAddress(alice, 1, abi.encode("US"));

        // Owner (deployer) should be able to call without explicit role
        (
            IComplianceGateway.ComplianceAttestation memory att,
            bool compliant,
            bool revoked
        ) = regulatorView.getFullComplianceDetails(alice);

        assertEq(att.subject, alice);
        assertTrue(compliant);
        assertFalse(revoked);
    }

    function test_NonRegulatorCannotGetFullDetails() public {
        _attestAddress(alice, 1, abi.encode("US"));

        vm.prank(nonRegulator);
        vm.expectRevert(RegulatorView.OnlyRegulator.selector);
        regulatorView.getFullComplianceDetails(alice);
    }

    // ── Transfer history ─────────────────────────────────────────────

    function test_RecordAndRetrieveTransferHistory() public {
        regulatorView.setRegulatorRole(regulator, true);

        regulatorView.recordTransfer(alice, bob, 100 ether);
        regulatorView.recordTransfer(alice, bob, 200 ether);

        vm.prank(regulator);
        RegulatorView.TransferRecord[] memory aliceHistory = regulatorView
            .getTransferHistory(alice);

        assertEq(aliceHistory.length, 2);
        assertEq(aliceHistory[0].from, alice);
        assertEq(aliceHistory[0].to, bob);
        assertEq(aliceHistory[0].amount, 100 ether);
        assertEq(aliceHistory[1].amount, 200 ether);
    }

    function test_TransferHistoryRecordedForBothParties() public {
        regulatorView.setRegulatorRole(regulator, true);

        regulatorView.recordTransfer(alice, bob, 500 ether);

        vm.startPrank(regulator);
        RegulatorView.TransferRecord[] memory aliceHistory = regulatorView
            .getTransferHistory(alice);
        RegulatorView.TransferRecord[] memory bobHistory = regulatorView
            .getTransferHistory(bob);
        vm.stopPrank();

        assertEq(aliceHistory.length, 1);
        assertEq(bobHistory.length, 1);
        assertEq(aliceHistory[0].amount, 500 ether);
        assertEq(bobHistory[0].amount, 500 ether);
    }

    function test_TransferCount() public {
        regulatorView.setRegulatorRole(regulator, true);

        regulatorView.recordTransfer(alice, bob, 100 ether);
        regulatorView.recordTransfer(alice, bob, 200 ether);
        regulatorView.recordTransfer(bob, alice, 50 ether);

        vm.startPrank(regulator);
        // Alice: 2 as sender + 1 as receiver = 3
        assertEq(regulatorView.getTransferCount(alice), 3);
        // Bob: 1 as sender + 2 as receiver = 3
        assertEq(regulatorView.getTransferCount(bob), 3);
        vm.stopPrank();
    }

    function test_NonRegulatorCannotGetTransferHistory() public {
        regulatorView.recordTransfer(alice, bob, 100 ether);

        vm.prank(nonRegulator);
        vm.expectRevert(RegulatorView.OnlyRegulator.selector);
        regulatorView.getTransferHistory(alice);
    }

    function test_NonRegulatorCannotGetTransferCount() public {
        regulatorView.recordTransfer(alice, bob, 100 ether);

        vm.prank(nonRegulator);
        vm.expectRevert(RegulatorView.OnlyRegulator.selector);
        regulatorView.getTransferCount(alice);
    }

    function test_EmptyHistoryForUnknownAddress() public {
        regulatorView.setRegulatorRole(regulator, true);

        vm.prank(regulator);
        RegulatorView.TransferRecord[] memory history = regulatorView
            .getTransferHistory(alice);

        assertEq(history.length, 0);
    }
}
