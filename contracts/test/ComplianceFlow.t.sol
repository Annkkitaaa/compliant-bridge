// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {ComplianceToken} from "../src/ComplianceToken.sol";
import {AttestationSender} from "../src/AttestationSender.sol";
import {AttestationReceiver} from "../src/AttestationReceiver.sol";
import {AttestationInvalidator} from "../src/AttestationInvalidator.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";
import {Client} from "../src/ccip/Client.sol";
import {MockRouter} from "./mocks/MockRouter.sol";
import {MockLinkToken} from "./mocks/MockLinkToken.sol";

/// @title ComplianceFlowTest
/// @notice End-to-end integration test simulating the full cross-chain
///         compliance attestation lifecycle:
///         1. Deploy all contracts on source and destination chains
///         2. Submit attestation on source chain
///         3. Send attestation cross-chain via CCIP
///         4. Simulate delivery on destination chain (ccipReceive)
///         5. Verify attestation on destination gateway
///         6. Token transfer using bridged attestation
///         7. Multi-chain invalidation broadcast
///         8. Verify transfer fails after invalidation
contract ComplianceFlowTest is Test {
    // ── Source chain contracts ───────────────────────────────────────
    ComplianceGateway public srcGateway;
    ComplianceToken public srcToken;
    AttestationSender public sender;
    AttestationInvalidator public invalidator;
    MockRouter public srcRouter;

    // ── Destination chain contracts ─────────────────────────────────
    ComplianceGateway public dstGateway;
    ComplianceToken public dstToken;
    AttestationReceiver public receiver;
    MockRouter public dstRouter;

    MockLinkToken public linkToken;

    address public deployer = address(this);
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public complianceBot = makeAddr("complianceBot");
    address public complianceOfficer = makeAddr("complianceOfficer");

    uint64 public constant SRC_CHAIN = 16015286601757825753; // Sepolia
    uint64 public constant DST_CHAIN = 3478487238524512106; // Arb Sepolia

    function setUp() public {
        linkToken = new MockLinkToken();

        // ── Deploy source chain ─────────────────────────────────────
        srcRouter = new MockRouter();
        srcGateway = new ComplianceGateway();
        srcToken = new ComplianceToken(
            "Compliant Bridge Token",
            "CBT",
            address(srcGateway)
        );

        sender = new AttestationSender(
            address(srcRouter),
            address(0) // native fees
        );
        sender.setAuthorizedSender(complianceBot, true);
        vm.deal(address(sender), 10 ether);

        invalidator = new AttestationInvalidator(
            address(srcRouter),
            address(0),
            address(srcGateway)
        );
        invalidator.setComplianceOfficer(complianceOfficer, true);
        vm.deal(address(invalidator), 10 ether);
        srcGateway.setAuthorizedWorkflow(address(invalidator), true);

        // ── Deploy destination chain ────────────────────────────────
        dstRouter = new MockRouter();
        dstGateway = new ComplianceGateway();
        dstToken = new ComplianceToken(
            "Compliant Bridge Token",
            "CBT",
            address(dstGateway)
        );

        receiver = new AttestationReceiver(
            address(dstRouter),
            address(dstGateway)
        );

        // Authorize receiver in destination gateway
        dstGateway.setAuthorizedReceiver(address(receiver), true);

        // Allowlist source chain + sender
        receiver.allowlistChain(SRC_CHAIN, true);
        receiver.allowlistSender(SRC_CHAIN, address(sender), true);
    }

    function _makeAttestation(
        address subject,
        uint8 tier,
        uint256 maxTransfer
    ) internal view returns (IComplianceGateway.ComplianceAttestation memory) {
        return
            IComplianceGateway.ComplianceAttestation({
                subject: subject,
                tier: tier,
                maxTransferValue: maxTransfer,
                validUntil: block.timestamp + 365 days,
                checkId: keccak256(
                    abi.encodePacked(subject, block.timestamp)
                ),
                jurisdictionData: abi.encode("US"),
                issuedAt: block.timestamp,
                sourceChainId: SRC_CHAIN
            });
    }

    /// @dev Simulates cross-chain delivery: reads the message from srcRouter
    ///      and calls ccipReceive on the receiver as if dstRouter delivered it.
    function _simulateCCIPDelivery(uint256 messageIndex) internal {
        MockRouter.SentMessage memory sent = srcRouter.getSentMessage(
            messageIndex
        );

        address decodedReceiver = abi.decode(sent.receiver, (address));

        Client.Any2EVMMessage memory inbound = Client.Any2EVMMessage({
            messageId: keccak256(
                abi.encodePacked("delivery", messageIndex)
            ),
            sourceChainSelector: SRC_CHAIN,
            sender: abi.encode(address(sender)),
            data: sent.data,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        vm.prank(address(dstRouter));
        AttestationReceiver(decodedReceiver).ccipReceive(inbound);
    }

    /// @dev Simulates delivery of an invalidator CCIP message.
    function _simulateInvalidationDelivery(uint256 messageIndex) internal {
        MockRouter.SentMessage memory sent = srcRouter.getSentMessage(
            messageIndex
        );

        address decodedReceiver = abi.decode(sent.receiver, (address));

        Client.Any2EVMMessage memory inbound = Client.Any2EVMMessage({
            messageId: keccak256(
                abi.encodePacked("invalidation", messageIndex)
            ),
            sourceChainSelector: SRC_CHAIN,
            sender: abi.encode(address(invalidator)),
            data: sent.data,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });

        // Allowlist the invalidator as a sender on the receiver
        receiver.allowlistSender(
            SRC_CHAIN,
            address(invalidator),
            true
        );

        vm.prank(address(dstRouter));
        AttestationReceiver(decodedReceiver).ccipReceive(inbound);
    }

    // ── Full E2E: attest → bridge → transfer ────────────────────────

    function test_FullCrossChainAttestationFlow() public {
        // Step 1: Attest alice on source chain
        IComplianceGateway.ComplianceAttestation memory attAlice = _makeAttestation(
            alice,
            2,
            5000 ether
        );
        srcGateway.attestCompliance(alice, attAlice);
        assertTrue(srcGateway.isCompliant(alice));

        // Step 2: Send attestation cross-chain
        vm.prank(complianceBot);
        bytes32 messageId = sender.sendAttestation(
            DST_CHAIN,
            address(receiver),
            attAlice
        );
        assertTrue(messageId != bytes32(0));
        assertEq(srcRouter.getSentMessageCount(), 1);

        // Step 3: Simulate CCIP delivery on destination
        _simulateCCIPDelivery(0);

        // Step 4: Verify attestation stored on destination
        assertTrue(dstGateway.isCompliant(alice));
        assertTrue(dstGateway.isRemoteAttestation(alice));

        IComplianceGateway.ComplianceAttestation memory stored = dstGateway
            .getAttestation(alice);
        assertEq(stored.subject, alice);
        assertEq(stored.tier, 2);
        assertEq(stored.maxTransferValue, 5000 ether);
        // sourceChainId should be set to the CCIP source chain selector
        assertEq(stored.sourceChainId, SRC_CHAIN);

        // Step 5: Mint tokens and attempt transfer using bridged attestation
        // Also attest bob on destination so he can receive tokens
        IComplianceGateway.ComplianceAttestation memory attBob = _makeAttestation(
            bob,
            2,
            5000 ether
        );
        dstGateway.attestCompliance(bob, attBob);

        dstToken.mint(alice, 1000 ether);

        vm.prank(alice);
        dstToken.transfer(bob, 500 ether);

        assertEq(dstToken.balanceOf(alice), 500 ether);
        assertEq(dstToken.balanceOf(bob), 500 ether);
    }

    // ── E2E: attest → bridge → invalidate → transfer fails ─────────

    function test_InvalidationBlocksTransferAfterBridge() public {
        // Step 1: Attest alice on source chain
        IComplianceGateway.ComplianceAttestation memory attAlice = _makeAttestation(
            alice,
            2,
            5000 ether
        );
        srcGateway.attestCompliance(alice, attAlice);

        // Step 2: Send attestation cross-chain
        vm.prank(complianceBot);
        sender.sendAttestation(DST_CHAIN, address(receiver), attAlice);

        // Step 3: Simulate delivery
        _simulateCCIPDelivery(0);
        assertTrue(dstGateway.isCompliant(alice));

        // Step 4: Mint tokens to alice on destination
        IComplianceGateway.ComplianceAttestation memory attBob = _makeAttestation(
            bob,
            2,
            5000 ether
        );
        dstGateway.attestCompliance(bob, attBob);
        dstToken.mint(alice, 1000 ether);

        // Step 5: Transfer works before invalidation
        vm.prank(alice);
        dstToken.transfer(bob, 100 ether);
        assertEq(dstToken.balanceOf(bob), 100 ether);

        // Step 6: Invalidate across chains (source + destination)
        uint64[] memory chains = new uint64[](1);
        chains[0] = DST_CHAIN;
        address[] memory receivers = new address[](1);
        receivers[0] = address(receiver);

        vm.prank(complianceOfficer);
        invalidator.invalidateAcrossChains(
            alice,
            "OFAC SDN match - urgent",
            chains,
            receivers
        );

        // Verify local (source) revocation
        assertTrue(srcGateway.isRevoked(alice));

        // Step 7: Simulate invalidation delivery on destination
        _simulateInvalidationDelivery(1); // index 1 (index 0 was the attestation)

        // Verify destination revocation
        assertTrue(dstGateway.isRevoked(alice));
        assertFalse(dstGateway.isCompliant(alice));

        // Step 8: Transfer should now fail
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.ComplianceCheckFailed.selector,
                alice
            )
        );
        dstToken.transfer(bob, 100 ether);
    }

    // ── Multiple attestations bridged ───────────────────────────────

    function test_MultipleAttestationsBridgedSuccessfully() public {
        // Attest both alice and bob on source
        IComplianceGateway.ComplianceAttestation memory attAlice = _makeAttestation(
            alice,
            3,
            10000 ether
        );
        IComplianceGateway.ComplianceAttestation memory attBob = _makeAttestation(
            bob,
            2,
            5000 ether
        );
        srcGateway.attestCompliance(alice, attAlice);
        srcGateway.attestCompliance(bob, attBob);

        // Bridge both
        vm.prank(complianceBot);
        sender.sendAttestation(DST_CHAIN, address(receiver), attAlice);

        vm.prank(complianceBot);
        sender.sendAttestation(DST_CHAIN, address(receiver), attBob);

        assertEq(srcRouter.getSentMessageCount(), 2);

        // Deliver both
        _simulateCCIPDelivery(0);
        _simulateCCIPDelivery(1);

        // Both should be compliant on destination
        assertTrue(dstGateway.isCompliant(alice));
        assertTrue(dstGateway.isCompliant(bob));

        // Transfer between them should work
        dstToken.mint(alice, 2000 ether);

        vm.prank(alice);
        dstToken.transfer(bob, 1000 ether);

        assertEq(dstToken.balanceOf(alice), 1000 ether);
        assertEq(dstToken.balanceOf(bob), 1000 ether);
    }

    // ── Transfer limit enforcement with bridged attestation ─────────

    function test_TransferLimitEnforcedWithBridgedAttestation() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            1,
            100 ether // low limit
        );
        srcGateway.attestCompliance(alice, att);

        // Bridge
        vm.prank(complianceBot);
        sender.sendAttestation(DST_CHAIN, address(receiver), att);
        _simulateCCIPDelivery(0);

        // Attest bob on destination
        IComplianceGateway.ComplianceAttestation memory attBob = _makeAttestation(
            bob,
            2,
            5000 ether
        );
        dstGateway.attestCompliance(bob, attBob);

        // Mint more than limit
        dstToken.mint(alice, 500 ether);

        // Transfer within limit works
        vm.prank(alice);
        dstToken.transfer(bob, 50 ether);

        // Transfer exceeding limit fails
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ComplianceToken.TransferLimitExceeded.selector,
                200 ether,
                100 ether
            )
        );
        dstToken.transfer(bob, 200 ether);
    }

    // ── Re-attestation after revocation ─────────────────────────────

    function test_ReAttestationAfterRevocation() public {
        // Attest and bridge
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            2,
            5000 ether
        );
        srcGateway.attestCompliance(alice, att);

        vm.prank(complianceBot);
        sender.sendAttestation(DST_CHAIN, address(receiver), att);
        _simulateCCIPDelivery(0);
        assertTrue(dstGateway.isCompliant(alice));

        // Revoke on destination directly
        dstGateway.revokeAttestation(alice, "Temporary hold");
        assertFalse(dstGateway.isCompliant(alice));

        // Re-attest and bridge again
        IComplianceGateway.ComplianceAttestation memory newAtt = IComplianceGateway
            .ComplianceAttestation({
                subject: alice,
                tier: 3,
                maxTransferValue: 10000 ether,
                validUntil: block.timestamp + 365 days,
                checkId: keccak256(abi.encodePacked(alice, block.timestamp, "v2")),
                jurisdictionData: abi.encode("US"),
                issuedAt: block.timestamp,
                sourceChainId: SRC_CHAIN
            });

        vm.prank(complianceBot);
        sender.sendAttestation(DST_CHAIN, address(receiver), newAtt);
        _simulateCCIPDelivery(1);

        // Should be compliant again with updated tier
        assertTrue(dstGateway.isCompliant(alice));
        IComplianceGateway.ComplianceAttestation memory stored = dstGateway
            .getAttestation(alice);
        assertEq(stored.tier, 3);
        assertEq(stored.maxTransferValue, 10000 ether);
    }

    // ── Fee estimation for cross-chain operations ───────────────────

    function test_FeeEstimationForCrossChainAttestation() public view {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice,
            2,
            5000 ether
        );

        uint256 fee = sender.estimateFee(
            DST_CHAIN,
            address(receiver),
            att
        );
        assertEq(fee, srcRouter.MOCK_FEE());
        assertGt(fee, 0);
    }

    function test_FeeEstimationForMultiChainInvalidation() public {
        uint64[] memory chains = new uint64[](2);
        chains[0] = DST_CHAIN;
        chains[1] = 2664363617261496610; // Opt Sepolia
        address[] memory receivers = new address[](2);
        receivers[0] = address(receiver);
        receivers[1] = makeAddr("optReceiver");

        uint256 totalFee = invalidator.estimateInvalidationFee(
            alice,
            "Test reason",
            chains,
            receivers
        );

        assertEq(totalFee, 2 * srcRouter.MOCK_FEE());
    }
}
