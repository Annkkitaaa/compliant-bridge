// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AttestationInvalidator} from "../src/AttestationInvalidator.sol";
import {ComplianceGateway} from "../src/ComplianceGateway.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";
import {MockRouter} from "./mocks/MockRouter.sol";
import {MockLinkToken} from "./mocks/MockLinkToken.sol";

contract AttestationInvalidatorTest is Test {
    AttestationInvalidator public invalidatorNative;
    AttestationInvalidator public invalidatorLink;
    ComplianceGateway public gateway;
    MockRouter public router;
    MockLinkToken public linkToken;

    address public deployer = address(this);
    address public officer = makeAddr("officer");
    address public unauthorized = makeAddr("unauthorized");
    address public alice = makeAddr("alice");

    address public receiverArb = makeAddr("receiverArb");
    address public receiverOpt = makeAddr("receiverOpt");

    uint64 public constant CHAIN_ARB = 3478487238524512106; // Arb Sepolia
    uint64 public constant CHAIN_OPT = 2664363617261496610; // Opt Sepolia

    event InvalidationBroadcast(
        address indexed subject,
        string reason,
        uint256 chainCount
    );
    event RevocationSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChain,
        address indexed subject
    );

    function setUp() public {
        router = new MockRouter();
        linkToken = new MockLinkToken();
        gateway = new ComplianceGateway();

        // Native fee invalidator
        invalidatorNative = new AttestationInvalidator(
            address(router),
            address(0),
            address(gateway)
        );
        invalidatorNative.setComplianceOfficer(officer, true);
        vm.deal(address(invalidatorNative), 10 ether);

        // Authorize invalidator as a workflow in gateway
        gateway.setAuthorizedWorkflow(address(invalidatorNative), true);

        // LINK fee invalidator
        invalidatorLink = new AttestationInvalidator(
            address(router),
            address(linkToken),
            address(gateway)
        );
        invalidatorLink.setComplianceOfficer(officer, true);
        linkToken.mint(address(invalidatorLink), 100 ether);
        gateway.setAuthorizedWorkflow(address(invalidatorLink), true);

        // Store an attestation for alice so revocation is meaningful
        _attestAlice();
    }

    function _attestAlice() internal {
        IComplianceGateway.ComplianceAttestation memory att = IComplianceGateway
            .ComplianceAttestation({
                subject: alice,
                tier: 2,
                maxTransferValue: 5000 ether,
                validUntil: block.timestamp + 365 days,
                checkId: keccak256(
                    abi.encodePacked(alice, block.timestamp)
                ),
                jurisdictionData: abi.encode("US"),
                issuedAt: block.timestamp,
                sourceChainId: 11155111
            });

        gateway.attestCompliance(alice, att);
        assertTrue(gateway.isCompliant(alice));
    }

    // ── Deployment ───────────────────────────────────────────────────

    function test_DeploymentSetsRouterAndGateway() public view {
        assertEq(address(invalidatorNative.router()), address(router));
        assertEq(
            address(invalidatorNative.gateway()),
            address(gateway)
        );
    }

    function test_DeploymentSetsOwner() public view {
        assertEq(invalidatorNative.owner(), deployer);
    }

    // ── Authorization ────────────────────────────────────────────────

    function test_OwnerCanSetOfficer() public {
        address newOfficer = makeAddr("newOfficer");
        invalidatorNative.setComplianceOfficer(newOfficer, true);
        assertTrue(invalidatorNative.complianceOfficers(newOfficer));
    }

    function test_NonOwnerCannotSetOfficer() public {
        vm.prank(unauthorized);
        vm.expectRevert(AttestationInvalidator.OnlyOwner.selector);
        invalidatorNative.setComplianceOfficer(makeAddr("x"), true);
    }

    function test_UnauthorizedCannotInvalidate() public {
        uint64[] memory chains = new uint64[](1);
        chains[0] = CHAIN_ARB;
        address[] memory receivers = new address[](1);
        receivers[0] = receiverArb;

        vm.prank(unauthorized);
        vm.expectRevert(AttestationInvalidator.OnlyAuthorized.selector);
        invalidatorNative.invalidateAcrossChains(
            alice,
            "Test",
            chains,
            receivers
        );
    }

    // ── Multi-chain invalidation (native fee) ────────────────────────

    function test_InvalidateAcrossSingleChain() public {
        uint64[] memory chains = new uint64[](1);
        chains[0] = CHAIN_ARB;
        address[] memory receivers = new address[](1);
        receivers[0] = receiverArb;

        vm.prank(officer);
        invalidatorNative.invalidateAcrossChains(
            alice,
            "OFAC SDN match",
            chains,
            receivers
        );

        // Verify local revocation
        assertTrue(gateway.isRevoked(alice));
        assertFalse(gateway.isCompliant(alice));

        // Verify CCIP message sent
        assertEq(router.getSentMessageCount(), 1);
    }

    function test_InvalidateAcrossMultipleChains() public {
        uint64[] memory chains = new uint64[](2);
        chains[0] = CHAIN_ARB;
        chains[1] = CHAIN_OPT;
        address[] memory receivers = new address[](2);
        receivers[0] = receiverArb;
        receivers[1] = receiverOpt;

        vm.prank(officer);
        invalidatorNative.invalidateAcrossChains(
            alice,
            "Sanctions list update",
            chains,
            receivers
        );

        // Verify local revocation
        assertTrue(gateway.isRevoked(alice));

        // Verify 2 CCIP messages sent
        assertEq(router.getSentMessageCount(), 2);

        // Verify each message targets correct chain
        MockRouter.SentMessage memory msg0 = router.getSentMessage(0);
        MockRouter.SentMessage memory msg1 = router.getSentMessage(1);
        assertEq(msg0.destinationChainSelector, CHAIN_ARB);
        assertEq(msg1.destinationChainSelector, CHAIN_OPT);
    }

    function test_InvalidationPayloadEncodesCorrectly() public {
        uint64[] memory chains = new uint64[](1);
        chains[0] = CHAIN_ARB;
        address[] memory receivers = new address[](1);
        receivers[0] = receiverArb;

        vm.prank(officer);
        invalidatorNative.invalidateAcrossChains(
            alice,
            "Sanctions match",
            chains,
            receivers
        );

        MockRouter.SentMessage memory sent = router.getSentMessage(0);

        // Decode the payload
        (uint8 msgType, bytes memory innerPayload) = abi.decode(
            sent.data,
            (uint8, bytes)
        );
        assertEq(msgType, invalidatorNative.MSG_REVOCATION());

        (address subject, string memory reason) = abi.decode(
            innerPayload,
            (address, string)
        );
        assertEq(subject, alice);
        assertEq(reason, "Sanctions match");
    }

    function test_OwnerCanInvalidateDirectly() public {
        uint64[] memory chains = new uint64[](1);
        chains[0] = CHAIN_ARB;
        address[] memory receivers = new address[](1);
        receivers[0] = receiverArb;

        // Owner calls directly (not officer)
        invalidatorNative.invalidateAcrossChains(
            alice,
            "Owner revoke",
            chains,
            receivers
        );

        assertTrue(gateway.isRevoked(alice));
        assertEq(router.getSentMessageCount(), 1);
    }

    // ── Events ──────────────────────────────────────────────────────

    function test_InvalidationEmitsRevocationSentPerChain() public {
        uint64[] memory chains = new uint64[](1);
        chains[0] = CHAIN_ARB;
        address[] memory receivers = new address[](1);
        receivers[0] = receiverArb;

        vm.prank(officer);
        vm.expectEmit(false, true, true, false);
        emit RevocationSent(bytes32(0), CHAIN_ARB, alice);
        invalidatorNative.invalidateAcrossChains(
            alice,
            "Test reason",
            chains,
            receivers
        );
    }

    function test_InvalidationEmitsBroadcastEvent() public {
        uint64[] memory chains = new uint64[](2);
        chains[0] = CHAIN_ARB;
        chains[1] = CHAIN_OPT;
        address[] memory receivers = new address[](2);
        receivers[0] = receiverArb;
        receivers[1] = receiverOpt;

        vm.prank(officer);
        vm.expectEmit(true, false, false, true);
        emit InvalidationBroadcast(alice, "Broadcast test", 2);
        invalidatorNative.invalidateAcrossChains(
            alice,
            "Broadcast test",
            chains,
            receivers
        );
    }

    // ── Array length mismatch ───────────────────────────────────────

    function test_RevertsOnArrayLengthMismatch() public {
        uint64[] memory chains = new uint64[](2);
        chains[0] = CHAIN_ARB;
        chains[1] = CHAIN_OPT;
        address[] memory receivers = new address[](1); // mismatch
        receivers[0] = receiverArb;

        vm.prank(officer);
        vm.expectRevert(AttestationInvalidator.ArrayLengthMismatch.selector);
        invalidatorNative.invalidateAcrossChains(
            alice,
            "Test",
            chains,
            receivers
        );
    }

    // ── LINK fee invalidation ───────────────────────────────────────

    function test_InvalidateWithLinkFee() public {
        uint64[] memory chains = new uint64[](1);
        chains[0] = CHAIN_ARB;
        address[] memory receivers = new address[](1);
        receivers[0] = receiverArb;

        // Re-attest alice for the LINK invalidator's gateway
        // (same gateway, just need to re-attest since already revoked by setUp tests would share state)

        vm.prank(officer);
        invalidatorLink.invalidateAcrossChains(
            alice,
            "LINK fee revoke",
            chains,
            receivers
        );

        assertTrue(gateway.isRevoked(alice));
        assertEq(router.getSentMessageCount(), 1);
    }

    // ── Fee estimation ──────────────────────────────────────────────

    function test_EstimateInvalidationFee() public view {
        uint64[] memory chains = new uint64[](2);
        chains[0] = CHAIN_ARB;
        chains[1] = CHAIN_OPT;
        address[] memory receivers = new address[](2);
        receivers[0] = receiverArb;
        receivers[1] = receiverOpt;

        uint256 totalFee = invalidatorNative.estimateInvalidationFee(
            alice,
            "Test",
            chains,
            receivers
        );

        // 2 chains * MOCK_FEE (0.01 ether)
        assertEq(totalFee, 2 * router.MOCK_FEE());
    }

    function test_EstimateFeeRevertsOnMismatch() public {
        uint64[] memory chains = new uint64[](2);
        chains[0] = CHAIN_ARB;
        chains[1] = CHAIN_OPT;
        address[] memory receivers = new address[](1);
        receivers[0] = receiverArb;

        vm.expectRevert(AttestationInvalidator.ArrayLengthMismatch.selector);
        invalidatorNative.estimateInvalidationFee(
            alice,
            "Test",
            chains,
            receivers
        );
    }

    // ── Insufficient native fee ─────────────────────────────────────

    function test_NativeFeeRevertsIfInsufficientBalance() public {
        AttestationInvalidator brokeInvalidator = new AttestationInvalidator(
            address(router),
            address(0),
            address(gateway)
        );
        brokeInvalidator.setComplianceOfficer(officer, true);
        gateway.setAuthorizedWorkflow(address(brokeInvalidator), true);
        // Don't fund it

        uint64[] memory chains = new uint64[](1);
        chains[0] = CHAIN_ARB;
        address[] memory receivers = new address[](1);
        receivers[0] = receiverArb;

        vm.prank(officer);
        vm.expectRevert(
            abi.encodeWithSelector(
                AttestationInvalidator.InsufficientFee.selector,
                router.MOCK_FEE(),
                0
            )
        );
        brokeInvalidator.invalidateAcrossChains(
            alice,
            "Should fail",
            chains,
            receivers
        );
    }
}
