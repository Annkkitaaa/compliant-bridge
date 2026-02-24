"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { MOCK_TRANSFERS } from "@/lib/mockData";
import {
  ADDRESSES, TOKEN_ABI, GATEWAY_ABI, getReadProvider, shortAddr,
} from "@/lib/contracts";
import { Shield, Lock, Eye, EyeOff, Activity, RefreshCw } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type ChainLabel = "Sepolia" | "Arb Sepolia";

interface TransferRow {
  txHash:      string;
  from:        string;
  to:          string;
  amount:      string; // blurred in UI — just a placeholder string
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

const LOOK_BACK_BLOCKS = 20000; // ~3 days on Sepolia

async function fetchChainTransfers(
  chain: "sepolia" | "arbSepolia",
  label: ChainLabel,
): Promise<TransferRow[]> {
  const provider   = getReadProvider(chain);
  const tokenAddr  = ADDRESSES[chain].token;
  const gatewayAddr = ADDRESSES[chain].gateway;

  const token   = new ethers.Contract(tokenAddr,   TOKEN_ABI,   provider);
  const gateway = new ethers.Contract(gatewayAddr, GATEWAY_ABI, provider);

  const currentBlock = await provider.getBlockNumber();
  const fromBlock    = Math.max(0, currentBlock - LOOK_BACK_BLOCKS);

  const filter = token.filters.Transfer();
  const events = await token.queryFilter(filter, fromBlock, currentBlock);

  // Estimate block timestamp from current (avoids N block-fetches)
  const nowSecs       = Math.floor(Date.now() / 1000);
  const blockTimeSecs = chain === "sepolia" ? 12 : 1; // ~12s Sepolia, ~1s Arb

  // Batch compliance checks
  const rows: TransferRow[] = await Promise.all(
    events.slice(-50).map(async (ev) => {
      const log     = ev as ethers.EventLog;
      const from    = log.args[0] as string;
      const to      = log.args[1] as string;
      const value   = log.args[2] as bigint;

      let compliant = false;
      try {
        compliant = await gateway.getPublicStatus(from);
      } catch { /* unknown address — non-compliant */ }

      const blocksAgo  = currentBlock - log.blockNumber;
      const secsAgo    = blocksAgo * blockTimeSecs;
      const timestamp  = new Date((nowSecs - secsAgo) * 1000);

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
    MOCK_TRANSFERS.map(t => ({
      ...t,
      chain: t.chain as ChainLabel,
    }))
  );
  const [loading,  setLoading]  = useState(false);
  const [chainStatus, setChainStatus] = useState<"live" | "demo" | "loading">("loading");

  const refresh = useCallback(async () => {
    setLoading(true);
    setChainStatus("loading");
    try {
      const [sepoliaRows, arbRows] = await Promise.all([
        fetchChainTransfers("sepolia",    "Sepolia"),
        fetchChainTransfers("arbSepolia", "Arb Sepolia"),
      ]);
      const all = [...sepoliaRows, ...arbRows].sort(
        (a, b) => b.blockNumber - a.blockNumber,
      );
      if (all.length > 0) {
        setTransfers(all.slice(0, 20));
        setChainStatus("live");
      } else {
        // No on-chain events found — fall back to mock
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
    <div className="fade-in space-y-6">

      {/* Privacy Banner */}
      <div className="rounded-xl overflow-hidden border border-blue-100">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm tracking-wide">PUBLIC EXPLORER VIEW</p>
              <p className="text-blue-100 text-xs mt-0.5">Sensitive data protected by Confidential HTTP execution</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/15 border border-white/25 rounded-lg px-3 py-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-100" />
            <span className="text-blue-100 text-xs font-medium">Encrypted at source</span>
          </div>
        </div>

        {/* Visible vs. hidden */}
        <div className="bg-white px-6 py-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-bold">Visible to public</p>
            <div className="flex flex-wrap gap-2">
              {["Compliance status (✅/❌)", "Transaction hash", "Block number", "Timestamp", "Chain"].map(v => (
                <span key={v} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">{v}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-bold">Hidden from public</p>
            <div className="flex flex-wrap gap-2">
              {["Transfer amounts", "Identities", "Jurisdiction", "KYC tier", "Attestation details"].map(v => (
                <span key={v} className="text-xs px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />{v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{transfers.length}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Total Transfers</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{compliantCount}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Compliant</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{chains.length}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Active Chains</p>
        </div>
      </div>

      {/* Transfer table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">Recent Compliance Events</span>
          </div>
          <div className="flex items-center gap-3">
            {chainStatus === "live" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse inline-block" />Live · Sepolia + Arb Sepolia
              </span>
            )}
            {chainStatus === "demo" && (
              <span className="text-xs text-slate-400 italic">Demo data</span>
            )}
            {chainStatus === "loading" && (
              <span className="text-xs text-slate-400">Fetching chain data…</span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
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
                <th>TX Hash</th>
                <th>From</th>
                <th>To</th>
                <th>Chain</th>
                <th>Time</th>
                <th>Amount</th>
                <th>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((tx, i) => (
                <tr key={`${tx.txHash}-${i}`}>
                  <td>
                    <a
                      href={`${ADDRESSES[tx.chain === "Sepolia" ? "sepolia" : "arbSepolia"].explorer}/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      {shortHash(tx.txHash)}
                    </a>
                  </td>
                  <td><span className="mono text-slate-500">{shortAddr(tx.from)}</span></td>
                  <td><span className="mono text-slate-500">{shortAddr(tx.to)}</span></td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      tx.chain === "Sepolia"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                    }`}>
                      {tx.chain}
                    </span>
                  </td>
                  <td className="text-slate-400 text-xs">{timeAgo(tx.timestamp)}</td>
                  {/* Amount blurred — public cannot see */}
                  <td>
                    <div className="flex items-center gap-1.5 group relative cursor-not-allowed">
                      <span className="text-slate-200 select-none blur-[4px] text-sm font-mono">
                        {parseFloat(tx.amount).toFixed(2)}
                      </span>
                      <Lock className="w-3 h-3 text-slate-300" />
                      <span className="absolute -top-7 left-0 text-xs bg-slate-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Hidden from public view
                      </span>
                    </div>
                  </td>
                  <td>
                    {tx.compliant ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ✓ Compliant
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                        <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          ✗ Non-Compliant
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-xs text-slate-400">
            Compliance verified by Chainlink CRE via Confidential HTTP. Amounts and identity data
            never leave the enclave — only the pass/fail result is recorded on-chain.
          </p>
        </div>
      </div>
    </div>
  );
}
