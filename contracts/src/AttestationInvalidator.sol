// SPDX-License-Identifier: MIT
// Chainlink Integration: CCIP
// Purpose: Broadcasts compliance revocations to all destination chains simultaneously via CCIP.
//          A single call to invalidateAcrossChains() revokes locally then sends CCIP messages
//          to every specified chain. Fees paid in LINK from the contract's own balance.
pragma solidity ^0.8.24;

import {IRouterClient} from "./ccip/IRouterClient.sol";
import {Client} from "./ccip/Client.sol";
import {ComplianceGateway} from "./ComplianceGateway.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title AttestationInvalidator
/// @notice Broadcasts attestation revocations across all chains simultaneously
///         via Chainlink CCIP. Demonstrates the "sanctions list update" scenario.
contract AttestationInvalidator {
    /// @dev Must match AttestationSender/Receiver message type constant.
    uint8 public constant MSG_REVOCATION = 3;

    IRouterClient public immutable router;
    address public immutable linkToken;
    ComplianceGateway public immutable gateway;
    address public owner;

    mapping(address => bool) public complianceOfficers;

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

    error OnlyOwner();
    error OnlyAuthorized();
    error ArrayLengthMismatch();
    error InsufficientFee(uint256 required, uint256 provided);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyAuthorized() {
        if (
            !complianceOfficers[msg.sender] && msg.sender != owner
        ) revert OnlyAuthorized();
        _;
    }

    constructor(
        address _router,
        address _linkToken,
        address _gateway
    ) {
        router = IRouterClient(_router);
        linkToken = _linkToken;
        gateway = ComplianceGateway(_gateway);
        owner = msg.sender;
    }

    function setComplianceOfficer(
        address officer,
        bool authorized
    ) external onlyOwner {
        complianceOfficers[officer] = authorized;
    }

    /// @notice Revokes an attestation locally AND broadcasts revocation to all
    ///         specified destination chains via CCIP.
    /// @param subject The address whose attestation should be invalidated.
    /// @param reason Human-readable revocation reason.
    /// @param chainSelectors CCIP chain selectors for destination chains.
    /// @param receivers AttestationReceiver addresses on each destination chain.
    function invalidateAcrossChains(
        address subject,
        string calldata reason,
        uint64[] calldata chainSelectors,
        address[] calldata receivers
    ) external onlyAuthorized {
        if (chainSelectors.length != receivers.length)
            revert ArrayLengthMismatch();

        // 1. Revoke locally first
        gateway.revokeAttestation(subject, reason);

        // 2. Broadcast to all destination chains
        bytes memory payload = abi.encode(
            MSG_REVOCATION,
            abi.encode(subject, reason)
        );

        for (uint256 i = 0; i < chainSelectors.length; i++) {
            Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
                receiver: abi.encode(receivers[i]),
                data: payload,
                tokenAmounts: new Client.EVMTokenAmount[](0),
                feeToken: linkToken,
                extraArgs: Client._argsToBytes(150_000)
            });

            uint256 fee = router.getFee(chainSelectors[i], message);
            bytes32 messageId;

            if (linkToken != address(0)) {
                IERC20(linkToken).approve(address(router), fee);
                messageId = router.ccipSend(chainSelectors[i], message);
            } else {
                if (address(this).balance < fee)
                    revert InsufficientFee(fee, address(this).balance);
                messageId = router.ccipSend{value: fee}(
                    chainSelectors[i],
                    message
                );
            }

            emit RevocationSent(messageId, chainSelectors[i], subject);
        }

        emit InvalidationBroadcast(subject, reason, chainSelectors.length);
    }

    /// @notice Estimates total CCIP fee for broadcasting revocation to all chains.
    function estimateInvalidationFee(
        address subject,
        string calldata reason,
        uint64[] calldata chainSelectors,
        address[] calldata receivers
    ) external view returns (uint256 totalFee) {
        if (chainSelectors.length != receivers.length)
            revert ArrayLengthMismatch();

        bytes memory payload = abi.encode(
            MSG_REVOCATION,
            abi.encode(subject, reason)
        );

        for (uint256 i = 0; i < chainSelectors.length; i++) {
            Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
                receiver: abi.encode(receivers[i]),
                data: payload,
                tokenAmounts: new Client.EVMTokenAmount[](0),
                feeToken: linkToken,
                extraArgs: Client._argsToBytes(150_000)
            });

            totalFee += router.getFee(chainSelectors[i], message);
        }
    }

    /// @notice Allow contract to receive native tokens for CCIP fees.
    receive() external payable {}
}
