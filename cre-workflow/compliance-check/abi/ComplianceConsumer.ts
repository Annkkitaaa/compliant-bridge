export const COMPLIANCE_CONSUMER_ABI = [
  {
    inputs: [
      { name: "", type: "bytes", internalType: "bytes" },
      { name: "report", type: "bytes", internalType: "bytes" },
    ],
    name: "onReport",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "interfaceId", type: "bytes4", internalType: "bytes4" },
    ],
    name: "supportsInterface",
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "pure",
    type: "function",
  },
] as const;
