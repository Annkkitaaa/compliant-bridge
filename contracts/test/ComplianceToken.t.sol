// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {ComplianceToken} from "../src/ComplianceToken.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";

contract ComplianceTokenTest is Test {
    ComplianceGateway public gateway;
    ComplianceToken public token;

    address public deployer = address(this);
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    function setUp() public {
        gateway = new ComplianceGateway();
        token = new ComplianceToken("Compliant Token", "CMPL", address(gateway));
    }

    // ── Helpers ──────────────────────────────────────────────────────

    function _attestAddress(
        address subject,
        uint256 maxTransfer,
        uint256 validUntil
    ) internal {
        IComplianceGateway.ComplianceAttestation
            memory att = IComplianceGateway.ComplianceAttestation({
                subject: subject,
                tier: 2,
                maxTransferValue: maxTransfer,
                validUntil: validUntil,
                checkId: keccak256(
                    abi.encodePacked(subject, block.timestamp)
                ),
                jurisdictionData: abi.encode("US"),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            });
        gateway.attestCompliance(subject, att);
    }

    // ── Deployment ───────────────────────────────────────────────────

    function test_DeploymentSetsNameAndSymbol() public view {
        assertEq(token.name(), "Compliant Token");
        assertEq(token.symbol(), "CMPL");
    }

    function test_DeploymentSetsGateway() public view {
        assertEq(address(token.gateway()), address(gateway));
    }

    function test_DeploymentSetsOwner() public view {
        assertEq(token.owner(), deployer);
    }

    // ── Minting ──────────────────────────────────────────────────────

    function test_OwnerCanMintWithoutCompliance() public {
        token.mint(alice, 1000 ether);
        assertEq(token.balanceOf(alice), 1000 ether);
    }

    function test_NonOwnerCannotMint() public {
        vm.prank(alice);
        vm.expectRevert(ComplianceToken.OnlyOwner.selector);
        token.mint(alice, 1000 ether);
    }

    // ── Transfer blocked: no sender attestation ─────────────────────

    function test_TransferFailsWithoutSenderAttestation() public {
        token.mint(alice, 1000 ether);

        // Alice has no attestation
        _attestAddress(bob, 1000 ether, block.timestamp + 365 days);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.ComplianceCheckFailed.selector,
                alice
            )
        );
        token.transfer(bob, 100 ether);
    }

    // ── Transfer blocked: no receiver attestation ────────────────────

    function test_TransferFailsWithoutReceiverAttestation() public {
        token.mint(alice, 1000 ether);
        _attestAddress(alice, 1000 ether, block.timestamp + 365 days);

        // Bob has no attestation
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.ComplianceCheckFailed.selector,
                bob
            )
        );
        token.transfer(bob, 100 ether);
    }

    // ── Transfer blocked: expired attestation ────────────────────────

    function test_TransferFailsWithExpiredSenderAttestation() public {
        uint256 expiry = block.timestamp + 30 days;
        token.mint(alice, 1000 ether);
        _attestAddress(alice, 1000 ether, expiry);
        _attestAddress(bob, 1000 ether, block.timestamp + 365 days);

        // Warp past sender's expiry
        vm.warp(expiry + 1);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.AttestationExpired.selector,
                alice
            )
        );
        token.transfer(bob, 100 ether);
    }

    function test_TransferFailsWithExpiredReceiverAttestation() public {
        uint256 expiry = block.timestamp + 30 days;
        token.mint(alice, 1000 ether);
        _attestAddress(alice, 1000 ether, block.timestamp + 365 days);
        _attestAddress(bob, 1000 ether, expiry);

        // Warp past receiver's expiry
        vm.warp(expiry + 1);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.AttestationExpired.selector,
                bob
            )
        );
        token.transfer(bob, 100 ether);
    }

    // ── Transfer blocked: exceeds maxTransferValue ───────────────────

    function test_TransferFailsWhenExceedingMaxTransferValue() public {
        token.mint(alice, 5000 ether);
        _attestAddress(alice, 1000 ether, block.timestamp + 365 days);
        _attestAddress(bob, 1000 ether, block.timestamp + 365 days);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.TransferLimitExceeded.selector,
                2000 ether,
                1000 ether
            )
        );
        token.transfer(bob, 2000 ether);
    }

    // ── Transfer succeeds ────────────────────────────────────────────

    function test_TransferSucceedsWithValidAttestations() public {
        token.mint(alice, 1000 ether);
        _attestAddress(alice, 1000 ether, block.timestamp + 365 days);
        _attestAddress(bob, 1000 ether, block.timestamp + 365 days);

        vm.prank(alice);
        token.transfer(bob, 500 ether);

        assertEq(token.balanceOf(alice), 500 ether);
        assertEq(token.balanceOf(bob), 500 ether);
    }

    function test_TransferExactMaxValueSucceeds() public {
        token.mint(alice, 1000 ether);
        _attestAddress(alice, 1000 ether, block.timestamp + 365 days);
        _attestAddress(bob, 1000 ether, block.timestamp + 365 days);

        vm.prank(alice);
        token.transfer(bob, 1000 ether);

        assertEq(token.balanceOf(bob), 1000 ether);
    }

    // ── Transfer after revocation ────────────────────────────────────

    function test_TransferFailsAfterSenderRevocation() public {
        token.mint(alice, 1000 ether);
        _attestAddress(alice, 1000 ether, block.timestamp + 365 days);
        _attestAddress(bob, 1000 ether, block.timestamp + 365 days);

        // Successful transfer first
        vm.prank(alice);
        token.transfer(bob, 100 ether);

        // Revoke sender
        gateway.revokeAttestation(alice, "Revoked");

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.ComplianceCheckFailed.selector,
                alice
            )
        );
        token.transfer(bob, 100 ether);
    }

    function test_TransferFailsAfterReceiverRevocation() public {
        token.mint(alice, 1000 ether);
        _attestAddress(alice, 1000 ether, block.timestamp + 365 days);
        _attestAddress(bob, 1000 ether, block.timestamp + 365 days);

        // Revoke receiver
        gateway.revokeAttestation(bob, "Revoked");

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.ComplianceCheckFailed.selector,
                bob
            )
        );
        token.transfer(bob, 100 ether);
    }

    // ── Multiple sequential transfers ────────────────────────────────

    function test_MultipleSequentialTransfersSucceed() public {
        token.mint(alice, 1000 ether);
        _attestAddress(alice, 500 ether, block.timestamp + 365 days);
        _attestAddress(bob, 500 ether, block.timestamp + 365 days);
        _attestAddress(charlie, 500 ether, block.timestamp + 365 days);

        // Alice -> Bob
        vm.prank(alice);
        token.transfer(bob, 300 ether);

        // Bob -> Charlie
        vm.prank(bob);
        token.transfer(charlie, 200 ether);

        // Alice -> Charlie
        vm.prank(alice);
        token.transfer(charlie, 400 ether);

        assertEq(token.balanceOf(alice), 300 ether);
        assertEq(token.balanceOf(bob), 100 ether);
        assertEq(token.balanceOf(charlie), 600 ether);
    }

    // ── Pause / Unpause ──────────────────────────────────────────────

    function test_PausedTransfersFail() public {
        token.mint(alice, 1000 ether);
        _attestAddress(alice, 1000 ether, block.timestamp + 365 days);
        _attestAddress(bob, 1000 ether, block.timestamp + 365 days);

        token.pause();

        vm.prank(alice);
        vm.expectRevert(ComplianceToken.TransfersPaused.selector);
        token.transfer(bob, 100 ether);
    }

    function test_MintingWorksWhilePaused() public {
        token.pause();
        token.mint(alice, 1000 ether);
        assertEq(token.balanceOf(alice), 1000 ether);
    }

    function test_UnpauseRestoresTransfers() public {
        token.mint(alice, 1000 ether);
        _attestAddress(alice, 1000 ether, block.timestamp + 365 days);
        _attestAddress(bob, 1000 ether, block.timestamp + 365 days);

        token.pause();
        token.unpause();

        vm.prank(alice);
        token.transfer(bob, 100 ether);
        assertEq(token.balanceOf(bob), 100 ether);
    }
}
