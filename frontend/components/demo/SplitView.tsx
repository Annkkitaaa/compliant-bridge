"use client";
import {
  Eye, EyeOff, Building2, Shield, Lock, CheckCircle,
  XCircle, Link2, Clock,
} from "lucide-react";
import { MOCK_ATTESTATION, MOCK_REGULATOR_DATA } from "@/lib/mockData";
import ChainlinkTooltip from "./ChainlinkTooltip";

// ── Shared focal data ─────────────────────────────────────────────────────────

const TX_HASH   = "0xa48328ae8c953a1e6a1aca42b779abb76e68d1d25f11d83b96e5337d97611aa0";
const TX_SHORT  = "0xa48328…aa0";
const FROM_ADDR = "0xAA00…0001";
const TO_ADDR   = "0x3B8D…75a";
const AMOUNT    = "1,200.00";
const ALICE_REG = MOCK_REGULATOR_DATA["0xAA00000000000000000000000000000000000001"];

const surface = { background: "#13151A", border: "1px solid #1F2235" };

// ── Column shells ─────────────────────────────────────────────────────────────

function ColHeader({ icon: Icon, label, sub, accentColor, iconBg }: {
  icon: typeof Eye; label: string; sub: string; accentColor: string; iconBg: string;
}) {
  return (
    <div className="px-4 py-3.5 flex items-center gap-2.5 rounded-t-[13px]"
      style={{ background: iconBg }}
    >
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
      </div>
      <div>
        <p className="text-white font-bold text-sm">{label}</p>
        <p className="text-[#8892A4] text-xs">{sub}</p>
      </div>
    </div>
  );
}

function DataRow({ label, value, hidden }: { label: string; value: string; hidden?: boolean }) {
  return (
    <div className="rounded-xl p-3"
      style={{ background: hidden ? "#0F1015" : "#181A22", border: `1px solid ${hidden ? "#1F2235" : "#252840"}` }}
    >
      <p className="text-xs text-[#8892A4] font-semibold uppercase tracking-wide mb-1">{label}</p>
      {hidden ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[#252840] select-none blur-[3px] text-sm">{value}</span>
          <Lock className="w-3 h-3 text-[#252840] flex-shrink-0" />
        </div>
      ) : (
        <p className="text-sm font-semibold text-white">{value}</p>
      )}
    </div>
  );
}

// ── Public Column ─────────────────────────────────────────────────────────────

function PublicColumn() {
  return (
    <div className="rounded-[14px] flex flex-col h-full" style={surface}>
      <ColHeader icon={Eye} label="PUBLIC VIEW" sub="Anyone · 25% data access"
        accentColor="#8892A4"
        iconBg="linear-gradient(135deg, rgba(136,146,164,0.15) 0%, rgba(136,146,164,0.08) 100%)"
      />
      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#16C784" }}>✓ Visible</p>
        <DataRow label="TX Hash"    value={TX_SHORT} />
        <DataRow label="Chain"      value="Sepolia · 4 min ago" />
        <div className="rounded-xl p-3"
          style={{ background: "rgba(22,199,132,0.08)", border: "1px solid rgba(22,199,132,0.2)" }}
        >
          <p className="text-xs text-[#8892A4] font-semibold uppercase tracking-wide mb-1.5">Compliance</p>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#16C784]" />
            <span className="text-sm font-bold text-[#16C784]">COMPLIANT</span>
          </div>
        </div>

        <p className="text-xs font-bold uppercase tracking-wider pt-1" style={{ color: "#EA3943" }}>✗ Hidden</p>
        {[
          ["Amount",       "1,200 CBT"],
          ["From",         "Alice · 0xAA…"],
          ["Jurisdiction", "US / New York"],
          ["KYC Tier",     "Tier 2 Accredited"],
        ].map(([label, value]) => (
          <DataRow key={label} label={label} value={value} hidden />
        ))}

        <div className="mt-auto pt-2">
          <ChainlinkTooltip name="Chainlink CRE · Confidential HTTP"
            description="CRE executes compliance checks in a TEE. Raw KYC data never appears on-chain — only the pass/fail result reaches the public."
          >
            <span className="text-xs text-[#4A5568]">Protected by CRE</span>
          </ChainlinkTooltip>
        </div>
      </div>
    </div>
  );
}

// ── Institution Column ────────────────────────────────────────────────────────

function InstitutionColumn() {
  return (
    <div className="rounded-[14px] flex flex-col h-full" style={surface}>
      <ColHeader icon={Building2} label="INSTITUTION VIEW" sub="Alice only · 60% data access"
        accentColor="#5B7FE8"
        iconBg="linear-gradient(135deg, rgba(55,91,210,0.2) 0%, rgba(55,91,210,0.1) 100%)"
      />
      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5B7FE8" }}>✓ Own Data Visible</p>
        <DataRow label="TX Hash" value={TX_SHORT} />
        <DataRow label="Chain"   value="Sepolia · 4 min ago" />

        <div className="rounded-xl p-3"
          style={{ background: "rgba(55,91,210,0.1)", border: "1px solid rgba(55,91,210,0.25)" }}
        >
          <p className="text-xs text-[#8892A4] font-semibold uppercase tracking-wide mb-1.5">Compliance</p>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#5B7FE8]" />
            <span className="text-sm font-bold text-[#5B7FE8]">COMPLIANT</span>
          </div>
        </div>

        <DataRow label="Amount"       value={`${AMOUNT} CBT`} />
        <DataRow label="KYC Tier"     value="Tier 2 · Accredited Investor" />
        <DataRow label="Max Transfer" value={`${MOCK_ATTESTATION.maxTransfer} CBT`} />
        <DataRow label="Jurisdiction" value={MOCK_ATTESTATION.jurisdiction} />

        <div className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: "rgba(22,199,132,0.08)", border: "1px solid rgba(22,199,132,0.2)" }}
        >
          <Link2 className="w-4 h-4 text-[#16C784] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-[#16C784]">Bridged · Arb Sepolia</p>
            <p className="text-xs text-[#16C784]/60">CCIP delivery confirmed</p>
          </div>
          <CheckCircle className="w-4 h-4 text-[#16C784]" />
        </div>

        <div className="mt-auto pt-2">
          <ChainlinkTooltip name="Chainlink CCIP"
            description="CCIP carries the attestation cross-chain. The institution sees their own data only — no other user's details are accessible."
          >
            <span className="text-xs text-[#4A5568]">Portable via CCIP</span>
          </ChainlinkTooltip>
        </div>
      </div>
    </div>
  );
}

// ── Regulator Column ──────────────────────────────────────────────────────────

function RegulatorColumn() {
  return (
    <div className="rounded-[14px] flex flex-col h-full" style={surface}>
      <ColHeader icon={Shield} label="REGULATOR VIEW" sub="Authorized · 100% data access"
        accentColor="#F5AC37"
        iconBg="linear-gradient(135deg, rgba(245,172,55,0.15) 0%, rgba(245,172,55,0.08) 100%)"
      />
      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#F5AC37" }}>✓ Full Visibility</p>
        <DataRow label="TX Hash" value={TX_SHORT} />

        <div className="rounded-xl p-3"
          style={{ background: "rgba(245,172,55,0.08)", border: "1px solid rgba(245,172,55,0.2)" }}
        >
          <p className="text-xs text-[#8892A4] font-semibold uppercase tracking-wide mb-1">Amount (Full)</p>
          <p className="text-xl font-black text-white">{AMOUNT} <span className="text-sm text-[#8892A4] font-normal">CBT</span></p>
        </div>

        <DataRow label="From"         value={`Alice · ${FROM_ADDR}`} />
        <DataRow label="To"           value={`Treasury · ${TO_ADDR}`} />
        <DataRow label="Jurisdiction" value={ALICE_REG.jurisdiction} />

        <div className="space-y-1.5">
          {Object.entries(ALICE_REG.checks).map(([key, check]) => (
            <div key={key} className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={check.passed
                ? { background: "rgba(22,199,132,0.07)", border: "1px solid rgba(22,199,132,0.15)" }
                : { background: "rgba(234,57,67,0.07)", border: "1px solid rgba(234,57,67,0.15)" }
              }
            >
              {check.passed
                ? <CheckCircle className="w-3.5 h-3.5 text-[#16C784] flex-shrink-0" />
                : <XCircle    className="w-3.5 h-3.5 text-[#EA3943] flex-shrink-0" />
              }
              <span className="text-xs font-semibold text-[#C8D0DC] capitalize flex-1">{key}</span>
              <span className={`text-xs font-bold ${check.passed ? "text-[#16C784]" : "text-[#EA3943]"}`}>
                {check.passed ? "PASS" : "FAIL"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-2">
          <ChainlinkTooltip name="Chainlink CRE + CCIP"
            description="CRE fetched these check results via Confidential HTTP. CCIP broadcasts revocations to all chains when the regulator triggers enforcement."
          >
            <span className="text-xs text-[#4A5568]">CRE + CCIP enforcement</span>
          </ChainlinkTooltip>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SplitView() {
  return (
    <div className="fade-in space-y-5">
      {/* Banner */}
      <div className="rounded-2xl px-6 py-5 flex items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, rgba(55,91,210,0.15) 0%, rgba(55,91,210,0.08) 100%)", border: "1px solid rgba(55,91,210,0.2)" }}
      >
        <div>
          <p className="text-white font-bold text-xl leading-tight">Same Transaction · Three Perspectives</p>
          <p className="text-[#8892A4] text-sm mt-1">
            Alice sends 1,200 CBT · Sepolia · Each viewer sees exactly what they are authorized to see
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0"
          style={{ background: "rgba(245,172,55,0.12)", border: "1px solid rgba(245,172,55,0.25)" }}
        >
          <Eye className="w-4 h-4 text-[#F5AC37]" />
          <span className="text-sm font-bold text-[#F5AC37] whitespace-nowrap">Split View</span>
        </div>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <PublicColumn />
        <InstitutionColumn />
        <RegulatorColumn />
      </div>

      {/* Legend */}
      <div className="rounded-2xl p-4 flex flex-wrap gap-6 justify-center" style={surface}>
        {[
          { label: "Public: compliance status only — no identity, no amounts", color: "#8892A4" },
          { label: "Institution: own data + CCIP bridge status",               color: "#375BD2" },
          { label: "Regulator: full amounts + identity + all check details",   color: "#F5AC37" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-xs text-[#8892A4]">{item.label}</span>
          </div>
        ))}
        <div className="w-full pt-3 text-center" style={{ borderTop: "1px solid #1F2235" }}>
          <ChainlinkTooltip name="Chainlink CRE + CCIP + Confidential HTTP"
            description="CRE's Confidential HTTP creates the privacy boundary. CCIP propagates attestations and revocations across chains. Smart contract access control enforces the three-layer model."
          >
            <span className="text-xs text-[#4A5568]">Powered by Chainlink CRE + CCIP + Confidential HTTP</span>
          </ChainlinkTooltip>
        </div>
      </div>
    </div>
  );
}
