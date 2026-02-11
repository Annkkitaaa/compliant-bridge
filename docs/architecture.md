# CrossChain Compliance Gateway — Architecture

## 1. System Overview

The CrossChain Compliance Gateway enables **check-once, use-everywhere** compliance for tokenized asset transfers. A compliance check runs privately through Chainlink CRE using Confidential HTTP, producing an on-chain attestation that travels cross-chain via CCIP.

**Core flow:**

```
Token Contract ──► CRE Workflow ──► Confidential HTTP ──► Compliance APIs
                                                              │
                                                    (KYC, Sanctions,
                                                     Accredited Investor,
                                                     Jurisdiction checks)
                                                              │
                                                              ▼
                                                   Attestation on-chain
                                                              │
                                                     CCIP message ──► Destination chain
```

**Key innovation:** Compliance is verified once on the source chain. The attestation — not the sensitive data — is what crosses chains. Destination chains trust the attestation without re-running checks or seeing private user data.

## 2. User Perspectives

### Public (sees nothing)

- Sees that a transfer was approved or rejected — nothing more.
- Cannot determine *why* a transfer was blocked or what data was checked.
- On-chain attestation contains only: subject address, pass/fail, expiry, and issuer signature.

### Institution (sees own compliance data)

- Submits compliance requests for their users.
- Receives the attestation result tied to their users' addresses.
- Can query attestation status and expiry for their own users.
- Cannot see other institutions' compliance data or internal scoring.

### Regulator (sees full compliance details for their jurisdiction)

- Has a privileged view role scoped to their jurisdiction.
- Can query the compliance API (off-chain) for detailed check results within their jurisdiction.
- Can see which checks passed/failed and the timestamps, but only for addresses within their regulatory scope.
- On-chain: can verify attestation validity. Off-chain: can request full audit logs through the compliance API.

## 3. Components

| Component | Description |
|---|---|
| **ComplianceAttestation.sol** | On-chain registry that stores attestations (address → status, expiry, checkHash). Emits events for indexing. |
| **TransferGate.sol** | Hook/modifier layer that token contracts call before transfers. Queries the attestation registry and blocks non-compliant transfers. |
| **CCIPAttestationBridge.sol** | Sends and receives attestations cross-chain via Chainlink CCIP. On the destination chain, writes into a local attestation registry. |
| **CRE Workflow** | Chainlink CRE workflow that orchestrates the compliance check. Receives a request, calls compliance APIs via Confidential HTTP, aggregates results, and writes the attestation on-chain. |
| **Compliance API (mock)** | REST API simulating third-party compliance providers (KYC, sanctions list, accredited investor, jurisdiction). Returns pass/fail per check type. |
| **Frontend** | Demo UI for requesting compliance checks, viewing attestation status, and triggering cross-chain transfers. |

## 4. Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SOURCE CHAIN (Sepolia)                        │
│                                                                        │
│  ┌──────────┐    ┌───────────────┐    ┌────────────────────────┐       │
│  │  User /  │───►│ TransferGate  │───►│ ComplianceAttestation  │       │
│  │  dApp    │    │  (pre-check)  │    │  Registry (on-chain)   │       │
│  └──────────┘    └───────────────┘    └────────────┬───────────┘       │
│       │                                            │                   │
│       │  request compliance                        │ attestation       │
│       ▼                                            │ stored            │
│  ┌──────────────────────┐                          │                   │
│  │   CRE Workflow       │                          │                   │
│  │                      │                          │                   │
│  │  1. Receive request  │                          │                   │
│  │  2. Call APIs via    │──── Confidential ───►┌───┴───────────┐      │
│  │     Confidential HTTP│      HTTP            │ Compliance    │      │
│  │  3. Aggregate results│◄─────────────────────│ APIs (off-    │      │
│  │  4. Write attestation│                      │ chain, mock)  │      │
│  └──────────────────────┘                      └───────────────┘      │
│                                                                        │
│  ┌────────────────────────┐                                            │
│  │ CCIPAttestationBridge  │──── CCIP message ──────────────────────┐   │
│  │  (sender)              │                                        │   │
│  └────────────────────────┘                                        │   │
└─────────────────────────────────────────────────────────────────────│───┘
                                                                     │
┌─────────────────────────────────────────────────────────────────────│───┐
│                      DESTINATION CHAIN (Fuji / Amoy)               │   │
│                                                                    ▼   │
│  ┌────────────────────────┐    ┌────────────────────────┐              │
│  │ CCIPAttestationBridge  │───►│ ComplianceAttestation  │              │
│  │  (receiver)            │    │  Registry (mirror)     │              │
│  └────────────────────────┘    └────────────┬───────────┘              │
│                                             │                          │
│  ┌──────────┐    ┌───────────────┐          │                          │
│  │  User /  │───►│ TransferGate  │──────────┘                          │
│  │  dApp    │    │  (pre-check)  │  queries local attestation          │
│  └──────────┘    └───────────────┘                                     │
│                                                                        │
│  No compliance re-check needed — attestation already bridged.          │
└────────────────────────────────────────────────────────────────────────┘
```

### Privacy boundary

```
On-chain (public):        address, pass/fail, expiry, checkHash, issuer
Off-chain (private):      PII, check details, scores, API responses
Confidential HTTP:        Ensures even CRE node operators cannot see API payloads
```
