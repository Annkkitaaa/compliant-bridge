// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AttestationReceiver} from "../src/AttestationReceiver.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";
import {Client} from "../src/ccip/Client.sol";
import {CCIPReceiver} from "../src/ccip/CCIPReceiver.sol";
import {MockRouter} from "./mocks/MockRouter.sol";

contract AttestationReceiverTest is Test {
    AttestationReceiver public receiver;
    ComplianceGateway public gateway;
    MockRouter public router;

    address public deployer = address(this);
    address public unauthorized = makeAddr("unauthorized");
    address public alice = makeAddr("alice");
    address public senderOnSource = makeAddr("senderOnSource");

    uint64 public constant SOURCE_CHAIN = 16015286601757825753; // Sepolia
    uint64 public constant UNKNOWN_CHAIN = 999;

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

    function setUp() public {
        router = new MockRouter();
        gateway = new ComplianceGateway();

        receiver = new AttestationReceiver(
            address(router),
            address(gateway)
        );

        // Authorize receiver in gateway
        gateway.setAuthorizedReceiver(address(receiver), true);

        // Allowlist source chain and sender
        receiver.allowlistChain(SOURCE_CHAIN, true);
        receiver.allowlistSender(SOURCE_CHAIN, senderOnSource, true);
    }

    function _makeAttestation(
        address subject
    ) internal view returns (IComplianceGateway.ComplianceAttestation memory) {
        return
            IComplianceGateway.ComplianceAttestation({
                subject: subject,
                tier: 2,
                maxTransferValue: 5000 ether,
                validUntil: block.timestamp + 365 days,
                checkId: keccak256(abi.encodePacked(subject, block.timestamp)),
                jurisdictionData: abi.encode("US"),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            });
    }

    function _buildCCIPMessage(
        bytes32 messageId,
        uint64 sourceChain,
        address sender,
        bytes memory data
    ) internal pure returns (Client.Any2EVMMessage memory) {
        return
            Client.Any2EVMMessage({
                messageId: messageId,
                sourceChainSelector: sourceChain,
                sender: abi.encode(sender),
                data: data,
                destTokenAmounts: new Client.EVMTokenAmount[](0)
            });
    }

    // ── Deployment ───────────────────────────────────────────────────

    function test_DeploymentSetsRouter() public view {
        assertEq(receiver.getRouter(), address(router));
    }

    function test_DeploymentSetsGateway() public view {
        assertEq(address(receiver.gateway()), address(gateway));
    }

    function test_DeploymentSetsOwner() public view {
        assertEq(receiver.owner(), deployer);
    }

    // ── Receive attestation ─────────────────────────────────────────

    function test_ReceiveAttestationStoresInGateway() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        bytes memory payload = abi.encode(
            receiver.MSG_ATTESTATION(),
            abi.encode(att)
        );

        Client.Any2EVMMessage memory message = _buildCCIPMessage(
            keccak256("msg1"),
            SOURCE_CHAIN,
            senderOnSource,
            payload
        );

        // Call ccipReceive as the router
        vm.prank(address(router));
        receiver.ccipReceive(message);

        // Verify attestation stored in gateway
        assertTrue(gateway.isCompliant(alice));
        IComplianceGateway.ComplianceAttestation memory stored = gateway
            .getAttestation(alice);
        assertEq(stored.subject, alice);
        assertEq(stored.tier, 2);
        assertEq(stored.maxTransferValue, 5000 ether);
    }

    function test_ReceiveAttestationSetsSourceChainId() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        bytes memory payload = abi.encode(
            receiver.MSG_ATTESTATION(),
            abi.encode(att)
        );

        Client.Any2EVMMessage memory message = _buildCCIPMessage(
            keccak256("msg2"),
            SOURCE_CHAIN,
            senderOnSource,
            payload
        );

        vm.prank(address(router));
        receiver.ccipReceive(message);

        // sourceChainId should be overwritten with the CCIP source chain selector
        IComplianceGateway.ComplianceAttestation memory stored = gateway
            .getAttestation(alice);
        assertEq(stored.sourceChainId, SOURCE_CHAIN);
    }

    function test_ReceiveAttestationMarksAsRemote() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        bytes memory payload = abi.encode(
            receiver.MSG_ATTESTATION(),
            abi.encode(att)
        );

        Client.Any2EVMMessage memory message = _buildCCIPMessage(
            keccak256("msg3"),
            SOURCE_CHAIN,
            senderOnSource,
            payload
        );

        vm.prank(address(router));
        receiver.ccipReceive(message);

        assertTrue(gateway.isRemoteAttestation(alice));
    }

    function test_ReceiveAttestationEmitsEvent() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        bytes memory payload = abi.encode(
            receiver.MSG_ATTESTATION(),
            abi.encode(att)
        );

        bytes32 msgId = keccak256("msg4");
        Client.Any2EVMMessage memory message = _buildCCIPMessage(
            msgId,
            SOURCE_CHAIN,
            senderOnSource,
            payload
        );

        vm.prank(address(router));
        vm.expectEmit(true, true, true, false);
        emit AttestationReceived(msgId, SOURCE_CHAIN, alice);
        receiver.ccipReceive(message);
    }

    function test_ReceiveTokenWithAttestationStoresInGateway() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        bytes memory payload = abi.encode(
            receiver.MSG_TOKEN_WITH_ATTESTATION(),
            abi.encode(att)
        );

        Client.Any2EVMMessage memory message = _buildCCIPMessage(
            keccak256("msg5"),
            SOURCE_CHAIN,
            senderOnSource,
            payload
        );

        vm.prank(address(router));
        receiver.ccipReceive(message);

        assertTrue(gateway.isCompliant(alice));
    }

    // ── Reject non-allowlisted sources ──────────────────────────────

    function test_RejectsNonAllowlistedChain() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        bytes memory payload = abi.encode(
            receiver.MSG_ATTESTATION(),
            abi.encode(att)
        );

        Client.Any2EVMMessage memory message = _buildCCIPMessage(
            keccak256("msg6"),
            UNKNOWN_CHAIN, // not allowlisted
            senderOnSource,
            payload
        );

        vm.prank(address(router));
        vm.expectRevert(
            abi.encodeWithSelector(
                AttestationReceiver.SourceChainNotAllowed.selector,
                UNKNOWN_CHAIN
            )
        );
        receiver.ccipReceive(message);
    }

    function test_RejectsNonAllowlistedSender() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        bytes memory payload = abi.encode(
            receiver.MSG_ATTESTATION(),
            abi.encode(att)
        );

        address fakeSender = makeAddr("fakeSender");
        Client.Any2EVMMessage memory message = _buildCCIPMessage(
            keccak256("msg7"),
            SOURCE_CHAIN,
            fakeSender, // not allowlisted
            payload
        );

        vm.prank(address(router));
        vm.expectRevert(
            abi.encodeWithSelector(
                AttestationReceiver.SenderNotAllowed.selector,
                SOURCE_CHAIN,
                fakeSender
            )
        );
        receiver.ccipReceive(message);
    }

    function test_RejectsNonRouterCaller() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        bytes memory payload = abi.encode(
            receiver.MSG_ATTESTATION(),
            abi.encode(att)
        );

        Client.Any2EVMMessage memory message = _buildCCIPMessage(
            keccak256("msg8"),
            SOURCE_CHAIN,
            senderOnSource,
            payload
        );

        // Call as unauthorized address (not router)
        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                CCIPReceiver.InvalidRouter.selector,
                unauthorized
            )
        );
        receiver.ccipReceive(message);
    }

    // ── Revocation processing ───────────────────────────────────────

    function test_ReceiveRevocationRevokesInGateway() public {
        // First store an attestation
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );
        bytes memory attPayload = abi.encode(
            receiver.MSG_ATTESTATION(),
            abi.encode(att)
        );
        Client.Any2EVMMessage memory attMsg = _buildCCIPMessage(
            keccak256("att"),
            SOURCE_CHAIN,
            senderOnSource,
            attPayload
        );
        vm.prank(address(router));
        receiver.ccipReceive(attMsg);
        assertTrue(gateway.isCompliant(alice));

        // Now send revocation
        bytes memory revPayload = abi.encode(
            receiver.MSG_REVOCATION(),
            abi.encode(alice, "Sanctions match")
        );
        Client.Any2EVMMessage memory revMsg = _buildCCIPMessage(
            keccak256("rev"),
            SOURCE_CHAIN,
            senderOnSource,
            revPayload
        );

        vm.prank(address(router));
        receiver.ccipReceive(revMsg);

        // Verify revoked
        assertTrue(gateway.isRevoked(alice));
        assertFalse(gateway.isCompliant(alice));
    }

    function test_ReceiveRevocationEmitsEvent() public {
        bytes memory revPayload = abi.encode(
            receiver.MSG_REVOCATION(),
            abi.encode(alice, "OFAC SDN match")
        );
        bytes32 msgId = keccak256("rev2");
        Client.Any2EVMMessage memory revMsg = _buildCCIPMessage(
            msgId,
            SOURCE_CHAIN,
            senderOnSource,
            revPayload
        );

        vm.prank(address(router));
        vm.expectEmit(true, true, true, true);
        emit RevocationReceived(msgId, SOURCE_CHAIN, alice, "OFAC SDN match");
        receiver.ccipReceive(revMsg);
    }

    // ── Allowlist management ────────────────────────────────────────

    function test_OwnerCanAllowlistChain() public {
        uint64 newChain = 12345;
        receiver.allowlistChain(newChain, true);
        assertTrue(receiver.allowlistedChains(newChain));

        receiver.allowlistChain(newChain, false);
        assertFalse(receiver.allowlistedChains(newChain));
    }

    function test_OwnerCanAllowlistSender() public {
        address newSender = makeAddr("newSender");
        receiver.allowlistSender(SOURCE_CHAIN, newSender, true);
        assertTrue(receiver.allowlistedSenders(SOURCE_CHAIN, newSender));

        receiver.allowlistSender(SOURCE_CHAIN, newSender, false);
        assertFalse(receiver.allowlistedSenders(SOURCE_CHAIN, newSender));
    }

    function test_NonOwnerCannotAllowlistChain() public {
        vm.prank(unauthorized);
        vm.expectRevert(AttestationReceiver.OnlyOwner.selector);
        receiver.allowlistChain(12345, true);
    }

    function test_NonOwnerCannotAllowlistSender() public {
        vm.prank(unauthorized);
        vm.expectRevert(AttestationReceiver.OnlyOwner.selector);
        receiver.allowlistSender(SOURCE_CHAIN, makeAddr("x"), true);
    }
}
