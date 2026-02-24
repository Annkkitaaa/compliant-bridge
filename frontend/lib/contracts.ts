// Chainlink Integration: CCIP | CRE EVMClient | CRE ConfidentialHTTP
// Purpose: ABIs, addresses, and helpers for all Chainlink-integrated contracts.
//          CCIP chain selector for Arb Sepolia routing (arbSepoliaSelector).
//          getReadProvider() for on-chain data; getBrowserSigner() for MetaMask write txs.
//
// Contract addresses from deployments.json
export const ADDRESSES = {
  sepolia: {
    chainId: 11155111,
    gateway:      "0x472E9A6eC84ad6eA1EE7F816c7dE92530Eb67d33",
    token:        "0x3B8DfFB39a66e7d861C7d02614F5491e4C1A475a",
    regulatorView:"0x588a5851A7184655bcF52849e9748B24eF90E37f",
    sender:       "0x21F4DaEaE24E6ca825315813680317F1A218f6d5",
    invalidator:  "0x9982dB04ac6b3d158694ea7c0aCDa0872daEc1ea",
    explorer:     "https://sepolia.etherscan.io",
  },
  arbSepolia: {
    chainId: 421614,
    gateway:      "0x64f0d037a4F4B46A9F11E01c2144b042bF638F76",
    token:        "0x472E9A6eC84ad6eA1EE7F816c7dE92530Eb67d33",
    regulatorView:"0x3B8DfFB39a66e7d861C7d02614F5491e4C1A475a",
    receiver:     "0xC05937c6f2140A32526Ef75353dbeca44f763AEC",
    invalidator:  "0x50F87c2a17FcE0612b26F8B9CADAde106F5F69d6",
    explorer:     "https://sepolia.arbiscan.io",
  },
  ccip: {
    arbSepoliaSelector: BigInt("3478487238524512106"),
  },
} as const;

export const SEPOLIA_RPC    = "https://rpc.sepolia.org";
export const ARB_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

// ── Minimal human-readable ABIs ───────────────────────────────────────────────

export const GATEWAY_ABI = [
  "function getAttestation(address subject) view returns (tuple(address subject, uint8 tier, uint256 maxTransferValue, uint256 validUntil, bytes32 checkId, bytes jurisdictionData, uint256 issuedAt, uint256 sourceChainId))",
  "function getPublicStatus(address subject) view returns (bool compliant)",
  "function isCompliant(address subject) view returns (bool)",
  "function isRevoked(address subject) view returns (bool)",
  "function revokeAttestation(address subject, string reason)",
  "function owner() view returns (address)",
  "event ComplianceAttested(address indexed subject, uint8 tier, uint256 validUntil, uint256 sourceChainId)",
  "event AttestationRevoked(address indexed subject, bytes32 checkId, string reason)",
];

export const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export const REGULATOR_ABI = [
  "function getFullComplianceDetails(address subject) view returns (tuple(address subject, uint8 tier, uint256 maxTransferValue, uint256 validUntil, bytes32 checkId, bytes jurisdictionData, uint256 issuedAt, uint256 sourceChainId) attestation, bool compliant, bool revoked)",
  "function getTransferHistory(address subject) view returns (tuple(address from, address to, uint256 amount, uint256 timestamp, uint256 blockNumber)[])",
  "function owner() view returns (address)",
];

export const SENDER_ABI = [
  "function sendAttestation(uint64 destinationChainSelector, address receiver, tuple(address subject, uint8 tier, uint256 maxTransferValue, uint256 validUntil, bytes32 checkId, bytes jurisdictionData, uint256 issuedAt, uint256 sourceChainId) attestation) returns (bytes32 messageId)",
  "function estimateFee(uint64 destinationChainSelector, address receiver, tuple(address subject, uint8 tier, uint256 maxTransferValue, uint256 validUntil, bytes32 checkId, bytes jurisdictionData, uint256 issuedAt, uint256 sourceChainId) attestation) view returns (uint256 fee)",
];

export const INVALIDATOR_ABI = [
  "function invalidateAcrossChains(address subject, string reason, uint64[] chainSelectors, address[] receivers)",
  "function estimateInvalidationFee(address subject, string reason, uint64[] chainSelectors, address[] receivers) view returns (uint256 totalFee)",
  "function owner() view returns (address)",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OnchainAttestation {
  subject:          string;
  tier:             number;
  maxTransferValue: bigint;
  validUntil:       bigint;
  checkId:          string;
  jurisdictionData: string;
  issuedAt:         bigint;
  sourceChainId:    bigint;
}

export interface FullComplianceDetails {
  attestation: OnchainAttestation;
  compliant:   boolean;
  revoked:     boolean;
}

export interface TransferRecord {
  from:        string;
  to:          string;
  amount:      bigint;
  timestamp:   bigint;
  blockNumber: bigint;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Decode jurisdictionData bytes — encoded as abi.encode(country, region, restricted) */
export function decodeJurisdiction(data: string): string {
  if (!data || data === "0x") return "Unknown";
  try {
    const { ethers } = require("ethers") as typeof import("ethers");
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ["string", "string", "bool"],
      data,
    ) as unknown as [string, string, boolean];
    const [country, region] = decoded;
    return `${country} / ${region}`;
  } catch {
    try {
      const { ethers } = require("ethers") as typeof import("ethers");
      return ethers.toUtf8String(data);
    } catch {
      return "Unknown";
    }
  }
}

/** Format a uint256 ether-value to human-readable "5,000.00" */
export function formatCBT(raw: bigint): string {
  const { ethers } = require("ethers") as typeof import("ethers");
  const num = parseFloat(ethers.formatEther(raw));
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Shorten address 0x1234…abcd */
export function shortAddr(addr: string, front = 6, back = 4): string {
  return `${addr.slice(0, front)}…${addr.slice(-back)}`;
}

/** Build an ethers JsonRpcProvider (lazy, browser-safe) */
export function getReadProvider(chain: "sepolia" | "arbSepolia") {
  const { ethers } = require("ethers") as typeof import("ethers");
  return new ethers.JsonRpcProvider(
    chain === "sepolia" ? SEPOLIA_RPC : ARB_SEPOLIA_RPC,
  );
}

/** Request MetaMask accounts and return a signer (Sepolia) */
export async function getBrowserSigner() {
  const { ethers } = require("ethers") as typeof import("ethers");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask not installed — please install MetaMask to continue.");
  await eth.request({ method: "eth_requestAccounts" });
  const provider = new ethers.BrowserProvider(eth);
  return provider.getSigner();
}

/** Ask MetaMask to switch to Sepolia (chainId 0xaa36a7 = 11155111) */
export async function switchToSepolia() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum;
  if (!eth) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }],
    });
  } catch (err: unknown) {
    // 4902 = chain not added
    if ((err as { code?: number }).code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0xaa36a7",
          chainName: "Sepolia",
          rpcUrls: ["https://rpc.sepolia.org"],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }],
      });
    }
  }
}

/** Detect current MetaMask chainId */
export async function getChainId(): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum;
  if (!eth) return 0;
  const id: string = await eth.request({ method: "eth_chainId" });
  return parseInt(id, 16);
}
