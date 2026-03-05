"use client";
import { Shield, Eye, Building2, Columns2, Waves } from "lucide-react";
import Navbar        from "@/components/Navbar";
import Hero          from "@/components/Hero";
import HowItWorks    from "@/components/HowItWorks";
import Footer        from "@/components/Footer";
import PublicTab      from "@/components/tabs/PublicTab";
import InstitutionTab from "@/components/tabs/InstitutionTab";
import RegulatorTab   from "@/components/tabs/RegulatorTab";
import PoolTab        from "@/components/tabs/PoolTab";
import SplitView      from "@/components/demo/SplitView";
import FlowBar        from "@/components/demo/FlowBar";
import DemoPanel      from "@/components/demo/DemoPanel";
import { DemoProvider, useDemoContext, type TabId } from "@/context/DemoContext";

// ── Tab config ────────────────────────────────────────────────────────────────

const BASE_TABS: {
  id: TabId; label: string; sub: string; icon: typeof Eye; accentColor: string;
}[] = [
  { id: "public",      label: "Public",          sub: "Anyone · Pass/Fail only",  icon: Eye,       accentColor: "#8892A4" },
  { id: "institution", label: "Institution",     sub: "Wallet holder · Own data", icon: Building2, accentColor: "#375BD2" },
  { id: "regulator",   label: "Regulator",       sub: "Authorized · Full data",   icon: Shield,    accentColor: "#F5AC37" },
  { id: "pool",        label: "Compliant Pool",  sub: "CLP · Gated AMM",          icon: Waves,     accentColor: "#16C784" },
];

const SPLIT_TAB = {
  id:          "split" as TabId,
  label:       "Split View",
  sub:         "Demo · All perspectives",
  icon:        Columns2,
  accentColor: "#7B5CF8",
};

// ── Inner page ────────────────────────────────────────────────────────────────

function HomeContent() {
  const { demoMode, activeTab, setActiveTab } = useDemoContext();
  const tabs = demoMode ? [...BASE_TABS, SPLIT_TAB] : BASE_TABS;

  return (
    <div className={`min-h-screen ${demoMode ? "pb-20" : ""}`}
      style={{ background: "#0D0E12" }}
    >
      <Navbar />
      <Hero />
      <HowItWorks />

      {/* ── Dashboard section ────────────────────────────────────────── */}
      <section id="app" className="py-16"
        style={{ background: "linear-gradient(180deg, #0F1118 0%, #0D0E12 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(55,91,210,0.08)", border: "1px solid rgba(55,91,210,0.2)" }}
            >
              <span className="text-xs font-bold uppercase tracking-widest text-[#375BD2]">
                Live Dashboard
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
              Three Views. One System.
            </h2>
            <p className="text-[#8892A4] max-w-lg mx-auto text-[15px]">
              Same blockchain data, different access levels — enforced by smart contracts and Chainlink CRE.
            </p>
          </div>

          {/* Flow bar — demo only */}
          <FlowBar />

          {/* Tab bar */}
          <div className="flex gap-1 p-1 rounded-2xl mb-6 mt-4"
            style={{ background: "#13151A", border: "1px solid #1F2235" }}
          >
            {tabs.map(tab => {
              const Icon     = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background:  isActive ? "#1F2235"                       : "transparent",
                    color:       isActive ? "#FFFFFF"                       : "#8892A4",
                    border:      isActive ? `1px solid ${tab.accentColor}33` : "1px solid transparent",
                    boxShadow:   isActive ? `0 0 12px ${tab.accentColor}20` : "none",
                  }}
                >
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: isActive ? tab.accentColor : "#4A5568" }}
                  />
                  <div className="text-left hidden sm:block">
                    <p className="leading-tight">{tab.label}</p>
                    <p className="text-[10px] font-normal leading-tight"
                      style={{ color: isActive ? "#8892A4" : "#4A5568" }}
                    >
                      {tab.sub}
                    </p>
                  </div>
                  <span className="sm:hidden">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === "public"      && <PublicTab />}
            {activeTab === "institution" && <InstitutionTab />}
            {activeTab === "regulator"   && <RegulatorTab />}
            {activeTab === "split"       && <SplitView />}
            {activeTab === "pool"        && <PoolTab />}
          </div>
        </div>
      </section>

      <Footer />
      <DemoPanel />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <DemoProvider>
      <HomeContent />
    </DemoProvider>
  );
}
