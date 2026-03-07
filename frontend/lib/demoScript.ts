// Pure data — no React imports, no circular deps
// TabId must match the union in context/DemoContext.tsx

export type DemoTabId = "public" | "institution" | "regulator" | "split" | "pool";

export interface DemoTour {
  happening: string;   // plain-English explanation of what is occurring right now
  observe:   string[]; // 2-3 bullets — what to look at on screen
  next:      string;   // one line — what happens in the next step
}

export interface DemoStep {
  index:        number;
  title:        string;
  subtitle:     string;
  description:  string;
  action:       string;
  tab:          DemoTabId;
  flowStep:     number; // 0-4 maps to FLOW_BAR_STEPS; -1 = highlight all
  annotation:   string;
  techName:     string | null;
  techDetail:   string | null;
  tour:         DemoTour;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    index: 0,
    title: "CRE Compliance Check",
    subtitle: "Step 1 of 6",
    description: "Chainlink CRE runs a Confidential HTTP request to the compliance API inside a secure enclave. Raw KYC data never reaches the chain.",
    action: "Notice the Transfer table — only ✅/❌ compliance status is public. Amounts and identities are hidden.",
    tab: "public",
    flowStep: 0,
    annotation: "CRE Confidential HTTP ran these checks — raw data never touched the blockchain",
    techName: "Chainlink CRE · Confidential HTTP",
    techDetail: "Compliance checks execute inside a Trusted Execution Environment (TEE). API keys and raw KYC responses are invisible — only the pass/fail result is recorded on-chain.",
    tour: {
      happening: "A Chainlink oracle node is running a private compliance check on a wallet address. It's calling sanctions databases, KYC providers, and accreditation services — all inside a secure enclave. None of this raw data ever touches the blockchain.",
      observe: [
        "The Transfer table shows ✅ or ❌ for each address — that is all the public can see",
        "Dollar amounts are blurred — no one can see how much was transferred",
        "Wallet addresses are shown but no name or identity is ever linked on-chain",
      ],
      next: "The compliance result becomes a private on-chain attestation — only the wallet owner can see their own tier and limits.",
    },
  },
  {
    index: 1,
    title: "Attestation Issued On-Chain",
    subtitle: "Step 2 of 6",
    description: "Alice's compliance check passed. A structured attestation is stored on Sepolia — only Alice can see her tier, jurisdiction, and transfer limits.",
    action: "Connect Alice's wallet (pre-populated) to view the attestation details on Sepolia.",
    tab: "institution",
    flowStep: 1,
    annotation: "This attestation was issued by the CRE workflow — connect wallet to see your tier and jurisdiction",
    techName: "Chainlink CRE",
    techDetail: "The CRE DON signs and submits the attestation transaction. The result is publicly readable as a pass/fail, but full details require the wallet holder's authorization.",
    tour: {
      happening: "The compliance check passed and a cryptographic attestation was written to the Sepolia blockchain. It records the wallet's compliance tier (1/2/3), maximum transfer limit, expiry date, and jurisdiction — but only the wallet owner can read the details.",
      observe: [
        "Connect your wallet — your compliance tier badge appears (Basic / Accredited / Institutional)",
        "The progress bar shows how long your attestation stays valid (1 year from issue)",
        "Your jurisdiction code and max transfer value are stored privately, not on a public profile",
      ],
      next: "This attestation can now be bridged to Arbitrum Sepolia via Chainlink CCIP — no second compliance check needed.",
    },
  },
  {
    index: 2,
    title: "CCIP Cross-Chain Bridge",
    subtitle: "Step 3 of 6",
    description: "Chainlink CCIP transports Alice's attestation to Arbitrum Sepolia. One compliance check — valid on any connected chain.",
    action: "Click 'Bridge Attestation' to send the CCIP message. Watch the status update.",
    tab: "institution",
    flowStep: 2,
    annotation: "Click Bridge Attestation — Chainlink CCIP carries this proof to Arbitrum Sepolia",
    techName: "Chainlink CCIP",
    techDetail: "CCIP provides trust-minimized cross-chain messaging backed by risk management. AttestationSender → CCIP Router → AttestationReceiver on Arb Sepolia — no custom bridge required.",
    tour: {
      happening: "Chainlink CCIP is about to carry the compliance attestation from Sepolia to Arbitrum Sepolia. This is not a simple copy — CCIP cryptographically verifies the message at the destination. No custom bridge, no wrapped tokens, no trust assumptions.",
      observe: [
        "Click 'Bridge Attestation' — MetaMask will ask you to sign one transaction",
        "A CCIP message ID appears — you can paste it into ccip.chain.link to track it live",
        "The Arb Sepolia status badge changes from ❌ to ⏳ while the message travels",
      ],
      next: "The message arrives on Arbitrum Sepolia in ~20 seconds. Alice's attestation is now valid on both chains.",
    },
  },
  {
    index: 3,
    title: "Recognized on Destination Chain",
    subtitle: "Step 4 of 6",
    description: "The attestation arrives on Arb Sepolia. Alice trades compliantly on Arbitrum — zero re-verification needed.",
    action: "Both chain badges are now ✅ green. Alice's compliance follows her cross-chain.",
    tab: "institution",
    flowStep: 3,
    annotation: "Both Sepolia and Arb Sepolia now show verified — one check, recognized everywhere",
    techName: "Chainlink CCIP",
    techDetail: "The destination ComplianceGateway accepts the CCIP-delivered attestation. ComplianceToken on Arb Sepolia checks this remote attestation on every transfer — seamlessly.",
    tour: {
      happening: "The CCIP message has landed on Arbitrum Sepolia. The ComplianceGateway contract there now holds a copy of the attestation. Every token transfer on Arb Sepolia automatically checks this gateway — Alice can trade without any additional steps.",
      observe: [
        "Both chain badges (Sepolia ✅ and Arb Sepolia ✅) are now green",
        "The same tier, limits, and expiry are recognized on both chains — it is one attestation",
        "No re-KYC, no re-verification — the proof followed the wallet cross-chain",
      ],
      next: "Next we see what happens when a regulator needs to block a wallet instantly across all chains.",
    },
  },
  {
    index: 4,
    title: "Sanctions Update → Cross-Chain Revocation",
    subtitle: "Step 5 of 6",
    description: "Bob's address appears on the OFAC SDN list. The regulator triggers instant cross-chain invalidation via CCIP — no per-chain action needed.",
    action: "Select Bob → click 'Revoke Cross-Chain'. The CCIP message broadcasts to all registered chains.",
    tab: "regulator",
    flowStep: 4,
    annotation: "Bob is pre-selected — click Revoke Cross-Chain to broadcast the CCIP invalidation",
    techName: "Chainlink CCIP",
    techDetail: "AttestationInvalidator sends a CCIP revocation message to every registered destination chain in a single transaction. Bob cannot transact on any connected chain after confirmation.",
    tour: {
      happening: "Bob's address was flagged on the OFAC sanctions list. The regulator has access to the full compliance record and can revoke attestations. One transaction on Sepolia broadcasts a CCIP revocation message to every connected chain simultaneously — there is no gap where Bob is blocked on one chain but still active on another.",
      observe: [
        "Bob is pre-selected in the search — his full compliance record is visible to the regulator only",
        "Click 'Revoke Cross-Chain' — this sends CCIP messages to ALL registered chains at once",
        "After confirmation, Bob cannot make any token transfer on any connected chain",
      ],
      next: "Finally, see how the same transaction looks completely different depending on who is viewing it.",
    },
  },
  {
    index: 5,
    title: "Three-Layer Privacy Model",
    subtitle: "Step 6 of 6",
    description: "Same transaction — three completely different views. This is the core innovation of Compliant Bridge.",
    action: "Compare Public / Institution / Regulator views side by side. Each role sees exactly what they're authorized to see.",
    tab: "split",
    flowStep: -1, // all active
    annotation: "Public sees compliance bool only · Institution sees own data · Regulator sees everything",
    techName: "Chainlink CRE + CCIP + Confidential HTTP",
    techDetail: "The three-layer privacy model is enforced by smart contracts: ComplianceGateway stores attestations, RegulatorView gates full data, and CRE's enclave ensures raw KYC never leaks.",
    tour: {
      happening: "This is the privacy architecture in action. Three people look at the exact same blockchain data — a public observer, the wallet owner, and an authorized regulator — and each sees something completely different. Smart contracts enforce these boundaries. No database, no access control list, no administrator.",
      observe: [
        "Public column: only ✅/❌ status and blurred amounts — no identity, no details",
        "Institution column: full attestation details — but only for the connected wallet, no one else's",
        "Regulator column: everything — KYC result, jurisdiction, transfer history, source chain",
      ],
      next: "You have completed the full compliance lifecycle. Exit demo mode to explore the live app.",
    },
  },
];

// ── Flow bar data (5 steps) ─────────────────────────────────────────────────

export interface FlowBarStep {
  label:    string;
  sublabel: string;
}

export const FLOW_BAR_STEPS: FlowBarStep[] = [
  { label: "CRE Check",       sublabel: "Confidential HTTP" },
  { label: "Attestation",     sublabel: "On-Chain · Sepolia" },
  { label: "CCIP Bridge",     sublabel: "Cross-Chain" },
  { label: "Destination",     sublabel: "Arb Sepolia" },
  { label: "Token Transfer",  sublabel: "Gated ERC-20" },
];
