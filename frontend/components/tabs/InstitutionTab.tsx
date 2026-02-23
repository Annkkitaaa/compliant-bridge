"use client";
import { useState } from "react";
import { MOCK_ATTESTATION } from "@/lib/mockData";
import {
  Wallet, CheckCircle, Clock, Globe, ArrowRight,
  Send, RefreshCw, Link2, Shield, AlertTriangle, ChevronRight
} from "lucide-react";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function daysLeft(d: Date) {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
}

const DEMO_ADDRESS = "0xAA00000000000000000000000000000000000001";

function TierBadge({ tier }: { tier: number }) {
  const styles = [
    "",
    "bg-sky-50 text-sky-700 border-sky-200",
    "bg-violet-50 text-violet-700 border-violet-200",
    "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  ];
  const labels = ["", "Retail", "Accredited", "Institutional"];
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${styles[tier]}`}>
      TIER {tier} · {labels[tier]}
    </span>
  );
}

export default function InstitutionTab() {
  const [connected, setConnected] = useState(false);
  const [bridging, setBridging] = useState(false);
  const [bridged, setBridged] = useState(false);
  const att = MOCK_ATTESTATION;
  const days = daysLeft(att.validUntil);

  function handleConnect() { setConnected(true); }

  function handleBridge() {
    setBridging(true);
    setTimeout(() => { setBridging(false); setBridged(true); }, 2000);
  }

  if (!connected) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[480px] gap-6">
        <div className="card p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-5">
            <Wallet className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Institution Portal</h3>
          <p className="text-slate-500 text-sm mb-6">
            Connect your wallet to view your compliance attestation, token balances, and cross-chain status.
          </p>
          <button
            onClick={handleConnect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
          <p className="text-xs text-slate-400 mt-4">Demo: connects as Alice (Tier 2 · US/NY)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-5">

      {/* Connected wallet header */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500" />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              0xAA00…0001 <span className="text-slate-400 font-normal">(Alice)</span>
            </p>
            <p className="text-xs text-slate-400">Connected · Sepolia</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block pulse" />
          <span className="text-xs text-emerald-600 font-semibold">Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Attestation Card */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-700">Your Compliance Attestation</span>
            </div>
            <TierBadge tier={att.tier} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Max Transfer",  value: `$${att.maxTransfer} CBT`,   icon: "💰" },
              { label: "Source Chain",  value: att.sourceChain,              icon: "⛓️" },
              { label: "Issued",        value: formatDate(att.issuedAt),     icon: "📋" },
              { label: "Jurisdiction",  value: att.jurisdiction,             icon: "🌍" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{icon} {label}</p>
                <p className="text-sm font-semibold text-slate-700">{value}</p>
              </div>
            ))}
          </div>

          {/* Expiry bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Valid until {formatDate(att.validUntil)}</span>
              </div>
              <span className={`text-xs font-bold ${days < 30 ? "text-amber-600" : "text-emerald-600"}`}>
                {days} days remaining
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${days < 30 ? "bg-amber-400" : "bg-emerald-400"}`}
                style={{ width: `${Math.min(100, (days / 365) * 100)}%` }}
              />
            </div>
          </div>

          {/* Check ID */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Check ID</p>
            <p className="mono text-slate-600 break-all">{att.checkId}</p>
          </div>
        </div>

        {/* Balances + Actions */}
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Token Balances</p>
            {att.balances.map(b => (
              <div key={b.chain} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{b.balance} <span className="text-slate-400 font-normal">{b.token}</span></p>
                  <p className="text-xs text-slate-400">{b.chain}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  b.chainId === 11155111
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-purple-50 text-purple-600 border-purple-200"
                }`}>{b.chainId === 11155111 ? "ETH" : "ARB"}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="card p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Actions</p>
            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all duration-150 group">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Request Compliance Check
              </div>
              <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={handleBridge}
              disabled={bridging || bridged}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                bridged
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                  : bridging
                  ? "bg-violet-50 text-violet-600 border border-violet-200 cursor-wait"
                  : "bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 hover:border-violet-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {bridged ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {bridged ? "Bridged to Arb Sepolia" : bridging ? "Sending via CCIP…" : "Bridge Attestation"}
              </div>
              {!bridged && <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </div>
        </div>
      </div>

      {/* Cross-chain status */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-700">Cross-Chain Attestation Status</span>
          <span className="text-xs text-slate-400 ml-auto">Your attestation is portable across chains</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Source */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">S</div>
            <div>
              <p className="text-xs font-bold text-blue-700">Sepolia</p>
              <p className="text-xs text-blue-400">Source · Local</p>
            </div>
            <CheckCircle className="w-4 h-4 text-blue-500 ml-1" />
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
          <div className="text-xs text-slate-400 text-center flex-shrink-0">
            <p className="font-medium">CCIP</p>
            <p>~8 min</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />

          {/* Destination */}
          {(att.bridgedTo.length > 0 || bridged) ? (
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">A</div>
              <div>
                <p className="text-xs font-bold text-violet-700">Arb Sepolia</p>
                <p className="text-xs text-violet-400">Remote · Bridged</p>
              </div>
              <CheckCircle className="w-4 h-4 text-violet-500 ml-1" />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-400">A</div>
              <div>
                <p className="text-xs font-bold text-slate-400">Arb Sepolia</p>
                <p className="text-xs text-slate-300">Not bridged yet</p>
              </div>
            </div>
          )}

          <div className="flex-1 text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <Link2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">
                Attestation valid on all bridged chains simultaneously
              </span>
            </div>
          </div>
        </div>

        {(att.bridgedTo.length > 0 || bridged) && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              Your compliance is recognized on Arbitrum Sepolia — trade across chains without re-verification.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
