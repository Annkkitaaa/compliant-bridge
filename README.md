# Compliant Bridge

## Privacy-Preserving Cross-Chain Compliance for Tokenized Assets

> Built for the **Chainlink Convergence Hackathon** · [Live Demo](http://localhost:3000) · [Track CCIP Messages](https://ccip.chain.link)

---

## The Problem

Tokenized real-world assets — securities, funds, real estate, and regulated instruments — cannot exist on public blockchains without compliance enforcement. Every transfer must be checked against sanctions lists, KYC records, accreditation status, and jurisdictional restrictions. But performing those checks on a public blockchain is catastrophically privacy-hostile: compliance API credentials, investor KYC documents, sanctions query results, and jurisdiction data would all be permanently visible to anyone with a block explorer.

Existing compliance solutions force institutions to choose between transparency and privacy. On-chain compliance either exposes sensitive data publicly, or relies on opaque centralized oracles that introduce new trust assumptions. The result: institutional DeFi adoption stalls. Regulated asset issuers cannot tokenize on public chains without violating privacy regulations themselves.

The cross-chain dimension compounds the problem. A compliance attestation verified on one chain has zero portability — the asset can't bridge to another chain without re-running the entire compliance check, paying fresh fees, and introducing new latency. In a multi-chain world where assets flow freely between networks, this creates constant compliance friction with no good solution.

---

## The Solution

Compliant Bridge solves this with a three-layer architecture built entirely on Chainlink infrastructure. A single compliance check — executed privately inside a Chainlink CRE Confidential HTTP enclave — produces a minimal attestation that proves compliance without revealing any of the underlying data. The API key, the query, the response, and all PII stay inside the enclave. Only four numbers reach the blockchain: compliance tier (1/2/3), max transfer value, expiry timestamp, and a check ID.

That attestation is then portable. Via Chainlink CCIP, a single message carries the compliance proof to any destination chain in seconds, where it is cryptographically verified by the destination chain's ComplianceGateway. Tokens on the destination chain enforce compliance automatically — every transfer checks the local gateway, which may hold a remotely-attested record from the origin chain. No repeat compliance check. No re-kyc. No new API call.

When compliance status changes — a sanctions update, a KYC expiry, a regulatory flag — the AttestationInvalidator broadcasts a revocation across all chains simultaneously via CCIP. The revocation propagates atomically: the address becomes non-compliant on every chain at once. No gap where an invalidated wallet can continue trading on a destination chain.

---

## How It Works

```
User initiates transfer on Sepolia
              │
              ▼
┌─────────────────────────────────────────────────────┐
│              CRE Workflow (DON)                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │           Vault DON Secrets                  │   │
│  │   complianceApiKey (threshold-encrypted)     │   │
│  │   encryptionKey    (threshold-encrypted)     │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │ injected via Go template      │
│                     ▼                               │
│  ┌─────────────────────────────────────────────┐   │
│  │       ConfidentialHTTP Enclave               │   │
│  │   POST /sanctions-check  (x-api-key: ***)    │   │
│  │   POST /kyc-status       (x-api-key: ***)    │   │  ← API key NEVER in node memory
│  │   POST /accredited-investor                  │   │  ← Response stays in enclave
│  │   POST /jurisdiction-check                   │   │  ← Optional AES-GCM encryption
│  └──────────────────┬──────────────────────────┘   │
│                     │ off-chain decision             │
│                     ▼                               │
│  ┌─────────────────────────────────────────────┐   │
│  │       Compliance Decision (off-chain)        │   │
│  │   tier=1/2/3 · maxTransferValue · expiry     │   │  ← ONLY these 4 values
│  │   checkId                                    │   │     reach the blockchain
│  └──────────────────┬──────────────────────────┘   │
│                     │ DON-signed report              │
└─────────────────────┼───────────────────────────────┘
                      │
                      ▼
         ComplianceConsumer.onReport()
                      │
                      ▼
         ComplianceGateway.attestCompliance()
           (Sepolia · source chain)
                      │
          ┌───────────┴───────────┐
          │  AttestationSender    │
          │  router.ccipSend()    │
          └───────────┬───────────┘
                      │  CCIP Message (Chainlink)
                      │  messageId: 0xa483...aa0
                      ▼
         AttestationReceiver._ccipReceive()
                      │
                      ▼
         ComplianceGateway.receiveRemoteAttestation()
           (Arb Sepolia · destination chain)
                      │
                      ▼
         ComplianceToken._update() → isCompliant() ✅
```

**Revocation flow** (when sanctions list updates):
```
Regulator calls invalidateAcrossChains()
              │
     ┌────────┴──────────┐
     │                   │
     ▼                   ▼
Sepolia Gateway    CCIP → Arb Sepolia Gateway
revokeAttestation()      receiveRemoteRevocation()
(immediate)              (seconds later)
```

---

## Privacy Model

**What reaches the blockchain:** Only a minimal attestation — compliance tier (1/2/3), max transfer value, expiry timestamp, and a check ID. No sanctions data, no KYC documents, no identity information, no API credentials.

**What stays off-chain in CRE:**
- API credentials (stored in Vault DON with threshold encryption via `getSecret()`)
- All compliance API requests and raw responses
- Sanctions database queries and hit/miss results
- KYC verification details and document references
- Accredited investor documentation and net-worth assessments
- Jurisdiction analysis and restricted-country logic

**Three-layer visibility:**

| Viewer | Sees |
|--------|------|
| **Public** | Boolean compliance status (✅/❌) only — amounts, identities, and details are hidden |
| **Institution** | Own attestation details: tier, transfer limit, expiry, jurisdiction, bridge status |
| **Regulator** | Full compliance record: all four check results, source chain, history |

**Upgrade path:** The architecture is designed for Chainlink Confidential HTTP (when fully available on the DON) to extend privacy from "never on-chain" to "never visible to anyone except authorized parties" — adding enclave-level protection even from DON node operators.

---

## Chainlink Integration

> **Every Chainlink component used, with direct links to source files.**

| Chainlink Product | Source Files | Purpose |
|---|---|---|
| **CRE Workflow** | [`cre-workflow/compliance-check/main.ts`](./cre-workflow/compliance-check/main.ts) | Orchestrates the full compliance check on the DON with BFT consensus |
| **CRE ConfidentialHTTP** | [`cre-workflow/compliance-check/main.ts`](./cre-workflow/compliance-check/main.ts) — `ConfidentialHTTPClient`, `fetchSanctionsCheck`, `fetchKycStatus`, `fetchAccreditedInvestor`, `fetchJurisdictionCheck` | Makes private API calls inside a secure enclave; API key injected via Go template, never in node memory |
| **CRE Secrets (Vault DON)** | [`cre-workflow/secrets.yaml`](./cre-workflow/secrets.yaml), [`cre-workflow/compliance-check/main.ts`](./cre-workflow/compliance-check/main.ts) — `vaultDonSecrets` field in every `sendRequest()` | Stores `complianceApiKey` and `encryptionKey` with threshold encryption across DON nodes |
| **CRE EVMClient** | [`cre-workflow/compliance-check/main.ts`](./cre-workflow/compliance-check/main.ts) — `submitAttestationOnChain()`, `EVMClient.writeReport()` | Writes DON-signed compliance reports on-chain via the Chainlink Forwarder |
| **CRE CronCapability** | [`cre-workflow/compliance-check/main.ts`](./cre-workflow/compliance-check/main.ts) — `CronCapability().trigger()` | Schedules periodic compliance re-checks (every 5 minutes in staging) |
| **CRE Report Consumer** | [`contracts/src/ComplianceConsumer.sol`](./contracts/src/ComplianceConsumer.sol) — `onReport(bytes, bytes)` | Receives DON-signed reports from the Chainlink Forwarder and decodes the attestation payload |
| **CCIP (Send)** | [`contracts/src/AttestationSender.sol`](./contracts/src/AttestationSender.sol) — `sendAttestation()`, `bridgeTokenWithAttestation()` | Sends cross-chain compliance attestation messages from Sepolia to Arb Sepolia |
| **CCIP (Receive)** | [`contracts/src/AttestationReceiver.sol`](./contracts/src/AttestationReceiver.sol) — `_ccipReceive()` | Receives attestation and revocation messages on the destination chain |
| **CCIP (Revocation)** | [`contracts/src/AttestationInvalidator.sol`](./contracts/src/AttestationInvalidator.sol) — `invalidateAcrossChains()` | Broadcasts simultaneous revocations to all chains via CCIP |
| **CCIP Client Library** | [`contracts/src/ccip/Client.sol`](./contracts/src/ccip/Client.sol) | `EVM2AnyMessage`, `Any2EVMMessage`, `_argsToBytes()` — message encoding with `EVMExtraArgsV1Tag` |
| **CCIP IRouterClient** | [`contracts/src/ccip/IRouterClient.sol`](./contracts/src/ccip/IRouterClient.sol) | CCIP router interface for `getFee()` and `ccipSend()` |
| **CCIP CCIPReceiver** | [`contracts/src/ccip/CCIPReceiver.sol`](./contracts/src/ccip/CCIPReceiver.sol) | Base contract for `AttestationReceiver`; provides `_ccipReceive()` hook |
| **CCIP (Frontend)** | [`frontend/lib/contracts.ts`](./frontend/lib/contracts.ts) — `ADDRESSES.ccip.arbSepoliaSelector` | Arb Sepolia chain selector used to route `sendAttestation()` call |

**Live CCIP messages on testnet:**

| Message | Chain | CCIP Explorer |
|---------|-------|---------------|
| Alice attestation bridge | Sepolia → Arb Sepolia | [0xa483…aa0](https://ccip.chain.link/msg/0xa48328ae8c953a1e6a1aca42b779abb76e68d1d25f11d83b96e5337d97611aa0) |
| Bob revocation broadcast | Sepolia → Arb Sepolia | [0x3989…bb7](https://ccip.chain.link/msg/0x3989fdca1e00a6e028e1bcae7b77059cb198470e7058d80270451b95b483cbb7) |

---

## Deployed Contracts

### Sepolia (Source Chain · Chain ID 11155111)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| ComplianceGateway | `0x472E9A6eC84ad6eA1EE7F816c7dE92530Eb67d33` | [View](https://sepolia.etherscan.io/address/0x472E9A6eC84ad6eA1EE7F816c7dE92530Eb67d33) |
| ComplianceToken (CBT) | `0x3B8DfFB39a66e7d861C7d02614F5491e4C1A475a` | [View](https://sepolia.etherscan.io/address/0x3B8DfFB39a66e7d861C7d02614F5491e4C1A475a) |
| RegulatorView | `0x588a5851A7184655bcF52849e9748B24eF90E37f` | [View](https://sepolia.etherscan.io/address/0x588a5851A7184655bcF52849e9748B24eF90E37f) |
| ComplianceConsumer | `0x4de32d6AF6bBb30C69107FccC69DE53f1744CD72` | [View](https://sepolia.etherscan.io/address/0x4de32d6AF6bBb30C69107FccC69DE53f1744CD72) |
| AttestationSender | `0x21F4DaEaE24E6ca825315813680317F1A218f6d5` | [View](https://sepolia.etherscan.io/address/0x21F4DaEaE24E6ca825315813680317F1A218f6d5) |
| AttestationInvalidator | `0x9982dB04ac6b3d158694ea7c0aCDa0872daEc1ea` | [View](https://sepolia.etherscan.io/address/0x9982dB04ac6b3d158694ea7c0aCDa0872daEc1ea) |
| CCIP Router | `0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59` | Chainlink official |
| LINK Token | `0x779877A7B0D9E8603169DdbD7836e478b4624789` | Chainlink official |

### Compliant Liquidity Pool — Sepolia (Chain ID 11155111)

> Separate gateway instance — does not affect the existing Sepolia contracts above.

| Contract | Address | Etherscan |
|----------|---------|-----------|
| Pool ComplianceGateway | `0xCEE67A28A6e552BEe87ac975Aad08122345FC510` | [View](https://sepolia.etherscan.io/address/0xCEE67A28A6e552BEe87ac975Aad08122345FC510) |
| IUSD (Mock stablecoin, 6 dec) | `0x883Fe2CDf7fF5ef60a5fbae827C49B8814147E84` | [View](https://sepolia.etherscan.io/address/0x883Fe2CDf7fF5ef60a5fbae827C49B8814147E84) |
| tTREAS (Mock T-bill token, 18 dec) | `0x53F89a4B9827ea21af9D08139CA8C9E0bA6F98a1` | [View](https://sepolia.etherscan.io/address/0x53F89a4B9827ea21af9D08139CA8C9E0bA6F98a1) |
| CompliancePool Tier 1 (Basic) | `0x8D56d02Cbc58501A63DEBd700CcbBCdF97BdaE4D` | [View](https://sepolia.etherscan.io/address/0x8D56d02Cbc58501A63DEBd700CcbBCdF97BdaE4D) |
| CompliancePool Tier 2 (Accredited) | `0xfF9d3665dabe84Ea67285802a4A234abea8B9806` | [View](https://sepolia.etherscan.io/address/0xfF9d3665dabe84Ea67285802a4A234abea8B9806) |
| CompliancePool Tier 3 (Institutional) | `0xeCF174e463919cA04C199fBb0543675C83738128` | [View](https://sepolia.etherscan.io/address/0xeCF174e463919cA04C199fBb0543675C83738128) |

### Arbitrum Sepolia (Destination Chain · Chain ID 421614)

| Contract | Address | Arbiscan |
|----------|---------|----------|
| ComplianceGateway | `0x64f0d037a4F4B46A9F11E01c2144b042bF638F76` | [View](https://sepolia.arbiscan.io/address/0x64f0d037a4F4B46A9F11E01c2144b042bF638F76) |
| ComplianceToken (CBT) | `0x472E9A6eC84ad6eA1EE7F816c7dE92530Eb67d33` | [View](https://sepolia.arbiscan.io/address/0x472E9A6eC84ad6eA1EE7F816c7dE92530Eb67d33) |
| RegulatorView | `0x3B8DfFB39a66e7d861C7d02614F5491e4C1A475a` | [View](https://sepolia.arbiscan.io/address/0x3B8DfFB39a66e7d861C7d02614F5491e4C1A475a) |
| AttestationReceiver | `0xC05937c6f2140A32526Ef75353dbeca44f763AEC` | [View](https://sepolia.arbiscan.io/address/0xC05937c6f2140A32526Ef75353dbeca44f763AEC) |
| AttestationInvalidator | `0x50F87c2a17FcE0612b26F8B9CADAde106F5F69d6` | [View](https://sepolia.arbiscan.io/address/0x50F87c2a17FcE0612b26F8B9CADAde106F5F69d6) |
| CCIP Router | `0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165` | Chainlink official |
| LINK Token | `0xb1D4538B4571d411F07960EF2838Ce337FE1E80E` | Chainlink official |

---

## Prize Tracks

### Privacy Track
The CRE Confidential HTTP enclave ensures compliance API credentials and all raw compliance data never leave the secure execution environment. Secrets are stored in the Vault DON with threshold encryption — no single node can reconstruct them. The optional `encryptOutput: true` mode adds AES-GCM encryption of API responses inside the enclave, meaning even the response bytes are encrypted before leaving. Only the four-number attestation (tier, limit, expiry, checkId) ever touches the blockchain.

### DeFi & Tokenization Track
Compliant Bridge enables tokenized real-world assets to trade compliantly across chains. The `ComplianceToken._update()` hook enforces compliance on every transfer — both sender and receiver must hold valid attestations, and transfer amounts are capped by the attestation's `maxTransferValue`. A single CRE compliance check, bridged via CCIP, unlocks regulated trading on any supported chain without re-running compliance.

The **Compliant Liquidity Pool (CLP)** extends this to DeFi primitives: three constant-product AMM pools (Tier 1 / 2 / 3) gated by an `onlyCompliant` modifier that checks `ComplianceGateway.isCompliantWithTier()` on every `swap()`, `addLiquidity()`, and `removeLiquidity()`. Non-compliant wallets are blocked at the smart contract level — not just the UI. This is the first institutional DeFi pool where access is controlled by on-chain privacy-preserving compliance attestations.

### Risk & Compliance Track
The `AttestationInvalidator.invalidateAcrossChains()` function enables regulators to instantly propagate sanctions updates or KYC expirations across all chains simultaneously. A single transaction revokes an attestation locally and broadcasts CCIP revocation messages to every destination chain in one atomic operation. The `RegulatorView` contract provides jurisdiction-gated access to full compliance details including transfer history, tier breakdown, and attestation provenance.

---

## Demo Video

> [Add link after recording]

The demo shows the complete compliance lifecycle in 3-5 minutes:
1. **CRE Check** — CRE workflow running Confidential HTTP calls; attestation written on-chain
2. **Attestation** — Institution wallet's compliance details in the dashboard
3. **CCIP Bridge** — Bridging the attestation from Sepolia to Arb Sepolia
4. **Destination** — Attestation arriving on Arb Sepolia; token transfer unlocked
5. **Revocation** — Regulator invalidates across both chains simultaneously
6. **Split View** — Same transaction seen through Public / Institution / Regulator lenses

---

## How to Run

### Prerequisites
- Node.js 18+ and npm
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Bun (`curl -fsSL https://bun.sh/install | bash`)
- CRE CLI (`curl -fsSL https://github.com/smartcontractkit/cre-cli/releases/latest/... | bash`)
- MetaMask with Sepolia ETH and LINK

### 1. Clone and install

```bash
git clone https://github.com/your-repo/compliant-bridge
cd compliant-bridge
```

### 2. Run the mock compliance API

```bash
cd compliance-api
npm install
npm run dev
# Starts on http://localhost:3001
```

The API provides five endpoints that simulate real compliance providers:
- `POST /api/v1/sanctions-check` — OFAC-style sanctions screening
- `POST /api/v1/kyc-status` — KYC verification status
- `POST /api/v1/accredited-investor` — SEC accreditation check
- `POST /api/v1/jurisdiction-check` — Geographic restrictions
- `POST /api/v1/full-compliance-check` — Combined check (convenience)

### 3. Simulate the CRE workflow

```bash
cd cre-workflow
export COMPLIANCE_API_KEY_ALL="demo-key-123"
export AES_ENCRYPTION_KEY_ALL="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
cre workflow simulate ./compliance-check \
  --target staging-settings \
  --non-interactive \
  --trigger-index 0
```

### 4. Run the frontend

```bash
cd frontend
npm install

# Required: set the deployer private key so the /api/attest relay can sign transactions
cp .env.local.example .env.local
# Edit .env.local and set ATTESTOR_PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY

npm run dev
# Opens at http://localhost:3000
```

The frontend connects to live contracts on Sepolia and Arb Sepolia automatically. Enable **Demo Mode** in the header for the step-by-step guided walkthrough.

**Compliance relay (`/api/attest`):** Any visitor can click "Request Compliance Check" in the Institution or Compliant Pool tab. This calls the Next.js server-side API route, which uses the deployer key to call `attestCompliance()` on both gateways on behalf of the user's wallet. Tier 1 attestation is issued automatically — no manual deployer action needed.

### 5. Deploy contracts (optional — already deployed)

```bash
cd contracts
export PATH="$HOME/.foundry/bin:$PATH"
cp .env.example .env  # fill in PRIVATE_KEY and RPC URLs

# Deploy to Sepolia
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC --broadcast

# Deploy to Arb Sepolia
forge script script/Deploy.s.sol --rpc-url $ARB_SEPOLIA_RPC --broadcast

# Configure CCIP allowlists
forge script script/ConfigureCCIP.s.sol --rpc-url $SEPOLIA_RPC --broadcast
forge script script/ConfigureCCIP.s.sol --rpc-url $ARB_SEPOLIA_RPC --broadcast
```

---

## Repository Structure

```
compliant-bridge/
├── cre-workflow/                    # Chainlink CRE workflow
│   ├── compliance-check/
│   │   ├── main.ts                  # ← CRE SDK: ConfidentialHTTP + EVMClient
│   │   ├── workflow.yaml            # CRE workflow settings
│   │   ├── config.json              # Staging config (Sepolia)
│   │   └── abi/ComplianceConsumer   # ABI for on-chain write
│   ├── project.yaml                 # CRE project / RPC settings
│   └── secrets.yaml                 # Vault DON secret names
│
├── contracts/                       # Foundry project
│   └── src/
│       ├── ComplianceGateway.sol    # Core attestation store + tier queries
│       ├── ComplianceToken.sol      # ERC-20 with compliance hooks
│       ├── ComplianceConsumer.sol   # ← CRE report receiver
│       ├── AttestationSender.sol    # ← CCIP sender
│       ├── AttestationReceiver.sol  # ← CCIP receiver
│       ├── AttestationInvalidator.sol # ← CCIP revocation broadcaster
│       ├── RegulatorView.sol        # Regulator-gated data access
│       ├── CompliancePool.sol       # Compliance-gated AMM (swap/liquidity)
│       ├── MockERC20.sol            # Test tokens: IUSD + tTREAS
│       └── ccip/                    # ← Chainlink CCIP interfaces
│           ├── Client.sol
│           ├── IRouterClient.sol
│           └── CCIPReceiver.sol
│
├── compliance-api/                  # Mock compliance API (Node.js/Express)
│   └── src/
│       ├── routes/                  # sanctions, kyc, accredited, jurisdiction
│       └── data/seed-data.ts        # Test wallet profiles
│
├── frontend/                        # Next.js dashboard
│   ├── app/
│   │   ├── page.tsx                 # Main page + demo mode + 4 tabs
│   │   └── api/attest/route.ts      # ← Compliance relay: attests any wallet server-side
│   ├── components/
│   │   ├── tabs/                    # PublicTab, InstitutionTab, RegulatorTab, PoolTab
│   │   └── demo/                    # DemoPanel, FlowBar, SplitView, etc.
│   ├── context/DemoContext.tsx      # Demo state management
│   ├── lib/
│   │   ├── contracts.ts             # ← CCIP addresses + all contract ABIs + POOL_ADDRESSES
│   │   ├── useCompliancePool.ts     # ← Pool hooks: swap, liquidity, compliance, faucet
│   │   └── demoScript.ts            # 6-step demo script
│   ├── .env.local.example           # ATTESTOR_PRIVATE_KEY template
│   └── deployments.json             # Live contract addresses + CCIP message IDs
│
└── docs/
    └── chainlink-integration.md     # Detailed file-by-file Chainlink mapping
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24 · Foundry · OpenZeppelin ERC-20 |
| Cross-Chain | Chainlink CCIP · `IRouterClient` · `CCIPReceiver` |
| Off-Chain Compliance | Chainlink CRE · `ConfidentialHTTPClient` · `EVMClient` |
| Secrets | Chainlink Vault DON · threshold encryption |
| Compliance-Gated AMM | `CompliancePool.sol` · constant-product AMM · `onlyCompliant` modifier |
| Compliance Relay | Next.js API route (`/api/attest`) · server-side attestation for any wallet |
| Mock APIs | Node.js · Express · TypeScript |
| Frontend | Next.js 15 · Tailwind CSS v4 · ethers.js v6 |
| Testnets | Sepolia (source) · Arbitrum Sepolia (destination) |

---

## Future Work

- **Real compliance providers** — Replace mock API with Chainalysis (sanctions), Jumio (KYC), Plaid (accreditation) — the CRE workflow is already structured for it; only `complianceApiBaseUrl` changes
- **Chainlink Confidential HTTP** — When the full production enclave is available on the DON, upgrade `encryptOutput: true` mode to encrypt responses before any node can read them, extending privacy guarantees to node-operator level
- **Chainlink Private Transactions** — Deliver attestations confidentially without exposing the subject address in the mempool
- **Additional chain support** — CCIP supports 20+ chains; the AllowList pattern in `AttestationReceiver` makes adding new destinations a one-transaction operation
- **ERC-7786 cross-chain message standard** — Adopt the emerging standard for compliance message portability
- **Attestation delegation** — Allow institutions to grant attestation portability to sub-wallets

---

*Built with Chainlink CRE · Chainlink CCIP · Confidential HTTP*
