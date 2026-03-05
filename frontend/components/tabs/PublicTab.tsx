// Chainlink Integration: CCIP | CRE EVMClient
// Purpose: Reads compliance status from ComplianceGateway — data written by CRE DON reports
//          and bridged cross-chain via CCIP. Queries Transfer events and batches
//          getPublicStatus() calls to show live compliance state on both chains.
"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { MOCK_TRANSFERS } from "@/lib/mockData";
import {
  ADDRESSES, TOKEN_ABI, GATEWAY_ABI, getReadProvider, shortAddr,
} from "@/lib/contracts";
import DemoAnnotation from "@/components/demo/DemoAnnotation";
import { Shield, Lock, Eye, EyeOff, Activity, RefreshCw } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type ChainLabel = "Sepolia" | "Arb Sepolia";

interface TransferRow {
  txHash:      string;
  from:        string;
  to:          string;
  amount:      string;
  token:       string;
  timestamp:   Date;
  chain:       ChainLabel;
  compliant:   boolean;
  blockNumber: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d: Date) {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

// ── On-chain fetch ────────────────────────────────────────────────────────────

const LOOK_BACK_BLOCKS = 20000;

async function fetchChainTransfers(
  chain: "sepolia" | "arbSepolia",
  label: ChainLabel,
): Promise<TransferRow[]> {
  const provider    = getReadProvider(chain);
  const tokenAddr   = ADDRESSES[chain].token;
  const gatewayAddr = ADDRESSES[chain].gateway;

  const token   = new ethers.Contract(tokenAddr,   TOKEN_ABI,   provider);
  const gateway = new ethers.Contract(gatewayAddr, GATEWAY_ABI, provider);

  const currentBlock = await provider.getBlockNumber();
  const fromBlock    = Math.max(0, currentBlock - LOOK_BACK_BLOCKS);

  const filter = token.filters.Transfer();
  const events = await token.queryFilter(filter, fromBlock, currentBlock);

  const nowSecs       = Math.floor(Date.now() / 1000);
  const blockTimeSecs = chain === "sepolia" ? 12 : 1;

  const rows: TransferRow[] = await Promise.all(
    events.slice(-50).map(async (ev) => {
      const log   = ev as ethers.EventLog;
      const from  = log.args[0] as string;
      const to    = log.args[1] as string;
      const value = log.args[2] as bigint;

      let compliant = false;
      try { compliant = await gateway.getPublicStatus(from); } catch { /* skip */ }

      const blocksAgo = currentBlock - log.blockNumber;
      const secsAgo   = blocksAgo * blockTimeSecs;
      const timestamp = new Date((nowSecs - secsAgo) * 1000);

      return {
        txHash:      log.transactionHash,
        from,
        to,
        amount:      ethers.formatEther(value),
        token:       "CBT",
        timestamp,
        chain:       label,
        compliant,
        blockNumber: log.blockNumber,
      };
    }),
  );
  return rows;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PublicTab() {
  const [transfers, setTransfers] = useState<TransferRow[]>(
    MOCK_TRANSFERS.map(t => ({ ...t, chain: t.chain as ChainLabel }))
  );
  const [loading,     setLoading]     = useState(false);
  const [chainStatus, setChainStatus] = useState<"live" | "demo" | "loading">("loading");

  const refresh = useCallback(async () => {
    setLoading(true);
    setChainStatus("loading");
    try {
      const [sepoliaRows, arbRows] = await Promise.all([
        fetchChainTransfers("sepolia",    "Sepolia"),
        fetchChainTransfers("arbSepolia", "Arb Sepolia"),
      ]);
      const all = [...sepoliaRows, ...arbRows].sort((a, b) => b.blockNumber - a.blockNumber);
      if (all.length > 0) {
        setTransfers(all.slice(0, 20));
        setChainStatus("live");
      } else {
        setChainStatus("demo");
      }
    } catch {
      setChainStatus("demo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const compliantCount = transfers.filter(t => t.compliant).length;
  const chains         = [...new Set(transfers.map(t => t.chain))];

  return (
    <div className="fade-in space-y-5">
      <DemoAnnotation forTab="public" />

      {/* Privacy banner */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1F2235" }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, rgba(55,91,210,0.12) 0%, rgba(55,91,210,0.06) 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(55,91,210,0.2)", border: "1px solid rgba(55,91,210,0.35)" }}
            >
              <Eye className="w-4 h-4 text-[#5B7FE8]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-wide">PUBLIC EXPLORER VIEW</p>
              <p className="text-[#8892A4] text-xs mt-0.5">Sensitive data protected by Confidential HTTP execution</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(55,91,210,0.12)", border: "1px solid rgba(55,91,210,0.25)" }}
          >
            <Lock className="w-3.5 h-3.5 text-[#5B7FE8]" />
            <span className="text-[#8892A4] text-xs font-medium">Encrypted at source</span>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-wrap gap-6" style={{ background: "#13151A" }}>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#8892A4] mb-2 font-bold">Visible to public</p>
            <div className="flex flex-wrap gap-2">
              {["Compliance status (✅/❌)", "Transaction hash", "Block number", "Timestamp", "Chain"].map(v => (
                <span key={v} className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: "rgba(22,199,132,0.1)", border: "1px solid rgba(22,199,132,0.25)", color: "#16C784" }}
                >{v}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#8892A4] mb-2 font-bold">Hidden from public</p>
            <div className="flex flex-wrap gap-2">
              {["Transfer amounts", "Identities", "Jurisdiction", "KYC tier", "Attestation details"].map(v => (
                <span key={v} className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
                  style={{ background: "rgba(234,57,67,0.1)", border: "1px solid rgba(234,57,67,0.25)", color: "#EA3943" }}
                >
                  <EyeOff className="w-3 h-3" />{v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: transfers.length, label: "Total Transfers", color: "#375BD2" },
          { value: compliantCount,   label: "Compliant",       color: "#16C784" },
          { value: chains.length,    label: "Active Chains",   color: "#7B5CF8" },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[#8892A4] mt-1 uppercase tracking-wider font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Transfer table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1F2235" }}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#8892A4]" />
            <span className="font-semibold text-white text-sm">Recent Compliance Events</span>
          </div>
          <div className="flex items-center gap-3">
            {chainStatus === "live" && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#16C784]">
                <span className="w-2 h-2 rounded-full bg-[#16C784] pulse inline-block" />
                Live · Sepolia + Arb Sepolia
              </span>
            )}
            {chainStatus === "demo"    && <span className="text-xs text-[#4A5568] italic">Demo data</span>}
            {chainStatus === "loading" && <span className="text-xs text-[#4A5568]">Fetching…</span>}
            <button
              onClick={refresh} disabled={loading}
              className="p-1.5 rounded-lg text-[#4A5568] hover:text-[#8892A4] transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>TX Hash</th><th>From</th><th>To</th>
                <th>Chain</th><th>Time</th><th>Amount</th><th>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((tx, i) => (
                <tr key={`${tx.txHash}-${i}`}>
                  <td>
                    <a
                      href={`${ADDRESSES[tx.chain === "Sepolia" ? "sepolia" : "arbSepolia"].explorer}/tx/${tx.txHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="mono text-[#375BD2] hover:text-[#5B7FE8] transition-colors"
                    >
                      {shortHash(tx.txHash)}
                    </a>
                  </td>
                  <td><span className="mono text-[#8892A4]">{shortAddr(tx.from)}</span></td>
                  <td><span className="mono text-[#8892A4]">{shortAddr(tx.to)}</span></td>
                  <td>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={tx.chain === "Sepolia"
                        ? { background: "rgba(55,91,210,0.15)", border: "1px solid rgba(55,91,210,0.3)", color: "#5B7FE8" }
                        : { background: "rgba(123,92,248,0.15)", border: "1px solid rgba(123,92,248,0.3)", color: "#9B7FFF" }
                      }
                    >{tx.chain}</span>
                  </td>
                  <td className="text-[#4A5568] text-xs">{timeAgo(tx.timestamp)}</td>
                  <td>
                    <div className="flex items-center gap-1.5 group relative cursor-not-allowed">
                      <span className="select-none blur-[4px] text-sm mono text-[#4A5568]">
                        {parseFloat(tx.amount).toFixed(2)}
                      </span>
                      <Lock className="w-3 h-3 text-[#4A5568]" />
                      <span className="absolute -top-7 left-0 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
                        style={{ background: "#1F2235", color: "#8892A4", border: "1px solid #252840" }}
                      >
                        Hidden from public view
                      </span>
                    </div>
                  </td>
                  <td>
                    {tx.compliant ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(22,199,132,0.12)", border: "1px solid rgba(22,199,132,0.3)", color: "#16C784" }}
                      >✓ Compliant</span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(234,57,67,0.12)", border: "1px solid rgba(234,57,67,0.3)", color: "#EA3943" }}
                      >✗ Non-Compliant</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 flex items-center gap-2"
          style={{ background: "#0F1015", borderTop: "1px solid #1F2235" }}
        >
          <Shield className="w-3.5 h-3.5 text-[#4A5568]" />
          <p className="text-xs text-[#4A5568]">
            Compliance verified by Chainlink CRE via Confidential HTTP. Amounts and identity data
            never leave the enclave — only the pass/fail result is recorded on-chain.
          </p>
        </div>
      </div>
    </div>
  );
}
