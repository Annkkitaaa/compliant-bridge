# Chainlink Integration — File-by-File Reference

> Complete mapping of every source file that uses Chainlink infrastructure, with the specific APIs, contracts, and patterns involved.

---

## Table of Contents

1. [CRE Workflow Files](#1-cre-workflow-files)
2. [CCIP Smart Contracts](#2-ccip-smart-contracts)
3. [CRE-Connected Smart Contracts](#3-cre-connected-smart-contracts)
4. [CCIP Interface Files (Local Copies)](#4-ccip-interface-files-local-copies)
5. [Frontend Integration](#5-frontend-integration)
6. [Configuration Files](#6-configuration-files)
7. [Data Flow Summary](#7-data-flow-summary)

---

## 1. CRE Workflow Files

### `cre-workflow/compliance-check/main.ts`

**Chainlink Products:** CRE Workflow · CRE ConfidentialHTTP · CRE Secrets (Vault DON) · CRE EVMClient · CRE CronCapability

This is the core Chainlink CRE workflow. It imports directly from `@chainlink/cre-sdk@1.0.9`.

#### Imports used

```typescript
import {
  CronCapability,            // Scheduled trigger — fires every 5 minutes
  ConfidentialHTTPClient,    // Enclave HTTP client for private API calls
  EVMClient,                 // On-chain write client for DON-signed reports
  consensusIdenticalAggregation, // BFT consensus strategy (all nodes must agree)
  getNetwork,                // Resolves chain selector name to network config
  handler,                   // Associates trigger with callback
  prepareReportRequest,      // Encodes call data for DON report
  Runner,                    // CRE workflow runtime entry point
  ok,                        // HTTP response success check
  json,                      // Parse HTTP response body as JSON
  TxStatus,                  // On-chain tx status enum
  type ConfidentialHTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
```

#### CRE ConfidentialHTTP usage

Four separate compliance checks are executed inside the secure enclave:

| Function | Endpoint | Secret injected |
|----------|----------|-----------------|
| `fetchSanctionsCheck()` | `POST /sanctions-check` | `complianceApiKey` via `{{.complianceApiKey}}` template |
| `fetchKycStatus()` | `POST /kyc-status` | `complianceApiKey` |
| `fetchAccreditedInvestor()` | `POST /accredited-investor` | `complianceApiKey` |
| `fetchJurisdictionCheck()` | `POST /jurisdiction-check` | `complianceApiKey` |

Each call uses the `vaultDonSecrets` field to request secret injection from the Vault DON:

```typescript
vaultDonSecrets: [
  { key: "complianceApiKey", namespace: "compliance", owner: config.owner },
]
```

The `encryptOutput: true` variant (`fetchSanctionsCheckEncrypted`) additionally requests AES-GCM response encryption inside the enclave before the response leaves — even the raw HTTP response bytes are never seen outside the enclave.

#### CRE Secrets (Vault DON)

Secrets are defined in `secrets.yaml` and referenced by name in each `sendRequest()` call. The Vault DON stores them with threshold encryption — no single node can reconstruct the API key.

```yaml
# secrets.yaml
secretsNames:
  complianceApiKey:
    - COMPLIANCE_API_KEY_ALL
  encryptionKey:
    - AES_ENCRYPTION_KEY_ALL
```

#### CRE EVMClient — on-chain write

`submitAttestationOnChain()` uses `EVMClient.writeReport()` to deliver a DON-signed report:

```typescript
const evmClient = new EVMClient(network.chainSelector.selector);
const report = runtime.report(prepareReportRequest(writeCallData)).result();
const writeResult = evmClient.writeReport(runtime, {
  receiver: evmConfig.consumerContractAddress,
  report,
}).result();
```

The `writeCallData` is ABI-encoded call data targeting `ComplianceConsumer.onReport(bytes, bytes)`. The report is signed by the DON and can only be accepted by the Chainlink Forwarder.

#### CRE CronCapability

```typescript
handler(
  new CronCapability().trigger({ schedule: config.schedule }),
  onComplianceCheck
)
// config.schedule = "0 */5 * * * *"  (every 5 minutes)
```

#### Consensus strategy

`consensusIdenticalAggregation<T>()` is used for all four HTTP checks — all DON nodes must return identical results. This prevents a rogue node from injecting false compliance data.

---

### `cre-workflow/secrets.yaml`

**Chainlink Products:** CRE Secrets (Vault DON)

Defines which environment variables map to Vault DON secret keys. During `cre workflow simulate`, these are loaded from environment variables. On a deployed DON, they are retrieved via the Vault DON's threshold decryption.

```yaml
secretsNames:
  complianceApiKey:
    - COMPLIANCE_API_KEY_ALL    # → injected as {{.complianceApiKey}}
  encryptionKey:
    - AES_ENCRYPTION_KEY_ALL    # → injected as {{.encryptionKey}} (for encryptOutput)
```

---

### `cre-workflow/project.yaml`

**Chainlink Products:** CRE CLI project settings

Defines target environments and their RPC URLs. The `staging-settings` target is used for `cre workflow simulate`. The `rpcs` entries tell the CRE simulator which chain to connect to for `EVMClient.writeReport()`.

```yaml
staging-settings:
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: "https://ethereum-sepolia-rpc.publicnode.com"
```

---

### `cre-workflow/compliance-check/workflow.yaml`

**Chainlink Products:** CRE CLI workflow settings

Associates the workflow entry point, config file, and secrets file with each deployment target. The `workflow-name` is used in the Chainlink Workflow Registry.

```yaml
staging-settings:
  user-workflow:
    workflow-name: "compliance-check-staging"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.json"
    secrets-path: "../secrets.yaml"
```

---

## 2. CCIP Smart Contracts

### `contracts/src/AttestationSender.sol`

**Chainlink Products:** CCIP (IRouterClient · Client library)

Sends compliance attestations cross-chain. Deployed on Sepolia (source chain).

**Key Chainlink usage:**

```solidity
import {IRouterClient} from "./ccip/IRouterClient.sol";
import {Client} from "./ccip/Client.sol";

// Build CCIP message
Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
    receiver: abi.encode(receiver),
    data: payload,
    tokenAmounts: new Client.EVMTokenAmount[](0),
    feeToken: linkToken,
    extraArgs: Client._argsToBytes(200_000)  // EVMExtraArgsV1Tag required
});

// Get fee and send
uint256 fee = router.getFee(destinationChainSelector, message);
IERC20(linkToken).approve(address(router), fee);
messageId = router.ccipSend(destinationChainSelector, message);
```

**Three message types:**
- `MSG_ATTESTATION (1)` — attestation-only, sent by `sendAttestation()`
- `MSG_TOKEN_WITH_ATTESTATION (2)` — tokens + attestation, sent by `bridgeTokenWithAttestation()`
- `MSG_REVOCATION (3)` — revocation, routed through `AttestationInvalidator`

**LINK payment model:** The contract holds LINK and pays CCIP fees itself. Callers do not need to send ETH or LINK — the contract's LINK balance is consumed.

**Key technical note:** `Client._argsToBytes(gasLimit)` must produce a 36-byte result with the `EVMExtraArgsV1Tag = 0x97a657c9` 4-byte prefix, or the CCIP router rejects the message with `InvalidExtraArgsTag()`.

---

### `contracts/src/AttestationReceiver.sol`

**Chainlink Products:** CCIP (CCIPReceiver base · Client library)

Receives cross-chain messages on the destination chain (Arb Sepolia). Extends `CCIPReceiver` which handles the router authentication.

```solidity
import {CCIPReceiver} from "./ccip/CCIPReceiver.sol";
import {Client} from "./ccip/Client.sol";

contract AttestationReceiver is CCIPReceiver {
    // _ccipReceive is called by the CCIP router after message delivery
    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        uint64 sourceChain = message.sourceChainSelector;
        address sender = abi.decode(message.sender, (address));
        // allowlist check, then dispatch to _handleAttestation or _handleRevocation
    }
}
```

**Security:** Uses allowlist pattern — only messages from `allowlistedChains` with `allowlistedSenders` are processed. All other messages revert.

---

### `contracts/src/AttestationInvalidator.sol`

**Chainlink Products:** CCIP (IRouterClient · Client library)

Broadcasts revocations simultaneously across all chains in a single transaction.

```solidity
// For each destination chain:
Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
    receiver: abi.encode(receivers[i]),
    data: payload,          // MSG_REVOCATION + abi.encode(subject, reason)
    tokenAmounts: new Client.EVMTokenAmount[](0),
    feeToken: linkToken,
    extraArgs: Client._argsToBytes(150_000)
});
uint256 fee = router.getFee(chainSelectors[i], message);
IERC20(linkToken).approve(address(router), fee);
messageId = router.ccipSend(chainSelectors[i], message);
```

**Live revocation:** `invalidateAcrossChains()` first calls `gateway.revokeAttestation()` locally, then sends CCIP messages to every specified destination chain. A single regulator transaction propagates the revocation everywhere.

---

## 3. CRE-Connected Smart Contracts

### `contracts/src/ComplianceConsumer.sol`

**Chainlink Products:** CRE EVMClient (report receiver)

This contract is the on-chain target of the CRE EVMClient's `writeReport()` call. The Chainlink Forwarder calls `onReport(bytes metadata, bytes report)` after verifying the DON signature.

```solidity
/// @notice Called by the Chainlink Forwarder to deliver a signed CRE report.
function onReport(bytes calldata /* metadata */, bytes calldata report) external onlyForwarder {
    (
        address subject, uint8 tier, uint256 maxTransferValue,
        uint256 validUntil, bytes32 checkId, bytes memory jurisdictionData,
        uint256 issuedAt, uint256 sourceChainId
    ) = abi.decode(report, (address, uint8, uint256, uint256, bytes32, bytes, uint256, uint256));

    gateway.attestCompliance(subject, attestation);
}
```

**Interface compliance:** Implements `onReport(bytes, bytes)` matching the CRE IReceiver interface (selector `0xe3401711`). The `supportsInterface()` function confirms ERC-165 compliance for both IReceiver and ERC-165.

**Security:** `onlyForwarder` modifier restricts calls to the registered Chainlink Forwarder address. The forwarder address is updatable by the owner to track Chainlink Forwarder upgrades.

---

### `contracts/src/ComplianceGateway.sol`

**Chainlink Products:** CRE EVMClient (attestation destination) · CCIP (cross-chain receiver target)

The central attestation store. Receives attestations from two Chainlink sources:

1. **CRE reports** via `attestCompliance()` — called by `ComplianceConsumer` after the Chainlink Forwarder delivers a DON-signed report. Authorized via `setAuthorizedWorkflow()`.

2. **CCIP messages** via `receiveRemoteAttestation()` — called by `AttestationReceiver` after `_ccipReceive()`. Authorized via `setAuthorizedReceiver()`.

```solidity
// Set by owner after deploying ComplianceConsumer and AttestationReceiver:
function setAuthorizedWorkflow(address workflow, bool authorized) external onlyOwner {}
function setAuthorizedReceiver(address receiver, bool authorized) external onlyOwner {}
```

The gateway is the trust anchor: only Chainlink-delivered data (via CRE forwarder or CCIP receiver) can write attestations.

---

## 4. CCIP Interface Files (Local Copies)

These files are local copies of Chainlink's official CCIP interfaces, stored in `contracts/src/ccip/` to avoid pulling in the full `@chainlink/contracts-ccip` package during hackathon development.

### `contracts/src/ccip/Client.sol`

**Chainlink Products:** CCIP Client library

Defines the core CCIP message types and the critical `_argsToBytes()` function that encodes `EVMExtraArgsV1` with the required `0x97a657c9` 4-byte tag prefix. Without this tag the CCIP router reverts with `InvalidExtraArgsTag()`.

Key types used across the project:
- `Client.EVM2AnyMessage` — outbound message (sender uses this)
- `Client.Any2EVMMessage` — inbound message (receiver uses this)
- `Client.EVMTokenAmount` — token transfer struct for token+attestation bundles

### `contracts/src/ccip/IRouterClient.sol`

**Chainlink Products:** CCIP Router interface

Used by `AttestationSender` and `AttestationInvalidator` for:
- `getFee(uint64 destinationChainSelector, EVM2AnyMessage)` — get LINK fee before sending
- `ccipSend(uint64 destinationChainSelector, EVM2AnyMessage)` — submit message

### `contracts/src/ccip/CCIPReceiver.sol`

**Chainlink Products:** CCIP CCIPReceiver base contract

Base contract for `AttestationReceiver`. Provides:
- Constructor that sets the CCIP router address
- `ccipReceive()` public entry point (validates caller is the router)
- `_ccipReceive()` internal hook (override in subclass)

---

## 5. Frontend Integration

### `frontend/lib/contracts.ts`

**Chainlink Products:** CCIP (chain selector) · All deployed Chainlink-integrated contracts

Central contract configuration file. Chainlink-specific items:

```typescript
// CCIP Arb Sepolia chain selector (used in sendAttestation calls)
ccip: {
  arbSepoliaSelector: BigInt("3478487238524512106"),
}

// All ABIs reference contracts deployed/integrated with Chainlink:
GATEWAY_ABI      // ComplianceGateway — receives from CRE + CCIP
TOKEN_ABI        // ComplianceToken — enforces CRE-attested compliance
REGULATOR_ABI    // RegulatorView — views CRE-attested data
SENDER_ABI       // AttestationSender — CCIP sender
INVALIDATOR_ABI  // AttestationInvalidator — CCIP broadcaster
```

### `frontend/components/tabs/InstitutionTab.tsx`

**Chainlink Products:** CCIP (calls AttestationSender)

The "Bridge Attestation" button calls `AttestationSender.sendAttestation()`:

```typescript
const sender = new ethers.Contract(ADDRESSES.sepolia.sender, SENDER_ABI, signer);
const messageId = await sender.sendAttestation(
  ADDRESSES.ccip.arbSepoliaSelector,  // ← CCIP destination chain selector
  ADDRESSES.arbSepolia.receiver,      // ← destination AttestationReceiver
  attestation,
);
```

No ETH value is attached — the AttestationSender contract pays CCIP fees from its own LINK balance.

### `frontend/components/tabs/RegulatorTab.tsx`

**Chainlink Products:** CCIP (calls AttestationInvalidator)

The "Revoke" button calls `AttestationInvalidator.invalidateAcrossChains()`:

```typescript
const inv = new ethers.Contract(ADDRESSES.sepolia.invalidator, INVALIDATOR_ABI, signer);
await inv.invalidateAcrossChains(
  subject,
  reason,
  [ADDRESSES.ccip.arbSepoliaSelector],  // ← CCIP chain selectors
  [ADDRESSES.arbSepolia.receiver],       // ← destination receivers
);
```

### `frontend/components/tabs/PublicTab.tsx`

**Chainlink Products:** CCIP-aware gateway (reads compliance status)

Queries `ComplianceGateway.getPublicStatus(from)` for each Transfer event. The gateway's compliance data originates from CRE (via ComplianceConsumer) and may include remotely-attested data from CCIP (via AttestationReceiver).

---

## 6. Configuration Files

### `cre-workflow/compliance-check/config.json` (staging)

Chainlink-relevant fields:

```json
{
  "schedule": "0 */5 * * * *",          // CRE CronCapability schedule
  "evms": [{
    "chainSelectorName": "ethereum-testnet-sepolia",  // CRE EVMClient chain
    "gatewayContractAddress": "0x472E...",            // ComplianceGateway
    "consumerContractAddress": "0x4de3...",           // ComplianceConsumer (onReport target)
    "gasLimit": "500000"                              // EVMClient gas limit
  }]
}
```

### `contracts/deployments.json`

Records live CCIP message IDs from the hackathon demo:

```json
"ccipMessages": {
  "bridgeAttestation_alice": {
    "messageId": "0xa48328...",
    "trackUrl": "https://ccip.chain.link/msg/0xa48328..."
  },
  "invalidateBob": {
    "messageId": "0x3989fd...",
    "trackUrl": "https://ccip.chain.link/msg/0x3989fd..."
  }
}
```

---

## 7. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CHAINLINK COMPONENTS                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   CRE DON                                     │  │
│  │                                                              │  │
│  │  Vault DON ──secrets──► ConfidentialHTTP enclave            │  │
│  │                              │                              │  │
│  │                    4 API calls (private)                    │  │
│  │                              │                              │  │
│  │                    off-chain decision                       │  │
│  │                              │                              │  │
│  │                     EVMClient.writeReport()                 │  │
│  │                              │                              │  │
│  └──────────────────────────────┼───────────────────────────────┘  │
│                                 │                                   │
│          Chainlink Forwarder ◄──┘                                   │
│                  │                                                  │
│                  ▼                                                  │
│         ComplianceConsumer.onReport()    [contracts/src/]           │
│                  │                                                  │
│                  ▼                                                  │
│         ComplianceGateway.attestCompliance()                        │
│                  │                                                  │
│    ┌─────────────┴──────────────┐                                   │
│    │   CCIP Router (Sepolia)    │                                   │
│    │   AttestationSender        │  [contracts/src/]                 │
│    │   router.ccipSend()        │                                   │
│    └─────────────┬──────────────┘                                   │
│                  │  CCIP message                                     │
│                  │                                                  │
│    ┌─────────────▼──────────────┐                                   │
│    │  CCIP Router (Arb Sepolia) │                                   │
│    │  AttestationReceiver       │  [contracts/src/]                 │
│    │  _ccipReceive()            │                                   │
│    └─────────────┬──────────────┘                                   │
│                  │                                                  │
│                  ▼                                                  │
│         ComplianceGateway.receiveRemoteAttestation()                │
│         (Arb Sepolia)                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| Step | File | Chainlink API |
|------|------|---------------|
| 1. Schedule trigger | `main.ts` | `CronCapability().trigger()` |
| 2. Fetch API key | `main.ts` | Vault DON `vaultDonSecrets` |
| 3. Call compliance APIs | `main.ts` | `ConfidentialHTTPClient.sendRequest()` |
| 4. Aggregate consensus | `main.ts` | `consensusIdenticalAggregation()` |
| 5. Encode report | `main.ts` | `prepareReportRequest()` + `runtime.report()` |
| 6. Write on-chain | `main.ts` | `EVMClient.writeReport()` |
| 7. Receive report | `ComplianceConsumer.sol` | `onReport()` (IReceiver interface) |
| 8. Store attestation | `ComplianceGateway.sol` | `attestCompliance()` |
| 9. Bridge attestation | `AttestationSender.sol` | `router.ccipSend()` |
| 10. Receive on dest | `AttestationReceiver.sol` | `_ccipReceive()` (CCIPReceiver) |
| 11. Store remotely | `ComplianceGateway.sol` | `receiveRemoteAttestation()` |
| 12. Enforce on transfer | `ComplianceToken.sol` | `gateway.isCompliant()` |
