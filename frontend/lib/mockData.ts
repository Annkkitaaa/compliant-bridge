// ── Mock data for all three views ────────────────────────────────────────────

export const MOCK_TRANSFERS = [
  {
    txHash: "0xa48328ae8c953a1e6a1aca42b779abb76e68d1d25f11d83b96e5337d97611aa0",
    from: "0xAA00000000000000000000000000000000000001",
    to:   "0x3B8DfFB39a66e7d861C7d02614F5491e4C1A475a",
    amount: "1200.00",
    token: "CBT",
    timestamp: new Date(Date.now() - 4 * 60 * 1000),
    chain: "Sepolia",
    compliant: true,
    blockNumber: 10322398,
  },
  {
    txHash: "0x3989fdca1e00a6e028e1bcae7b77059cb198470e7058d80270451b95b483cbb7",
    from: "0x588a5851A7184655bcF52849e9748B24eF90E37f",
    to:   "0xBb00000000000000000000000000000000000001",
    amount: "450.00",
    token: "CBT",
    timestamp: new Date(Date.now() - 11 * 60 * 1000),
    chain: "Sepolia",
    compliant: true,
    blockNumber: 10322310,
  },
  {
    txHash: "0x7c3f2a9d4e1b8c6f0a5d2e7b3c9f1a4d8e2b5c8f3a0d7e1b4c7f0a3d6e9b2c5",
    from: "0x4de32d6AF6bBb30C69107FccC69DE53f1744CD72",
    to:   "0xcC00000000000000000000000000000000000001",
    amount: "88.50",
    token: "CBT",
    timestamp: new Date(Date.now() - 23 * 60 * 1000),
    chain: "Sepolia",
    compliant: false,
    blockNumber: 10322201,
  },
  {
    txHash: "0x1f8e3b5d7a9c2e4f6b8d0a2c4e6f8b0d2e4f6a8c0e2f4b6d8a0c2e4f6b8d0a2c",
    from: "0xAa00000000000000000000000000000000000002",
    to:   "0x472E9A6eC84ad6eA1EE7F816c7dE92530Eb67d33",
    amount: "3750.00",
    token: "CBT",
    timestamp: new Date(Date.now() - 38 * 60 * 1000),
    chain: "Arb Sepolia",
    compliant: false,
    blockNumber: 87654321,
  },
  {
    txHash: "0x9a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b",
    from: "0xBb00000000000000000000000000000000000001",
    to:   "0x21F4DaEaE24E6ca825315813680317F1A218f6d5",
    amount: "620.00",
    token: "CBT",
    timestamp: new Date(Date.now() - 55 * 60 * 1000),
    chain: "Sepolia",
    compliant: true,
    blockNumber: 10322050,
  },
  {
    txHash: "0x5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f",
    from: "0x9982dB04ac6b3d158694ea7c0aCDa0872daEc1ea",
    to:   "0xAA00000000000000000000000000000000000001",
    amount: "2100.00",
    token: "CBT",
    timestamp: new Date(Date.now() - 72 * 60 * 1000),
    chain: "Arb Sepolia",
    compliant: true,
    blockNumber: 87653980,
  },
];

export const MOCK_ATTESTATION = {
  subject:        "0xAA00000000000000000000000000000000000001",
  tier:            2,
  maxTransfer:    "5,000",
  validUntil:     new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  issuedAt:       new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  sourceChain:    "Sepolia",
  sourceChainId:  11155111,
  checkId:        "0x91baa8c0df106ec1cdf1315ea143222d0dde4412fa6311f5c56c5f40d7566b48",
  jurisdiction:   "US / New York",
  bridgedTo: [
    { chain: "Arbitrum Sepolia", chainId: 421614, bridgedAt: new Date(Date.now() - 2 * 60 * 1000) },
  ],
  isRemote: false,
  balances: [
    { chain: "Sepolia",          chainId: 11155111, balance: "3,480.00", token: "CBT" },
    { chain: "Arbitrum Sepolia", chainId: 421614,  balance: "1,620.00", token: "CBT" },
  ],
};

export const MOCK_REGULATOR_DATA: Record<string, RegulatorSubjectData> = {
  "0xAA00000000000000000000000000000000000001": {
    label: "Alice",
    address: "0xAA00000000000000000000000000000000000001",
    status: "compliant",
    tier: 2,
    jurisdiction: "US / New York",
    maxTransfer: "5,000",
    issuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    validUntil: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
    checks: {
      sanctions:   { passed: true,  detail: "No OFAC/UN/EU matches found" },
      kyc:         { passed: true,  detail: "Tier 2 identity verified — passport + proof of address" },
      accredited:  { passed: true,  detail: "Accredited investor — SEC Rule 501 confirmed" },
      jurisdiction:{ passed: true,  detail: "US/NY permitted — not in restricted jurisdiction list" },
    },
    history: [
      { event: "Attestation issued",        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), chain: "Sepolia",          detail: "Tier 2 compliance check passed" },
      { event: "Attestation bridged",        date: new Date(Date.now() - 2 * 60 * 1000),            chain: "Arbitrum Sepolia", detail: "Cross-chain delivery via CCIP (0xa483...aa0)" },
    ],
    transfers: [
      { hash: "0xa48328...aa0", from: "Alice", to: "Treasury", amount: "1,200.00", timestamp: new Date(Date.now() - 4 * 60 * 1000),   compliant: true  },
      { hash: "0x5e7f9a...e7f", from: "Alice", to: "Vault",    amount: "2,100.00", timestamp: new Date(Date.now() - 72 * 60 * 1000),  compliant: true  },
    ],
  },
  "0xAa00000000000000000000000000000000000002": {
    label: "Bob",
    address: "0xAa00000000000000000000000000000000000002",
    status: "revoked",
    tier: 3,
    jurisdiction: "GB / London",
    maxTransfer: "50,000",
    issuedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    validUntil: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000),
    checks: {
      sanctions:   { passed: false, detail: "MATCH: OFAC SDN list — entity added 2025-10-15" },
      kyc:         { passed: true,  detail: "Tier 3 identity verified — full institutional KYB" },
      accredited:  { passed: true,  detail: "Qualified institutional buyer (QIB) confirmed" },
      jurisdiction:{ passed: true,  detail: "GB/London permitted" },
    },
    history: [
      { event: "Attestation issued",    date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), chain: "Sepolia", detail: "Tier 3 — institutional KYB passed" },
      { event: "Attestation REVOKED",   date: new Date(Date.now() - 2 * 60 * 1000),            chain: "Sepolia", detail: "Sanctions update: OFAC SDN list match — 0x3989...cbb7" },
      { event: "Revocation broadcast",  date: new Date(Date.now() - 2 * 60 * 1000),            chain: "Arbitrum Sepolia", detail: "CCIP revocation in transit" },
    ],
    transfers: [
      { hash: "0x1f8e3b...a2c", from: "Bob", to: "Fund",     amount: "3,750.00", timestamp: new Date(Date.now() - 38 * 60 * 1000), compliant: false },
    ],
  },
  "0xBb00000000000000000000000000000000000001": {
    label: "Charlie",
    address: "0xBb00000000000000000000000000000000000001",
    status: "expiring",
    tier: 1,
    jurisdiction: "DE / Berlin",
    maxTransfer: "1,000",
    issuedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    checks: {
      sanctions:   { passed: true,  detail: "No matches found" },
      kyc:         { passed: true,  detail: "Tier 1 basic identity verified" },
      accredited:  { passed: false, detail: "Not accredited — basic retail investor status" },
      jurisdiction:{ passed: true,  detail: "DE/Berlin permitted — EU MiCA compliant" },
    },
    history: [
      { event: "Attestation issued", date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), chain: "Sepolia", detail: "Tier 1 KYC passed — short expiry issued" },
    ],
    transfers: [
      { hash: "0x3989fd...bb7", from: "Charlie", to: "Alice",  amount: "450.00",  timestamp: new Date(Date.now() - 11 * 60 * 1000), compliant: true },
      { hash: "0x9a2b4c...a1b", from: "Charlie", to: "Market", amount: "620.00",  timestamp: new Date(Date.now() - 55 * 60 * 1000), compliant: true },
    ],
  },
};

export type CheckResult = { passed: boolean; detail: string };

export interface RegulatorSubjectData {
  label:       string;
  address:     string;
  status:      "compliant" | "revoked" | "expiring";
  tier:        number;
  jurisdiction:string;
  maxTransfer: string;
  issuedAt:    Date;
  validUntil:  Date;
  checks: {
    sanctions:    CheckResult;
    kyc:          CheckResult;
    accredited:   CheckResult;
    jurisdiction: CheckResult;
  };
  history: Array<{ event: string; date: Date; chain: string; detail: string }>;
  transfers: Array<{ hash: string; from: string; to: string; amount: string; timestamp: Date; compliant: boolean }>;
}
