// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {ComplianceToken} from "../src/ComplianceToken.sol";
import {RegulatorView} from "../src/RegulatorView.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";

/// @notice Simulates the full deployment + test-data flow locally and verifies
///         everything works end-to-end — the same checks you'd run post-deploy.
contract DeployVerifyTest is Test {
    ComplianceGateway public gateway;
    ComplianceToken public token;
    RegulatorView public regulatorView;

    address public deployer = address(this);
    address public addr1 = 0xAA00000000000000000000000000000000000001;
    address public addr2 = 0xAA00000000000000000000000000000000000002;
    address public addr3 = 0xBB00000000000000000000000000000000000001;
    address public addr4 = 0xCC00000000000000000000000000000000000001;
    address public nonCompliant = makeAddr("nonCompliant");

    function setUp() public {
        // --- Replicate Deploy.s.sol ---
        gateway = new ComplianceGateway();
        token = new ComplianceToken(
            "Compliant Bridge Token",
            "CBT",
            address(gateway)
        );
        regulatorView = new RegulatorView(address(gateway));

        gateway.setAuthorizedWorkflow(deployer, true);

        token.mint(addr1, 10_000 ether);
        token.mint(addr2, 10_000 ether);
        token.mint(addr3, 10_000 ether);
        token.mint(addr4, 10_000 ether);

        // --- Replicate SetupTestData.s.sol ---
        gateway.attestCompliance(
            addr1,
            IComplianceGateway.ComplianceAttestation({
                subject: addr1,
                tier: 2,
                maxTransferValue: 5000 ether,
                validUntil: block.timestamp + 365 days,
                checkId: keccak256(abi.encodePacked(addr1, block.timestamp, "test-1")),
                jurisdictionData: abi.encode("US", "NY", false),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            })
        );

        gateway.attestCompliance(
            addr2,
            IComplianceGateway.ComplianceAttestation({
                subject: addr2,
                tier: 3,
                maxTransferValue: 50_000 ether,
                validUntil: block.timestamp + 365 days,
                checkId: keccak256(abi.encodePacked(addr2, block.timestamp, "test-2")),
                jurisdictionData: abi.encode("GB", "LDN", false),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            })
        );

        gateway.attestCompliance(
            addr3,
            IComplianceGateway.ComplianceAttestation({
                subject: addr3,
                tier: 1,
                maxTransferValue: 1000 ether,
                validUntil: block.timestamp + 30 days,
                checkId: keccak256(abi.encodePacked(addr3, block.timestamp, "test-3")),
                jurisdictionData: abi.encode("DE", "BER", false),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            })
        );

        gateway.attestCompliance(
            addr4,
            IComplianceGateway.ComplianceAttestation({
                subject: addr4,
                tier: 1,
                maxTransferValue: 500 ether,
                validUntil: block.timestamp + 5 minutes,
                checkId: keccak256(abi.encodePacked(addr4, block.timestamp, "test-4")),
                jurisdictionData: abi.encode("US", "CA", false),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            })
        );
    }

    // ── Post-deploy verification: public status ──────────────────────

    function test_PublicStatusReturnsTrueForAttestedAddress() public view {
        assertTrue(gateway.getPublicStatus(addr1));
        assertTrue(gateway.getPublicStatus(addr2));
        assertTrue(gateway.getPublicStatus(addr3));
        assertTrue(gateway.getPublicStatus(addr4));
    }

    function test_PublicStatusReturnsFalseForNonCompliant() public view {
        assertFalse(gateway.getPublicStatus(nonCompliant));
    }

    // ── Post-deploy verification: full attestation data ──────────────

    function test_GetAttestationReturnsFullData() public view {
        IComplianceGateway.ComplianceAttestation memory att = gateway
            .getAttestation(addr1);

        assertEq(att.subject, addr1);
        assertEq(att.tier, 2);
        assertEq(att.maxTransferValue, 5000 ether);
        assertGt(att.validUntil, block.timestamp);
        assertEq(att.sourceChainId, 11155111);
        assertEq(att.jurisdictionData, abi.encode("US", "NY", false));
    }

    function test_AttestationTiersAreCorrect() public view {
        assertEq(gateway.getAttestation(addr1).tier, 2); // accredited
        assertEq(gateway.getAttestation(addr2).tier, 3); // institutional
        assertEq(gateway.getAttestation(addr3).tier, 1); // basic
        assertEq(gateway.getAttestation(addr4).tier, 1); // basic
    }

    // ── Post-deploy verification: compliant transfer ─────────────────

    function test_TransferBetweenCompliantAddresses() public {
        vm.prank(addr1);
        token.transfer(addr2, 1000 ether);

        assertEq(token.balanceOf(addr1), 9000 ether);
        assertEq(token.balanceOf(addr2), 11_000 ether);
    }

    function test_TransferRespectsTierLimits() public {
        // addr3 has maxTransferValue = 1000 ether
        vm.prank(addr3);
        token.transfer(addr1, 999 ether);
        assertEq(token.balanceOf(addr3), 9001 ether);

        // This should fail — over limit
        vm.prank(addr3);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.TransferLimitExceeded.selector,
                1001 ether,
                1000 ether
            )
        );
        token.transfer(addr1, 1001 ether);
    }

    // ── Post-deploy verification: non-compliant transfer reverts ─────

    function test_TransferToNonCompliantReverts() public {
        vm.prank(addr1);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.ComplianceCheckFailed.selector,
                nonCompliant
            )
        );
        token.transfer(nonCompliant, 100 ether);
    }

    function test_TransferFromNonCompliantReverts() public {
        // Mint to nonCompliant (owner bypass), then try to transfer out
        token.mint(nonCompliant, 1000 ether);

        vm.prank(nonCompliant);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.ComplianceCheckFailed.selector,
                nonCompliant
            )
        );
        token.transfer(addr1, 100 ether);
    }

    // ── Post-deploy verification: expiry demo ────────────────────────

    function test_ShortExpiryAttestationExpires() public {
        // addr4 has 5-minute expiry — should be valid now
        assertTrue(gateway.isCompliant(addr4));

        vm.prank(addr4);
        token.transfer(addr1, 100 ether);
        assertEq(token.balanceOf(addr4), 9900 ether);

        // Warp past 5 minutes
        vm.warp(block.timestamp + 6 minutes);

        assertFalse(gateway.isCompliant(addr4));

        vm.prank(addr4);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.AttestationExpired.selector,
                addr4
            )
        );
        token.transfer(addr1, 100 ether);
    }

    // ── Post-deploy verification: regulator view ─────────────────────

    function test_RegulatorCanViewFullDetails() public {
        regulatorView.setRegulatorRole(deployer, true);

        (
            IComplianceGateway.ComplianceAttestation memory att,
            bool compliant,
            bool revoked
        ) = regulatorView.getFullComplianceDetails(addr1);

        assertEq(att.subject, addr1);
        assertEq(att.tier, 2);
        assertTrue(compliant);
        assertFalse(revoked);
        assertEq(att.jurisdictionData, abi.encode("US", "NY", false));
    }

    // ── Post-deploy verification: token metadata ─────────────────────

    function test_TokenMetadata() public view {
        assertEq(token.name(), "Compliant Bridge Token");
        assertEq(token.symbol(), "CBT");
        assertEq(token.totalSupply(), 40_000 ether); // 4 * 10_000
    }
}
