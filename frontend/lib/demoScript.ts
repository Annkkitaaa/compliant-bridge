// Pure data — no React imports, no circular deps
// TabId must match the union in context/DemoContext.tsx

export type DemoTabId = "public" | "institution" | "regulator" | "split";

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
