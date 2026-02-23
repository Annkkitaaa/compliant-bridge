"use client";
import { MOCK_TRANSFERS } from "@/lib/mockData";
import { Shield, Lock, Eye, EyeOff, Activity } from "lucide-react";

function timeAgo(d: Date) {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function short(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortHash(h: string) {
  return `${h.slice(0, 10)}...${h.slice(-6)}`;
}

export default function PublicTab() {
  const compliantCount = MOCK_TRANSFERS.filter(t => t.compliant).length;
  const chains = [...new Set(MOCK_TRANSFERS.map(t => t.chain))];

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

        {/* What's visible vs. hidden */}
        <div className="bg-white px-6 py-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs font-700 uppercase tracking-wider text-slate-400 mb-2 font-bold">Visible to public</p>
            <div className="flex flex-wrap gap-2">
              {["Compliance status (✅/❌)", "Transaction hash", "Block number", "Timestamp", "Chain"].map(v => (
                <span key={v} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">{v}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-700 uppercase tracking-wider text-slate-400 mb-2 font-bold">Hidden from public</p>
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
          <p className="text-2xl font-bold text-slate-800">{MOCK_TRANSFERS.length}</p>
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
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 pulse inline-block" />
            <span className="text-xs text-slate-400">Live</span>
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
              {MOCK_TRANSFERS.map((tx) => (
                <tr key={tx.txHash}>
                  <td>
                    <span className="mono text-blue-600 hover:text-blue-800 cursor-pointer">
                      {shortHash(tx.txHash)}
                    </span>
                  </td>
                  <td>
                    <span className="mono text-slate-500">{short(tx.from)}</span>
                  </td>
                  <td>
                    <span className="mono text-slate-500">{short(tx.to)}</span>
                  </td>
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
                  {/* Amount is visually hidden */}
                  <td>
                    <div className="flex items-center gap-1.5 group relative cursor-not-allowed">
                      <span className="text-slate-200 select-none blur-[4px] text-sm font-mono">
                        {tx.amount}
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

        {/* Footer note */}
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
