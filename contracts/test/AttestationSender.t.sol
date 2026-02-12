// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AttestationSender} from "../src/AttestationSender.sol";
import {IComplianceGateway} from "../src/IComplianceGateway.sol";
import {Client} from "../src/ccip/Client.sol";
import {MockRouter} from "./mocks/MockRouter.sol";
import {MockLinkToken} from "./mocks/MockLinkToken.sol";

contract AttestationSenderTest is Test {
    AttestationSender public senderNative; // pays fees in native
    AttestationSender public senderLink; // pays fees in LINK
    MockRouter public router;
    MockLinkToken public linkToken;

    address public deployer = address(this);
    address public authorized = makeAddr("authorized");
    address public unauthorized = makeAddr("unauthorized");
    address public alice = makeAddr("alice");
    address public receiverAddr = makeAddr("receiver");

    uint64 public constant DEST_CHAIN = 3478487238524512106; // Arb Sepolia

    event AttestationSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChain,
        address indexed subject
    );
    event TokenWithAttestationSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChain,
        address indexed subject,
        address token,
        uint256 amount
    );

    function setUp() public {
        router = new MockRouter();
        linkToken = new MockLinkToken();

        // Native fee sender
        senderNative = new AttestationSender(address(router), address(0));
        senderNative.setAuthorizedSender(authorized, true);
        vm.deal(address(senderNative), 10 ether);

        // LINK fee sender
        senderLink = new AttestationSender(
            address(router),
            address(linkToken)
        );
        senderLink.setAuthorizedSender(authorized, true);
        linkToken.mint(address(senderLink), 100 ether);
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

    // ── Deployment ───────────────────────────────────────────────────

    function test_DeploymentSetsRouter() public view {
        assertEq(address(senderNative.router()), address(router));
    }

    function test_DeploymentSetsLinkToken() public view {
        assertEq(senderNative.linkToken(), address(0));
        assertEq(senderLink.linkToken(), address(linkToken));
    }

    function test_DeploymentSetsOwner() public view {
        assertEq(senderNative.owner(), deployer);
    }

    // ── Authorization ────────────────────────────────────────────────

    function test_OwnerCanAuthorize() public {
        senderNative.setAuthorizedSender(alice, true);
        assertTrue(senderNative.authorizedSenders(alice));
    }

    function test_NonOwnerCannotAuthorize() public {
        vm.prank(unauthorized);
        vm.expectRevert(AttestationSender.OnlyOwner.selector);
        senderNative.setAuthorizedSender(alice, true);
    }

    // ── Send attestation (native fee) ────────────────────────────────

    function test_AuthorizedCanSendAttestation() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        vm.prank(authorized);
        bytes32 messageId = senderNative.sendAttestation(
            DEST_CHAIN,
            receiverAddr,
            att
        );

        assertTrue(messageId != bytes32(0));
        assertEq(router.getSentMessageCount(), 1);
    }

    function test_SendAttestationEmitsEvent() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        vm.prank(authorized);
        vm.expectEmit(false, true, true, false);
        emit AttestationSent(bytes32(0), DEST_CHAIN, alice);
        senderNative.sendAttestation(DEST_CHAIN, receiverAddr, att);
    }

    function test_UnauthorizedCannotSend() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        vm.prank(unauthorized);
        vm.expectRevert(AttestationSender.OnlyAuthorized.selector);
        senderNative.sendAttestation(DEST_CHAIN, receiverAddr, att);
    }

    function test_OwnerCanSendDirectly() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        bytes32 messageId = senderNative.sendAttestation(
            DEST_CHAIN,
            receiverAddr,
            att
        );
        assertTrue(messageId != bytes32(0));
    }

    // ── Send attestation (LINK fee) ──────────────────────────────────

    function test_SendAttestationWithLink() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        vm.prank(authorized);
        bytes32 messageId = senderLink.sendAttestation(
            DEST_CHAIN,
            receiverAddr,
            att
        );

        assertTrue(messageId != bytes32(0));
        assertEq(router.getSentMessageCount(), 1);
    }

    // ── Message encoding ─────────────────────────────────────────────

    function test_MessagePayloadEncodesCorrectly() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        vm.prank(authorized);
        senderNative.sendAttestation(DEST_CHAIN, receiverAddr, att);

        MockRouter.SentMessage memory sent = router.getSentMessage(0);

        // Verify destination chain
        assertEq(sent.destinationChainSelector, DEST_CHAIN);

        // Verify receiver is encoded correctly
        address decodedReceiver = abi.decode(sent.receiver, (address));
        assertEq(decodedReceiver, receiverAddr);

        // Verify payload decodes to correct msg type + attestation
        (uint8 msgType, bytes memory innerPayload) = abi.decode(
            sent.data,
            (uint8, bytes)
        );
        assertEq(msgType, senderNative.MSG_ATTESTATION());

        IComplianceGateway.ComplianceAttestation memory decoded = abi.decode(
            innerPayload,
            (IComplianceGateway.ComplianceAttestation)
        );
        assertEq(decoded.subject, alice);
        assertEq(decoded.tier, 2);
        assertEq(decoded.maxTransferValue, 5000 ether);
    }

    // ── Bridge token + attestation ───────────────────────────────────

    function test_BridgeTokenWithAttestationSendsCorrectPayload() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        vm.prank(authorized);
        bytes32 messageId = senderNative.bridgeTokenWithAttestation(
            DEST_CHAIN,
            receiverAddr,
            address(linkToken), // use linkToken as the bridged token
            100 ether,
            att
        );

        assertTrue(messageId != bytes32(0));

        MockRouter.SentMessage memory sent = router.getSentMessage(0);

        // Verify token amounts included
        assertEq(sent.tokenAmountsLength, 1);

        // Verify msg type is TOKEN_WITH_ATTESTATION
        (uint8 msgType, ) = abi.decode(sent.data, (uint8, bytes));
        assertEq(msgType, senderNative.MSG_TOKEN_WITH_ATTESTATION());
    }

    function test_BridgeTokenEmitsEvent() public {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        vm.prank(authorized);
        vm.expectEmit(false, true, true, false);
        emit TokenWithAttestationSent(
            bytes32(0),
            DEST_CHAIN,
            alice,
            address(linkToken),
            100 ether
        );
        senderNative.bridgeTokenWithAttestation(
            DEST_CHAIN,
            receiverAddr,
            address(linkToken),
            100 ether,
            att
        );
    }

    // ── Fee estimation ───────────────────────────────────────────────

    function test_EstimateFeeReturnsNonZero() public view {
        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        uint256 fee = senderNative.estimateFee(DEST_CHAIN, receiverAddr, att);
        assertEq(fee, router.MOCK_FEE());
        assertGt(fee, 0);
    }

    // ── Native fee insufficient balance ──────────────────────────────

    function test_NativeFeeRevertsIfInsufficientBalance() public {
        // Deploy a sender with zero balance
        AttestationSender brokeSender = new AttestationSender(
            address(router),
            address(0)
        );
        brokeSender.setAuthorizedSender(authorized, true);
        // Don't fund it

        IComplianceGateway.ComplianceAttestation memory att = _makeAttestation(
            alice
        );

        vm.prank(authorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                AttestationSender.InsufficientFee.selector,
                router.MOCK_FEE(),
                0
            )
        );
        brokeSender.sendAttestation(DEST_CHAIN, receiverAddr, att);
    }
}
