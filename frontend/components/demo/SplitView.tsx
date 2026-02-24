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

// ── Column shells ─────────────────────────────────────────────────────────────

function ColHeader({
  icon: Icon, label, sub, gradient, iconBg, iconColor,
}: {
  icon: typeof Eye; label: string; sub: string;
  gradient: string; iconBg: string; iconColor: string;
}) {
  return (
    <div className={`${gradient} rounded-t-xl px-4 py-3.5 flex items-center gap-2.5`}>
      <div className={`w-7 h-7 rounded-full ${iconBg} border border-white/20 flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-white font-bold text-sm">{label}</p>
        <p className="text-white/50 text-xs">{sub}</p>
      </div>
    </div>
  );
}

function DataRow({ label, value, hidden }: { label: string; value: string; hidden?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${hidden ? "bg-slate-50 border-slate-100" : "bg-white border-slate-100"}`}>
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
      {hidden ? (
        <div className="flex items-center gap-1.5">
          <span className="text-slate-200 select-none blur-[3px] text-sm">{value}</span>
          <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
        </div>
      ) : (
        <p className="text-sm font-semibold text-slate-700">{value}</p>
      )}
    </div>
  );
}

// ── Public Column ─────────────────────────────────────────────────────────────

function PublicColumn() {
  return (
    <div className="card flex flex-col h-full">
      <ColHeader
        icon={Eye} label="PUBLIC VIEW" sub="Anyone · 25% data access"
        gradient="bg-gradient-to-r from-slate-600 to-slate-700"
        iconBg="bg-white/15" iconColor="text-white"
      />
      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
        {/* Visible */}
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">✓ Visible</p>
        <DataRow label="TX Hash"    value={TX_SHORT} />
        <DataRow label="Chain"      value="Sepolia · 4 min ago" />
        <div className="rounded-lg p-3 border bg-emerald-50 border-emerald-200">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Compliance</p>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">COMPLIANT</span>
          </div>
        </div>

        {/* Hidden */}
        <p className="text-xs font-bold text-red-500 uppercase tracking-wider pt-1">✗ Hidden</p>
        {[
          ["Amount",      "1,200 CBT"],
          ["From",        "Alice · 0xAA…"],
          ["Jurisdiction","US / New York"],
          ["KYC Tier",    "Tier 2 Accredited"],
        ].map(([label, value]) => (
          <DataRow key={label} label={label} value={value} hidden />
        ))}

        {/* Footer */}
        <div className="mt-auto pt-2">
          <ChainlinkTooltip
            name="Chainlink CRE · Confidential HTTP"
            description="CRE executes compliance checks in a TEE. Raw KYC data never appears on-chain — only the pass/fail result reaches the public."
          >
            <span className="text-xs text-slate-400">Protected by CRE</span>
          </ChainlinkTooltip>
        </div>
      </div>
    </div>
  );
}

// ── Institution Column ────────────────────────────────────────────────────────

function InstitutionColumn() {
  return (
    <div className="card flex flex-col h-full">
      <ColHeader
        icon={Building2} label="INSTITUTION VIEW" sub="Alice only · 60% data access"
        gradient="bg-gradient-to-r from-blue-600 to-blue-700"
        iconBg="bg-white/15" iconColor="text-white"
      />
      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">✓ Own Data Visible</p>
        <DataRow label="TX Hash"      value={TX_SHORT} />
        <DataRow label="Chain"        value="Sepolia · 4 min ago" />

        <div className="rounded-lg p-3 border bg-blue-50 border-blue-100">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Compliance</p>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-700">COMPLIANT</span>
          </div>
        </div>

        <DataRow label="Amount"       value={`${AMOUNT} CBT`} />
        <DataRow label="KYC Tier"     value="Tier 2 · Accredited Investor" />
        <DataRow label="Max Transfer" value={`${MOCK_ATTESTATION.maxTransfer} CBT`} />
        <DataRow label="Jurisdiction" value={MOCK_ATTESTATION.jurisdiction} />

        {/* Cross-chain bridged */}
        <div className="rounded-lg p-3 border bg-emerald-50 border-emerald-200 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-700">Bridged · Arb Sepolia</p>
            <p className="text-xs text-emerald-500">CCIP delivery confirmed</p>
          </div>
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>

        <div className="mt-auto pt-2">
          <ChainlinkTooltip
            name="Chainlink CCIP"
            description="CCIP carries the attestation cross-chain. The institution sees their own data only — no other user's details are accessible."
          >
            <span className="text-xs text-slate-400">Portable via CCIP</span>
          </ChainlinkTooltip>
        </div>
      </div>
    </div>
  );
}

// ── Regulator Column ──────────────────────────────────────────────────────────

function RegulatorColumn() {
  return (
    <div className="card flex flex-col h-full">
      <ColHeader
        icon={Shield} label="REGULATOR VIEW" sub="Authorized · 100% data access"
        gradient="bg-gradient-to-r from-slate-800 to-slate-900"
        iconBg="bg-amber-400/20" iconColor="text-amber-400"
      />
      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">✓ Full Visibility</p>
        <DataRow label="TX Hash"      value={TX_SHORT} />

        {/* Amount — prominently unblurred */}
        <div className="rounded-lg p-3 border bg-amber-50 border-amber-200">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Amount (Full)</p>
          <p className="text-xl font-bold text-slate-800">{AMOUNT} <span className="text-sm text-slate-400 font-normal">CBT</span></p>
        </div>

        <DataRow label="From"         value={`Alice · ${FROM_ADDR}`} />
        <DataRow label="To"           value={`Treasury · ${TO_ADDR}`} />
        <DataRow label="Jurisdiction" value={ALICE_REG.jurisdiction} />

        {/* Compliance checks */}
        <div className="space-y-1.5">
          {Object.entries(ALICE_REG.checks).map(([key, check]) => (
            <div key={key} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
              check.passed ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
            }`}>
              {check.passed
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                : <XCircle    className="w-3.5 h-3.5 text-red-600    flex-shrink-0" />
              }
              <span className="text-xs font-semibold text-slate-700 capitalize flex-1">{key}</span>
              <span className={`text-xs font-bold ${check.passed ? "text-emerald-600" : "text-red-600"}`}>
                {check.passed ? "PASS" : "FAIL"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-2">
          <ChainlinkTooltip
            name="Chainlink CRE + CCIP"
            description="CRE fetched these check results via Confidential HTTP. CCIP broadcasts revocations to all chains when the regulator triggers enforcement."
          >
            <span className="text-xs text-slate-400">CRE + CCIP enforcement</span>
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
      <div
        className="rounded-xl px-6 py-5 flex items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #0f1f3d 0%, #1e3a5f 60%, #1e40af 100%)" }}
      >
        <div>
          <p className="text-white font-bold text-xl leading-tight">Same Transaction · Three Perspectives</p>
          <p className="text-blue-200/70 text-sm mt-1">
            Alice sends 1,200 CBT · Sepolia · Each viewer sees exactly what they are authorized to see
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-400/15 border border-amber-400/30 rounded-xl px-4 py-2 flex-shrink-0">
          <Eye className="w-4 h-4 text-amber-300" />
          <span className="text-sm font-bold text-amber-300 whitespace-nowrap">Split View</span>
        </div>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <PublicColumn />
        <InstitutionColumn />
        <RegulatorColumn />
      </div>

      {/* Legend */}
      <div className="card p-4 flex flex-wrap gap-6 justify-center">
        {[
          { label: "Public: compliance status only — no identity, no amounts", dot: "bg-slate-500" },
          { label: "Institution: own data + CCIP bridge status",               dot: "bg-blue-500" },
          { label: "Regulator: full amounts + identity + all check details",   dot: "bg-amber-500" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.dot}`} />
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        ))}
        <div className="w-full border-t border-slate-100 pt-3 text-center">
          <ChainlinkTooltip
            name="Chainlink CRE + CCIP + Confidential HTTP"
            description="CRE's Confidential HTTP creates the privacy boundary. CCIP propagates attestations and revocations across chains. Smart contract access control enforces the three-layer model."
          >
            <span className="text-xs text-slate-400">Powered by Chainlink CRE + CCIP + Confidential HTTP</span>
          </ChainlinkTooltip>
        </div>
      </div>
    </div>
  );
}
