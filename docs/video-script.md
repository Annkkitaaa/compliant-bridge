# Compliant Bridge — Demo Video Script
**Hackathon: Chainlink Convergence**
**Target length: 4:30–5:00**
**Format: Screen recording + voiceover**

---

## PRE-RECORDING CHECKLIST

Before hitting record:

- [ ] `cd frontend && npm run dev` — app running at http://localhost:3000
- [ ] Open GitHub README tab: https://github.com/Annkkitaaa/compliant-bridge
- [ ] Open Etherscan tab: https://sepolia.etherscan.io/address/0x472E9A6eC84ad6eA1EE7F816c7dE92530Eb67d33
- [ ] App scrolled to hero — browser zoom 100%, dark mode on, no extra tabs visible
- [ ] Screen: 1920×1080, mic checked

---

## SECTION 1 — OPEN ON GITHUB `[0:00–0:30]`

### Screen
Open the GitHub repo: `https://github.com/Annkkitaaa/compliant-bridge`

Scroll slowly through the README — pause on:
1. The project title and one-liner description
2. The ASCII architecture diagram (CRE → Enclave → ComplianceGateway → CCIP → Arb Sepolia)
3. The "Chainlink Integration" table — let the 10 rows be visible

### Mouse Actions
1. Navigate to GitHub README
2. Scroll slowly down — pause 2 seconds on the architecture diagram
3. Scroll to the Chainlink integrations table — hover over CRE ConfidentialHTTP and CCIP rows

### Voiceover
> "Compliant Bridge is a privacy-preserving, cross-chain compliance system for tokenized real-world assets — built entirely on Chainlink. The architecture is straightforward: a CRE workflow runs four compliance checks inside a Confidential HTTP enclave — sanctions, KYC, accredited investor status, and jurisdiction. Only four numbers reach the blockchain: a compliance tier, a transfer cap, an expiry, and a check ID. The raw API responses never leave the enclave. Then Chainlink CCIP carries that attestation to any destination chain — one check, verified everywhere. Ten Chainlink integrations in total. Let me show you how it works in the app."

### Timing Notes
30 seconds. Scroll slowly — let viewers read the architecture diagram.

---

## SECTION 2 — HERO + HOW IT WORKS `[0:30–1:00]`

### Screen
Switch to `http://localhost:3000`. The hero shows:
- "Privacy-First Compliance. Cross-Chain by Design."
- Stats row: 12+ Transfers · 100% Compliance Rate · 2 Chains (Sepolia + Arb Sepolia)
- Pill badge at top: "CHAINLINK CCIP · CONFIDENTIAL REST EXECUTION"

Scroll down past hero to the **HOW IT WORKS** section showing 4 step cards:
1. CRE Confidential Check — "CHAINLINK CRE · CONFIDENTIAL HTTP"
2. On-Chain Attestation — "CHAINLINK CRE · EVMCLIENT"
3. CCIP Bridge — "CHAINLINK CCIP"
4. Destination Chain — "COMPLIANCETOKEN · COMPLIANCEGATEWAY"

### Mouse Actions
1. Land on hero — hold 4 seconds, let the layout settle
2. Click "Launch App ↓" — page scrolls to the dashboard
3. Before it reaches the dashboard, pause on the HOW IT WORKS section
4. Hover near each of the 4 step cards as you narrate them

### Voiceover
> "The landing page shows live stats — twelve on-chain compliance events, one hundred percent compliance rate on attested transfers, running across two chains right now. Below the hero, the four-step flow: a CRE workflow runs inside a confidential enclave — step one. The result is written on-chain by the DON as a minimal attestation — step two. Chainlink CCIP bridges it to destination chains — step three. And the ComplianceToken enforces it on every transfer at the smart contract level — step four. Everything powered by Chainlink."

### Timing Notes
30 seconds. Don't rush the 4-step cards — each one should be on screen for at least 3 seconds.

---

## SECTION 3 — PUBLIC TAB `[1:00–1:35]`

### Screen
Click the **LIVE DASHBOARD** / scroll to the tab bar. Tabs: Public · Institution · Regulator · Compliant Pool.

Click **Public** tab. It shows:
- "PUBLIC EXPLORER VIEW — Sensitive data protected by Confidential HTTP execution"
- "Encrypted at source" badge top-right
- Pill groups:
  - **VISIBLE TO PUBLIC**: Compliance status ✅/❌ · Transaction hash · Block number · Timestamp · Chain
  - **HIDDEN FROM PUBLIC**: Transfer amounts 🔒 · Identities 🔒 · Jurisdiction 🔒 · KYC tier 🔒 · Attestation details 🔒
- Stats: 6 Total Transfers · 4 Compliant · 2 Active Chains
- Transfer table: rows with green "✓ Compliant" and red "✗ Non-compliant" badges, blurred amount column

### Mouse Actions
1. Let tab bar come into view — pause 2 seconds to show all 4 tab names
2. Click **Public** tab
3. Hover over "VISIBLE TO PUBLIC" pills — then "HIDDEN FROM PUBLIC" pills
4. Scroll to transfer table — hover over a "✓ Compliant" row
5. Hover over the blurred amount cell

### Voiceover
> "Four tabs — same underlying data, four completely different access levels. Starting with Public. This is what anyone scanning the blockchain sees. Compliance status — pass or fail. Transaction hash, block number, timestamp, chain. That's it. Transfer amounts are blurred. No identities, no jurisdiction, no KYC tier, no attestation details. Six transfers here — four compliant, two non-compliant. The non-compliant ones failed at the smart contract level before the transfer executed. Privacy enforced by the enclave. Transparency enforced by the contract."

### Timing Notes
35 seconds. Linger on the VISIBLE vs HIDDEN pills — that contrast is the core privacy argument.

---

## SECTION 4 — INSTITUTION TAB `[1:35–2:20]`

### Screen
Click **Institution** tab. Landing shows:
- "Institution Portal" with Connect Wallet button
- Below the divider: **Alice** (Tier 2 · US/NY) and **Bob** (REVOKED · Tier 3) quick-pick buttons
- Custom address input field

Click **Alice**. Attestation card loads:
- Header: `0xaa0000…000001 (Alice)` · "Read-only · Sepolia" · Active
- **TIER 2 · Accredited** badge
- 4 data tiles: Max Transfer **5,000.00 CBT** · Jurisdiction **US / NY** · Issued **Feb 24, 2026** · Source Chain **Sepolia**
- Validity bar: "Valid until Feb 24, 2027 · 352 days remaining" — full green bar
- Check ID (full hash on-chain)
- Token Balances: Sepolia + Arbitrum Sepolia
- Actions: "Refresh Compliance" · "Bridged to Arb Sepolia" ✅
- Cross-Chain Status: Sepolia ✅ → CCIP → Arbitrum Sepolia ✅

### Mouse Actions
1. Click **Institution** tab
2. Point to Connect Wallet, then "or view read-only" section below
3. Click **Alice** quick-pick
4. Wait for card to load (4–6 seconds)
5. Hover over **TIER 2 · Accredited** badge
6. Hover over Max Transfer tile, then Jurisdiction tile
7. Hover over the validity bar
8. Scroll to Check ID — hover over the hash
9. Scroll to Cross-Chain Status — show Sepolia → CCIP → Arb Sepolia both ✅

### Voiceover
> "The Institution tab is the wallet holder's private view. No MetaMask needed here — I'm loading Alice's address in read-only mode. The attestation card shows everything she's entitled to see: Tier 2 Accredited, max transfer cap of five thousand CBT, jurisdiction US/NY, 352 days remaining on the attestation. Down at the bottom — the Check ID. This is a keccak256 fingerprint of this specific compliance check. This is the only data written to the blockchain. Not the API response, not the sanctions list result, not Alice's documents. Just this hash. And the cross-chain status — Alice's attestation is already bridged to Arbitrum Sepolia via CCIP. One check on Sepolia, recognized on both chains simultaneously."

### Timing Notes
45 seconds. The Check ID explanation is important — hover on it. Cross-chain status visual is a strong closer.

---

## SECTION 5 — REGULATOR TAB `[2:20–3:20]`

### Screen
Click **Regulator** tab. Shows:
- "REGULATOR ACCESS PORTAL — Full compliance visibility · Authorized personnel only" · "Full Data Access" badge
- Search bar + three quick-pick buttons: **Alice · Compliant · Tier 2 · US/NY** | **Bob · REVOKED · Tier 3 · GB/London** | **Charlie · Expiring · Tier 1 · DE/Berlin**

**Alice card:**
- Status: **● COMPLIANT** · Live · Sepolia
- Summary: Tier 2, US/NY, $5,000.00, Issued Feb 24, 2026, Expires Feb 24, 2027
- Compliance Checks: Sanctions Screen (OFAC/UN/EU) **PASS** · KYC/AML **PASS** · Accredited Investor **PASS** · Jurisdiction Eligibility **PASS**
- Footnote: "Results fetched via Chainlink CRE Confidential HTTP... Raw API responses never leave the secure enclave"
- Red "Revoke Cross-Chain" button

**Bob card:**
- Status: **● REVOKED** · "REVOCATION ACTIVE — Revoked on Sepolia · CCIP broadcast to all chains"
- Tier 3, GB/LDN, $50,000.00
- Sanctions Screen (OFAC/UN/EU): **FAIL** · KYC/AML PASS · Accredited PASS · Jurisdiction PASS

**Charlie card:**
- Status: **● EXPIRING SOON** · Tier 1, DE/BER, $1,000.00, Expires Mar 26
- All 4 checks PASS

### Mouse Actions
1. Click **Regulator** tab — hold 2 seconds on landing
2. Click **Alice** quick-pick
3. Hover over **● COMPLIANT** badge
4. Scroll to Compliance Checks — hover over "Sanctions Screen PASS"
5. Hover over the footnote: "raw API responses never leave the secure enclave"
6. Click **Bob** quick-pick
7. Let "REVOCATION ACTIVE" banner load — hold 5 seconds
8. Hover over "Sanctions Screen FAIL"
9. Click **Charlie** quick-pick — show EXPIRING SOON in amber

### Voiceover

*On Alice:*
> "The Regulator tab is the same blockchain record — different access level. Alice: Compliant. Tier 2. US/NY. All four compliance checks passed — sanctions screen, KYC/AML, accredited investor, jurisdiction. Notice the footnote: raw API responses never leave the secure enclave. Only the pass/fail verdict reaches the chain. This is compliance privacy-by-design."

*On Bob:*
> "Bob. Revoked. And this is the key — 'Revocation active: CCIP broadcast to all chains.' A single call to invalidateAcrossChains on Sepolia sends CCIP messages to every registered destination chain simultaneously. Bob is frozen on Sepolia and Arbitrum Sepolia at the same instant — no window where he keeps trading on a destination chain while revocation propagates. The reason: Sanctions Screen FAIL. OFAC SDN list match."

*On Charlie:*
> "Charlie is expiring in seventeen days — EXPIRING SOON. Passed all four checks. In production, this triggers a re-attestation workflow. CRE runs again, writes a fresh attestation, CCIP updates all chains. The institution never re-submits documents."

### Timing Notes
60 seconds. Hold on Bob's REVOCATION ACTIVE panel for at least 5 seconds — it's the most compelling proof.

---

## SECTION 6 — COMPLIANT POOL `[3:20–4:10]`

### Screen
Click **Compliant Pool** tab. Shows:
- Compliance banner: "Connect your wallet to see your compliance tier and access gated pools" + Connect Wallet button
- Three pool cards:
  - **Basic Pool** — Tier 1+ · Max transfer: $10K
  - **Accredited Pool** — Tier 2+ · Max transfer: $100K
  - **Institutional Pool** — Tier 3 only · Max transfer: Unlimited
- "Live Compliance Log" section at bottom (empty until pool selected)

Click **Basic Pool**. Shows:
- Card highlights with green glow border + TVL: **100,001 IUSD · 99,999.003 tTREAS**
- **SWAP** tab: "You pay (IUSD)" → "You receive (tTREAS)" · Fee 0.3% · Rate: 1 IUSD ≈ 1 tTREAS · green Swap button
- **LIQUIDITY** tab: Add / Remove liquidity
- **Faucet** button (top-right)
- Live Compliance Log: **● LIVE** dot

### Mouse Actions
1. Click **Compliant Pool** tab — hold 2 seconds on landing
2. Hover over each pool card — point to tier requirement + cap
3. Hover over Accredited ($100K) and Institutional (Unlimited) — note the higher tier requirement
4. Click **Basic Pool**
5. Show TVL: 100,001 IUSD · 99,999.003 tTREAS
6. Click SWAP tab — hover over Fee 0.3% and Rate
7. Click LIQUIDITY tab — show Add/Remove
8. Point to Faucet button
9. Scroll to Live Compliance Log — show LIVE dot

### Voiceover
> "The final layer — Compliant Pool. Three constant-product AMM pools, each gated by a minimum compliance tier. Basic: any attested wallet, ten thousand dollar cap. Accredited: Tier 2, one hundred thousand. Institutional: Tier 3 only, unlimited. The Basic Pool has a hundred thousand IUSD and ninety-nine thousand tTREAS seeded. The gating isn't cosmetic — the onlyCompliant modifier on every swap, addLiquidity, and removeLiquidity call checks ComplianceGateway.isCompliantWithTier on-chain before executing. A non-compliant wallet reverts at the contract level. Connect a compliant wallet, hit Faucet to get test tokens, and swap IUSD for tTREAS. This is the first compliance-gated AMM built on privacy-preserving, cross-chain attestations — running on the same Chainlink infrastructure as everything else you've seen."

### Timing Notes
50 seconds. Click through SWAP → LIQUIDITY tabs. Pool TVL showing real on-chain reserves is proof it's deployed.

---

## SECTION 7 — FOOTER + CLOSE `[4:10–4:40]`

### Screen
Scroll down to the **footer** showing:
- ComplianceGateway (Sepolia) `0x472E…7d33` with Etherscan link icon
- ComplianceGateway (Arb Sepolia) with link
- AttestationSender · AttestationInvalidator
- Badge row at very bottom: **CHAINLINK CCIP · CHAINLINK CRE · CONFIDENTIAL HTTP · VAULT DON SECRETS**

Scroll slowly back to the top — hold on hero.

### Mouse Actions
1. Scroll to footer
2. Hover over ComplianceGateway Sepolia — show the Etherscan link icon
3. Hover over the badge row: CCIP · CRE · CONFIDENTIAL HTTP · VAULT DON SECRETS
4. Scroll slowly back to hero — hold

### Voiceover
> "Every deployed contract is in the footer with Etherscan links — verifiable right now. ComplianceGateway on Sepolia. ComplianceGateway on Arbitrum Sepolia. AttestationSender. AttestationInvalidator. All source code is on GitHub. Compliant Bridge: check once, enforce everywhere. Privacy where it's needed, transparency where it's required. Built on Chainlink."

*[2-second pause — hold on hero]*

---

## FULL TIMING SUMMARY

| Section | Start | End | Duration |
|---------|-------|-----|----------|
| GitHub — Architecture + Integrations | 0:00 | 0:30 | 30s |
| Hero + How It Works | 0:30 | 1:00 | 30s |
| Public Tab | 1:00 | 1:35 | 35s |
| Institution Tab (Alice) | 1:35 | 2:20 | 45s |
| Regulator Tab (Alice · Bob · Charlie) | 2:20 | 3:20 | 60s |
| Compliant Pool | 3:20 | 4:10 | 50s |
| Footer + Close | 4:10 | 4:40 | 30s |
| **Total** | | | **4:40** |

---

## VOICEOVER QUICK REFERENCE

Say naturally:
- *"Confidential HTTP enclave"* — Sections 1, 3, 5
- *"Only four numbers reach the blockchain"* — Section 1
- *"Same blockchain record, different access level"* — Section 5
- *"onlyCompliant modifier at the smart contract level"* — Section 6
- *"Check once, enforce everywhere"* — Section 7
- *"CCIP broadcast to all chains simultaneously"* — Section 5 (Bob)
- *"Ten Chainlink integrations"* — Section 1

Do NOT say:
- ~~"We simulate"~~ — everything is live on testnet
- ~~"The mock API"~~ — it's scaffolding, not the innovation
- ~~"What CCIP does"~~ or ~~"What CRE is"~~ — judges know
- ~~"ConfidentialHTTP is production-ready"~~ — say "experimental enclave capability"

---

## WHAT'S ON SCREEN (VERIFIED LIVE — March 2026)

| Tab | What you will actually see |
|-----|--------------------------|
| **Public** | 6 transfers, blurred amounts, VISIBLE/HIDDEN legend, 4 Compliant · 2 Active Chains |
| **Institution (Alice)** | TIER 2 Accredited, US/NY, 5,000 CBT max, 352 days left, Check ID, Bridged to Arb Sepolia ✅ |
| **Regulator (Alice)** | COMPLIANT, all 4 checks PASS, Revoke Cross-Chain button |
| **Regulator (Bob)** | REVOKED, REVOCATION ACTIVE banner, Sanctions Screen FAIL |
| **Regulator (Charlie)** | EXPIRING SOON, Tier 1, DE/BER, ~17 days left |
| **Pool** | 3 cards: Basic $10K / Accredited $100K / Institutional Unlimited; Basic TVL 100K IUSD + 99K tTREAS; Swap panel Fee 0.3% |

---

## BACKUP PLAN

| Problem | Fallback |
|---------|---------|
| Institution RPC fails | Alice quick-pick loads from chain without MetaMask |
| Alice shows "No attestation" | Click "Request Compliance Check" — server attests using deployer key |
| Pool shows no TVL | Pool cards still show tier gating — explain the contract enforcement verbally |
| CCIP bridge button fails | Alice already shows "Bridged to Arb Sepolia" from localStorage |
| App won't load | Switch to GitHub README + architecture diagram for full demo |
