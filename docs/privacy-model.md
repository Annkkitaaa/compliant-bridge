# Privacy Model: Compliant Bridge

## Overview

Compliant Bridge implements privacy-preserving compliance attestations using Chainlink's
Compute Runtime Environment (CRE). The architecture ensures that sensitive compliance data
(KYC documents, sanctions lists, accreditation records) never touches the blockchain while
still providing verifiable, cross-chain compliance proofs.

## Privacy Layers

### Layer 1: Confidential HTTP (CRE ConfidentialHTTPClient)

Compliance API calls execute inside a **secure enclave** provided by the CRE runtime.

- **Secret isolation**: API credentials are decrypted **only inside the enclave** via Go
  template injection (`{{.complianceApiKey}}`). Secrets are never present in node memory.
- **Single execution guarantee**: Exactly one API call per check, not one per DON node.
  The enclave executes the request once, and nodes reach consensus on request parameters.
- **Response encryption (optional)**: When `encryptOutput: true` is set, the API response
  is AES-256-GCM encrypted before leaving the enclave. Response body becomes:
  `nonce (12B) || ciphertext || tag (16B)`. Only the holder of the symmetric key can
  decrypt the raw compliance data.

```
                     Secure Enclave
                    +-----------------+
  Config ---------> | Template inject |
  (public values)   | {{.apiKey}}     |
                    |                 |
  Vault Secrets --> | Decrypt secrets |
  (encrypted)       |                 |
                    | HTTP Request    | -----> Compliance API
                    |                 | <----- Response
                    | [Encrypt output]|
                    +-----------------+
                           |
                    Consensus on params
                           |
                    Workflow continues
```

### Layer 2: Off-Chain Execution (CRE Workflow)

All compliance logic runs off-chain within the CRE workflow engine.

- **Sanctions screening**: Checked against external sanctions databases — result stays off-chain
- **KYC verification**: Status and expiry validated — documents never on-chain
- **Accredited investor checks**: Accreditation type determines tier — details stay off-chain
- **Jurisdiction analysis**: Restricted jurisdiction checks — geo data stays off-chain

Only a **minimal attestation** reaches the blockchain:

| On-Chain Data | Description |
|---------------|-------------|
| `tier` | Compliance tier (1=retail, 2=accredited, 3=institutional) |
| `maxTransferValue` | Maximum allowed transfer value for this tier |
| `validUntil` | Attestation expiry timestamp (24h default) |
| `checkId` | Opaque identifier (no PII) |
| `jurisdictionData` | Jurisdiction code only (e.g., "US"), not address or details |

### Layer 3: Cross-Chain Portability (CCIP)

Attestations travel across chains via Chainlink CCIP without re-checking.

- **No re-verification**: Destination chain trusts the source chain's attestation
- **No additional API calls**: Zero additional data exposure on cross-chain transfer
- **Cross-chain invalidation**: Revocations propagate to all chains via `AttestationInvalidator`
- **Chain-agnostic proofs**: Same attestation format works on any EVM chain

## What Each Party Sees

| Data | Public | Institution | Regulator |
|------|--------|-------------|-----------|
| Compliance status | Boolean only | Boolean | Boolean |
| Tier & limits | On-chain | Own data | Any address |
| Sanctions details | Never | Never | Full check via API |
| KYC documents | Never | Never | Via compliance API |
| API credentials | Never | Never | Never (enclave only) |
| Raw API responses | Never | Never | Via RegulatorView |
| Transfer history | Never | Own transfers | Full history |

## Comparison: Regular HTTP vs Confidential HTTP

| Aspect | Regular HTTP | ConfidentialHTTPClient |
|--------|-------------|----------------------|
| API credentials | Decrypted in node memory | Decrypted only in enclave |
| Request execution | One per node (N calls) | Exactly one (enclave) |
| Response visibility | All DON nodes see response | Optionally encrypted |
| Consensus model | On response data | On request parameters |
| Secret management | Environment variables | Vault DON with namespaces |

## Response Encryption Flow

When `encryptOutput: true` is configured:

```
  Enclave                          Backend Service
  +------------------+             +------------------+
  | 1. HTTP request  |             |                  |
  | 2. Get response  |             |                  |
  | 3. AES-GCM encrypt|            |                  |
  |    with vault key |             |                  |
  | 4. Return encrypted| ---------> | 5. Receive bytes |
  |    bytes          |             | 6. AES-GCM decrypt|
  +------------------+             |    with same key  |
                                   | 7. Parse JSON     |
                                   +------------------+
```

The encryption key is stored in Chainlink's Vault DON and is never exposed to
individual nodes. Only the enclave and the authorized backend service hold the
symmetric key.

## Chainlink ACE Alignment

Compliant Bridge demonstrates the same privacy-preserving compliance pattern that
powers Chainlink's Automated Compliance Engine (ACE):

- **Automated policy enforcement** via CRE workflows
- **Credential isolation** via Confidential HTTP and Vault DON secrets
- **Off-chain execution** with minimal on-chain attestation footprint
- **Cross-chain portability** via CCIP for "check once, use everywhere"
- **Regulatory access** via RegulatorView without exposing data publicly
