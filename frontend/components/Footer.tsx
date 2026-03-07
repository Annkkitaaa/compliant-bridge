import { ExternalLink, Shield, Copy } from "lucide-react";
import { ADDRESSES } from "@/lib/contracts";

const CONTRACTS = [
  {
    label:   "ComplianceGateway",
    chain:   "Sepolia",
    address: ADDRESSES.sepolia.gateway,
    short:   ADDRESSES.sepolia.gateway.slice(0, 6) + "…" + ADDRESSES.sepolia.gateway.slice(-4),
    explorer: ADDRESSES.sepolia.explorer,
    color:  "#375BD2",
  },
  {
    label:   "ComplianceGateway",
    chain:   "Arb Sepolia",
    address: ADDRESSES.arbSepolia.gateway,
    short:   ADDRESSES.arbSepolia.gateway.slice(0, 6) + "…" + ADDRESSES.arbSepolia.gateway.slice(-4),
    explorer: ADDRESSES.arbSepolia.explorer,
    color:  "#7B5CF8",
  },
  {
    label:   "AttestationSender",
    chain:   "Sepolia",
    address: ADDRESSES.sepolia.sender,
    short:   ADDRESSES.sepolia.sender.slice(0, 6) + "…" + ADDRESSES.sepolia.sender.slice(-4),
    explorer: ADDRESSES.sepolia.explorer,
    color:  "#5B7FE8",
  },
  {
    label:   "AttestationInvalidator",
    chain:   "Sepolia",
    address: ADDRESSES.sepolia.invalidator,
    short:   ADDRESSES.sepolia.invalidator.slice(0, 6) + "…" + ADDRESSES.sepolia.invalidator.slice(-4),
    explorer: ADDRESSES.sepolia.explorer,
    color:  "#F5AC37",
  },
];

const TECH_BADGES = [
  { name: "Chainlink CCIP",            color: "#375BD2", glow: "rgba(55,91,210,0.3)"  },
  { name: "Chainlink CRE",             color: "#5B7FE8", glow: "rgba(91,127,232,0.3)" },
  { name: "Confidential HTTP",          color: "#7B5CF8", glow: "rgba(123,92,248,0.3)" },
  { name: "Vault DON Secrets",          color: "#16C784", glow: "rgba(22,199,132,0.3)" },
];

export default function Footer() {
  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <footer
      className="border-t"
      style={{ borderColor: "#1F2235", background: "#0A0B0F" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-10">

          {/* Col 1 — Project */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(55,91,210,0.2)", border: "1px solid rgba(55,91,210,0.35)" }}
              >
                <Shield className="w-3.5 h-3.5 text-[#5B7FE8]" />
              </div>
              <span className="font-bold text-white text-[14px]">
                Compliant<span className="text-[#375BD2]">Bridge</span>
              </span>
            </div>
            <p className="text-[#8892A4] text-[13px] leading-relaxed mb-5">
              Privacy-preserving cross-chain compliance for tokenized assets.
              Built on Chainlink CCIP and CRE for the Chainlink Convergence Hackathon.
            </p>
            {/* Tech badges */}
            <div className="flex flex-wrap gap-2">
              {TECH_BADGES.map(b => (
                <span
                  key={b.name}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg uppercase tracking-wide"
                  style={{
                    color: b.color,
                    background: `${b.glow.replace("0.3", "0.1")}`,
                    border: `1px solid ${b.glow.replace("0.3", "0.25")}`,
                  }}
                >
                  {b.name}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2 — Contracts */}
          <div className="lg:col-span-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8892A4] mb-4">
              Deployed Contracts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONTRACTS.map((c) => (
                <div
                  key={c.label + c.chain}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
                  style={{ background: "#13151A", border: "1px solid #1F2235" }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: c.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[12px] font-semibold truncate">{c.label}</p>
                    <p className="text-[#8892A4] text-[11px]">{c.chain}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="mono text-[#4A5568] text-[11px]">{c.short}</span>
                    <button
                      onClick={() => copy(c.address)}
                      className="p-1 rounded hover:bg-white/5 text-[#4A5568] hover:text-[#8892A4] transition-colors"
                      title="Copy address"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <a
                      href={`${c.explorer}/address/${c.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-white/5 text-[#4A5568] hover:text-[#375BD2] transition-colors"
                      title="View on Etherscan"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid #1F2235" }}
        >
          <p className="text-[#4A5568] text-[12px]">
            Built with Chainlink CCIP · CRE · Confidential HTTP · Chainlink Convergence Hackathon 2025
          </p>
          <a
            href="https://ccip.chain.link"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] text-[#4A5568] hover:text-[#375BD2] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Track on CCIP Explorer
          </a>
        </div>
      </div>
    </footer>
  );
}
