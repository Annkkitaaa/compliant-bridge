"use client";
import { useState } from "react";
import { Shield, Eye, Building2, Link2, ExternalLink } from "lucide-react";
import PrivacyDiagram from "@/components/PrivacyDiagram";
import PublicTab from "@/components/tabs/PublicTab";
import InstitutionTab from "@/components/tabs/InstitutionTab";
import RegulatorTab from "@/components/tabs/RegulatorTab";

type TabId = "public" | "institution" | "regulator";

const TABS: { id: TabId; label: string; sub: string; icon: typeof Eye; color: string }[] = [
  {
    id: "public",
    label: "Public View",
    sub: "Anyone · Minimal data",
    icon: Eye,
    color: "text-slate-300",
  },
  {
    id: "institution",
    label: "Institution View",
    sub: "Wallet holder · Own data",
    icon: Building2,
    color: "text-blue-300",
  },
  {
    id: "regulator",
    label: "Regulator View",
    sub: "Authorized · Full data",
    icon: Shield,
    color: "text-amber-300",
  },
];

const CHAIN_PILL = (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
      <span className="w-2 h-2 rounded-full bg-emerald-400 pulse inline-block" />
      <span className="text-xs font-medium text-white/80">Sepolia</span>
    </div>
    <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
      <span className="w-2 h-2 rounded-full bg-violet-400 pulse inline-block" />
      <span className="text-xs font-medium text-white/80">Arb Sepolia</span>
    </div>
    <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
      <Link2 className="w-3 h-3 text-white/60" />
      <span className="text-xs font-medium text-white/70">CCIP Live</span>
    </div>
  </div>
);

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("public");

  return (
    <div className="min-h-screen" style={{ background: "#f0f4f8" }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="gradient-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-8 pb-6">
            {/* Top bar */}
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/30 border border-blue-400/30 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-300" />
                  </div>
                  <span className="text-blue-300 text-xs font-bold tracking-widest uppercase">Chainlink · CCIP · CRE</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  CrossChain Compliance Gateway
                </h1>
                <p className="text-blue-200/80 mt-1.5 text-sm sm:text-base">
                  Privacy-Preserving Compliance for Tokenized Assets · Check once, verify everywhere
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {CHAIN_PILL}
                <a
                  href="https://ccip.chain.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-300/60 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Track CCIP messages
                </a>
              </div>
            </div>

            {/* Privacy diagram */}
            <PrivacyDiagram />

            {/* Tab bar */}
            <div className="flex gap-2 mt-5 pb-0">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-5 py-3 rounded-t-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-[#f0f4f8] text-slate-800 shadow-lg"
                        : "text-white/60 hover:text-white/90 hover:bg-white/10"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-slate-600" : tab.color}`} />
                    <div className="text-left hidden sm:block">
                      <p className={`leading-tight ${isActive ? "text-slate-800" : "text-white/80"}`}>{tab.label}</p>
                      <p className={`text-xs font-normal leading-tight ${isActive ? "text-slate-400" : "text-white/40"}`}>{tab.sub}</p>
                    </div>
                    <span className="sm:hidden">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "public"      && <PublicTab />}
        {activeTab === "institution" && <InstitutionTab />}
        {activeTab === "regulator"   && <RegulatorTab />}
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> ComplianceGateway · Sepolia:
              <span className="mono text-slate-500">0x472E...d33</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> ComplianceGateway · Arb Sepolia:
              <span className="mono text-slate-500">0x64f0...F76</span>
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Built with Chainlink CCIP · Chainlink CRE · Confidential HTTP
          </p>
        </div>
      </footer>
    </div>
  );
}
