// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRouterClient} from "./ccip/IRouterClient.sol";
import {Client} from "./ccip/Client.sol";
import {IComplianceGateway} from "./IComplianceGateway.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title AttestationSender
/// @notice Sends compliance attestations cross-chain via Chainlink CCIP.
///         Supports attestation-only messages and token+attestation bundles.
contract AttestationSender {
    /// @dev Message types for the receiver to distinguish payloads.
    uint8 public constant MSG_ATTESTATION = 1;
    uint8 public constant MSG_TOKEN_WITH_ATTESTATION = 2;
    uint8 public constant MSG_REVOCATION = 3;

    IRouterClient public immutable router;
    address public immutable linkToken;
    address public owner;

    mapping(address => bool) public authorizedSenders;

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

    error OnlyOwner();
    error OnlyAuthorized();
    error InsufficientFee(uint256 required, uint256 provided);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedSenders[msg.sender] && msg.sender != owner)
            revert OnlyAuthorized();
        _;
    }

    /// @param _router The CCIP Router address on this chain.
    /// @param _linkToken The LINK token address (address(0) to pay in native).
    constructor(address _router, address _linkToken) {
        router = IRouterClient(_router);
        linkToken = _linkToken;
        owner = msg.sender;
    }

    function setAuthorizedSender(
        address sender,
        bool authorized
    ) external onlyOwner {
        authorizedSenders[sender] = authorized;
    }

    // ── Send attestation only ────────────────────────────────────

    function sendAttestation(
        uint64 destinationChainSelector,
        address receiver,
        IComplianceGateway.ComplianceAttestation memory attestation
    ) external onlyAuthorized returns (bytes32 messageId) {
        bytes memory payload = abi.encode(MSG_ATTESTATION, abi.encode(attestation));

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: payload,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            feeToken: linkToken,
            extraArgs: Client._argsToBytes(200_000)
        });

        uint256 fee = router.getFee(destinationChainSelector, message);

        if (linkToken != address(0)) {
            IERC20(linkToken).approve(address(router), fee);
            messageId = router.ccipSend(destinationChainSelector, message);
        } else {
            if (address(this).balance < fee)
                revert InsufficientFee(fee, address(this).balance);
            messageId = router.ccipSend{value: fee}(
                destinationChainSelector,
                message
            );
        }

        emit AttestationSent(
            messageId,
            destinationChainSelector,
            attestation.subject
        );
    }

    // ── Send token + attestation ─────────────────────────────────

    function bridgeTokenWithAttestation(
        uint64 destinationChainSelector,
        address receiver,
        address token,
        uint256 amount,
        IComplianceGateway.ComplianceAttestation memory attestation
    ) external onlyAuthorized returns (bytes32 messageId) {
        bytes memory payload = abi.encode(
            MSG_TOKEN_WITH_ATTESTATION,
            abi.encode(attestation)
        );

        Client.EVMTokenAmount[]
            memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({token: token, amount: amount});

        // Approve router to spend tokens
        IERC20(token).approve(address(router), amount);

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: payload,
            tokenAmounts: tokenAmounts,
            feeToken: linkToken,
            extraArgs: Client._argsToBytes(300_000)
        });

        uint256 fee = router.getFee(destinationChainSelector, message);

        if (linkToken != address(0)) {
            IERC20(linkToken).approve(address(router), fee);
            messageId = router.ccipSend(destinationChainSelector, message);
        } else {
            if (address(this).balance < fee)
                revert InsufficientFee(fee, address(this).balance);
            messageId = router.ccipSend{value: fee}(
                destinationChainSelector,
                message
            );
        }

        emit TokenWithAttestationSent(
            messageId,
            destinationChainSelector,
            attestation.subject,
            token,
            amount
        );
    }

    // ── Fee estimation ───────────────────────────────────────────

    function estimateFee(
        uint64 destinationChainSelector,
        address receiver,
        IComplianceGateway.ComplianceAttestation memory attestation
    ) external view returns (uint256 fee) {
        bytes memory payload = abi.encode(MSG_ATTESTATION, abi.encode(attestation));

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: payload,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            feeToken: linkToken,
            extraArgs: Client._argsToBytes(200_000)
        });

        fee = router.getFee(destinationChainSelector, message);
    }

    /// @notice Allow contract to receive native tokens for CCIP fees.
    receive() external payable {}
}
