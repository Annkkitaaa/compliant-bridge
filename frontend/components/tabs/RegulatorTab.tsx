// Chainlink Integration: CCIP
// Purpose: Calls AttestationInvalidator.invalidateAcrossChains() to broadcast attestation
//          revocations across all chains simultaneously via Chainlink CCIP. A single regulator
//          transaction propagates the revocation to Sepolia and Arb Sepolia in one call.
"use client";
import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import {
  ADDRESSES, GATEWAY_ABI, REGULATOR_ABI, INVALIDATOR_ABI,
  getReadProvider, getBrowserSigner, switchToSepolia,
  decodeJurisdiction, formatCBT, shortAddr,
  type OnchainAttestation, type TransferRecord,
} from "@/lib/contracts";
import { MOCK_REGULATOR_DATA } from "@/lib/mockData";
import { ToastContainer, ToastData, toastId } from "@/components/Toast";
import {
  Search, Shield, AlertTriangle, CheckCircle, XCircle, Clock,
  Globe, Activity, ChevronDown, ChevronUp, Zap, Eye, History,
  AlertOctagon, RefreshCw,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface SubjectData {
  address:    string;
  label:      string;
  attestation: OnchainAttestation | null;
  compliant:  boolean;
  revoked:    boolean;
  transfers:  TransferRecord[];
  tier:        number;
  jurisdiction: string;
  maxTransfer: string;
  issuedAt:    Date;
  validUntil:  Date;
  status:      "compliant" | "revoked" | "expiring" | "unknown";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function short(addr: string) { return shortAddr(addr, 8, 6); }

function knownLabel(addr: string): string {
  const map: Record<string, string> = {
    "0xaa00000000000000000000000000000000000001": "Alice",
    "0xaa00000000000000000000000000000000000002": "Bob",
    "0xbb00000000000000000000000000000000000001": "Charlie",
    "0xcc00000000000000000000000000000000000001": "Dave",
  };
  return map[addr.toLowerCase()] ?? short(addr);
}

function StatusBadge({ status }: { status: SubjectData["status"] }) {
  if (status === "compliant")
    return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
      style={{ background: "rgba(22,199,132,0.12)", border: "1px solid rgba(22,199,132,0.3)", color: "#16C784" }}
    ><span className="w-1.5 h-1.5 rounded-full bg-[#16C784] pulse inline-block" />COMPLIANT</span>;
  if (status === "revoked")
    return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
      style={{ background: "rgba(234,57,67,0.12)", border: "1px solid rgba(234,57,67,0.3)", color: "#EA3943" }}
    ><span className="w-1.5 h-1.5 rounded-full bg-[#EA3943] inline-block" />REVOKED</span>;
  if (status === "expiring")
    return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
      style={{ background: "rgba(245,172,55,0.12)", border: "1px solid rgba(245,172,55,0.3)", color: "#F5AC37" }}
    ><span className="w-1.5 h-1.5 rounded-full bg-[#F5AC37] inline-block" />EXPIRING SOON</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
    style={{ background: "#1F2235", border: "1px solid #252840", color: "#8892A4" }}
  >UNKNOWN</span>;
}

function CheckRow({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden mb-2"
      style={{ border: `1px solid ${passed ? "rgba(22,199,132,0.2)" : "rgba(234,57,67,0.2)"}` }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ background: passed ? "rgba(22,199,132,0.06)" : "rgba(234,57,67,0.06)" }}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {passed
            ? <CheckCircle className="w-4 h-4 text-[#16C784] flex-shrink-0" />
            : <XCircle    className="w-4 h-4 text-[#EA3943] flex-shrink-0" />
          }
          <span className="text-sm font-semibold text-white">{label}</span>
          <span className={`text-xs font-bold ${passed ? "text-[#16C784]" : "text-[#EA3943]"}`}>
            {passed ? "PASS" : "FAIL"}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#4A5568]" /> : <ChevronDown className="w-4 h-4 text-[#4A5568]" />}
      </button>
      {open && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid #1F2235", background: "#13151A" }}>
          <p className="text-xs text-[#8892A4] font-mono">{detail}</p>
        </div>
      )}
    </div>
  );
}

const SUBJECT_OPTIONS = [
  { address: "0xAA00000000000000000000000000000000000001", label: "Alice  ·  Compliant · Tier 2 · US/NY" },
  { address: "0xAa00000000000000000000000000000000000002", label: "Bob  ·  REVOKED · Tier 3 · GB/London" },
  { address: "0xBb00000000000000000000000000000000000001", label: "Charlie  ·  Expiring · Tier 1 · DE/Berlin" },
];

// ── Component ─────────────────────────────────────────────────────────────────

const BOB_ADDRESS = "0xAa00000000000000000000000000000000000002";
const surface = { background: "#13151A", border: "1px solid #1F2235" };

export default function RegulatorTab() {
  const [query,   setQuery]   = useState("");
  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string>("");

  const [revoking,  setRevoking]  = useState(false);
  const [revoked,   setRevoked]   = useState(false);
  const [revokeTx,  setRevokeTx]  = useState<string>("");

  const [activeSection, setActiveSection] = useState<"checks" | "history" | "transfers">("checks");
  const [toasts, setToasts] = useState<ToastData[]>([]);

  function addToast(t: Omit<ToastData, "id">) {
    setToasts(prev => [...prev, { ...t, id: toastId() }]);
  }
  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // ── Lookup ────────────────────────────────────────────────────────────────

  const lookup = useCallback(async (addr: string) => {
    if (!addr || !ethers.isAddress(addr)) {
      setError("Invalid Ethereum address.");
      return;
    }
    setLoading(true);
    setError("");
    setSubject(null);
    setRevoked(false);
    setRevokeTx("");

    try {
      const provider = getReadProvider("sepolia");
      const regView  = new ethers.Contract(ADDRESSES.sepolia.regulatorView, REGULATOR_ABI, provider);
      const ownerAddr: string = await regView.owner();

      const [details, transfers]: [
        [OnchainAttestation, boolean, boolean],
        TransferRecord[],
      ] = await Promise.all([
        regView.getFullComplianceDetails.staticCall(addr, { from: ownerAddr }) as Promise<[OnchainAttestation, boolean, boolean]>,
        regView.getTransferHistory.staticCall(addr, { from: ownerAddr }) as Promise<TransferRecord[]>,
      ]);

      const [att, compliant, isRevoked] = details;

      if (att.validUntil === 0n) {
        const mockKey = Object.keys(MOCK_REGULATOR_DATA).find(k => k.toLowerCase() === addr.toLowerCase());
        if (mockKey) {
          const mock = MOCK_REGULATOR_DATA[mockKey];
          setSubject({
            address: addr, label: mock.label, attestation: null,
            compliant: mock.status !== "revoked", revoked: mock.status === "revoked",
            transfers: [], tier: mock.tier, jurisdiction: mock.jurisdiction,
            maxTransfer: mock.maxTransfer, issuedAt: mock.issuedAt, validUntil: mock.validUntil, status: mock.status,
          });
        } else {
          setError("No compliance attestation found on Sepolia for this address.");
        }
        return;
      }

      const jurisdiction = decodeJurisdiction(att.jurisdictionData);
      const validUntil   = new Date(Number(att.validUntil) * 1000);
      const daysLeft     = Math.ceil((validUntil.getTime() - Date.now()) / 86400000);

      let status: SubjectData["status"] = "unknown";
      if (isRevoked)          status = "revoked";
      else if (!compliant)    status = "revoked";
      else if (daysLeft < 30) status = "expiring";
      else                    status = "compliant";

      setSubject({
        address: addr, label: knownLabel(addr), attestation: att, compliant, revoked: isRevoked,
        transfers, tier: Number(att.tier), jurisdiction,
        maxTransfer: formatCBT(att.maxTransferValue),
        issuedAt:    new Date(Number(att.issuedAt) * 1000), validUntil, status,
      });
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Failed to load data";
      const mockKey = Object.keys(MOCK_REGULATOR_DATA).find(k => k.toLowerCase() === addr.toLowerCase());
      if (mockKey) {
        const mock = MOCK_REGULATOR_DATA[mockKey];
        setSubject({
          address: addr, label: mock.label, attestation: null,
          compliant: mock.status !== "revoked", revoked: mock.status === "revoked",
          transfers: [], tier: mock.tier, jurisdiction: mock.jurisdiction,
          maxTransfer: mock.maxTransfer, issuedAt: mock.issuedAt, validUntil: mock.validUntil, status: mock.status,
        });
        addToast({ type: "info", title: "Using sample data", message: "Could not reach Sepolia RPC — showing example records." });
      } else {
        setError(msg.slice(0, 160));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Revoke ────────────────────────────────────────────────────────────────

  async function handleRevoke() {
    if (!subject || revoking) return;
    setRevoking(true);
    try {
      await switchToSepolia();
      const signer      = await getBrowserSigner();
      const invalidator = new ethers.Contract(ADDRESSES.sepolia.invalidator, INVALIDATOR_ABI, signer);

      const reason = `Sanctions update: address flagged — revoked via Regulator Portal`;
      const tx = await invalidator.invalidateAcrossChains(
        subject.address, reason,
        [ADDRESSES.ccip.arbSepoliaSelector],
        [ADDRESSES.arbSepolia.receiver],
      );

      addToast({ type: "info", title: "Revocation sent", message: `Tx: ${tx.hash.slice(0, 18)}…` });
      await tx.wait();
      setRevokeTx(tx.hash);
      setRevoked(true);
      setSubject(prev => prev ? { ...prev, status: "revoked", revoked: true } : prev);
      addToast({ type: "success", title: "Revoked cross-chain", message: "CCIP message sent to all registered chains" });
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "";
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        addToast({ type: "info", title: "Cancelled" });
      } else if (msg.includes("OnlyAuthorized") || msg.includes("Unauthorized") || msg.includes("OnlyOwner")) {
        addToast({ type: "info", title: "Not authorized", message: "Only the contract owner can broadcast cross-chain revocations." });
        setRevoked(false);
      } else {
        addToast({ type: "error", title: "Revocation failed", message: msg.slice(0, 120) });
      }
    } finally {
      setRevoking(false);
    }
  }

  function getChecks(s: SubjectData) {
    const mock = MOCK_REGULATOR_DATA[
      Object.keys(MOCK_REGULATOR_DATA).find(k => k.toLowerCase() === s.address.toLowerCase()) ?? ""
    ];
    if (mock) return mock.checks;
    return {
      sanctions:    { passed: !s.revoked, detail: s.revoked ? "Address flagged on sanctions list" : "No OFAC/UN/EU matches found" },
      kyc:          { passed: s.tier >= 1, detail: `Tier ${s.tier} identity verified` },
      accredited:   { passed: s.tier >= 2, detail: s.tier >= 2 ? "Accredited investor confirmed" : "Basic retail investor" },
      jurisdiction: { passed: true,        detail: `Jurisdiction: ${s.jurisdiction} — permitted` },
    };
  }

  function getHistory(s: SubjectData) {
    const mock = MOCK_REGULATOR_DATA[
      Object.keys(MOCK_REGULATOR_DATA).find(k => k.toLowerCase() === s.address.toLowerCase()) ?? ""
    ];
    if (mock) return mock.history;
    const history: { event: string; date: Date; chain: string; detail: string }[] = [
      { event: "Attestation issued", date: s.issuedAt, chain: "Sepolia", detail: `Tier ${s.tier} compliance check passed` },
    ];
    if (revoked) {
      history.push({ event: "Attestation REVOKED", date: new Date(), chain: "Sepolia", detail: "Revoked via Regulator Portal" });
      history.push({ event: "Revocation broadcast", date: new Date(), chain: "Arbitrum Sepolia", detail: "CCIP revocation message sent" });
    }
    return history;
  }

  const currentStatus = revoked ? "revoked" : (subject?.status ?? "unknown");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fade-in space-y-5">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Regulator header */}
      <div className="rounded-2xl px-6 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, rgba(245,172,55,0.08) 0%, rgba(245,172,55,0.04) 100%)", border: "1px solid rgba(245,172,55,0.2)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(245,172,55,0.15)", border: "1px solid rgba(245,172,55,0.35)" }}
          >
            <Shield className="w-4 h-4 text-[#F5AC37]" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">REGULATOR ACCESS PORTAL</p>
            <p className="text-[#8892A4] text-xs mt-0.5">Full compliance visibility · Authorized personnel only</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(245,172,55,0.1)", border: "1px solid rgba(245,172,55,0.25)" }}
        >
          <Eye className="w-3.5 h-3.5 text-[#F5AC37]" />
          <span className="text-[#F5AC37] text-xs font-semibold">Full Data Access</span>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl p-4" style={surface}>
        <p className="text-xs font-bold uppercase tracking-wider text-[#8892A4] mb-3">Subject Lookup</p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A5568]" />
            <input
              type="text"
              placeholder="Enter wallet address or select below…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && lookup(query.trim())}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm mono"
              style={{ background: "#0D0E12", border: "1px solid #1F2235", color: "#C8D0DC" }}
            />
          </div>
          <button
            onClick={() => lookup(query.trim())}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ background: "#1F2235", color: "#8892A4", border: "1px solid #252840" }}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Loading…" : "Lookup"}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-xs rounded-xl px-3 py-2"
            style={{ background: "rgba(234,57,67,0.1)", border: "1px solid rgba(234,57,67,0.25)", color: "#EA3943" }}
          >{error}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {SUBJECT_OPTIONS.map(opt => (
            <button
              key={opt.address}
              onClick={() => { setQuery(opt.address); lookup(opt.address); }}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "#1F2235", border: "1px solid #252840", color: "#8892A4" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                (e.currentTarget as HTMLElement).style.borderColor = "#375BD2";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = "#8892A4";
                (e.currentTarget as HTMLElement).style.borderColor = "#252840";
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject details */}
      {subject && (
        <div className="space-y-4 fade-in">

          {/* Summary row */}
          <div className="rounded-2xl p-5" style={surface}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: "linear-gradient(135deg, #1F2235, #252840)" }}
                  >
                    {subject.label[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-lg">{subject.label}</h3>
                      <StatusBadge status={currentStatus} />
                      {subject.attestation && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(22,199,132,0.1)", border: "1px solid rgba(22,199,132,0.25)", color: "#16C784" }}
                        >Live · Sepolia</span>
                      )}
                    </div>
                    <p className="mono text-[#4A5568] text-xs">{subject.address}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {[
                    { label: "Tier",         value: `Tier ${subject.tier}` },
                    { label: "Jurisdiction", value: subject.jurisdiction },
                    { label: "Max Transfer", value: `$${subject.maxTransfer}` },
                    { label: "Issued",       value: formatDate(subject.issuedAt) },
                    { label: "Expires",      value: formatDate(subject.validUntil) },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl px-3 py-2"
                      style={{ background: "#181A22", border: "1px solid #1F2235" }}
                    >
                      <p className="text-xs text-[#8892A4] font-semibold">{label}</p>
                      <p className="text-sm font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revocation control */}
              {(currentStatus === "compliant" || currentStatus === "expiring") && !revoked && (
                <div className="rounded-2xl p-4 min-w-[220px]"
                  style={{ background: "rgba(234,57,67,0.08)", border: "1px solid rgba(234,57,67,0.25)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertOctagon className="w-4 h-4 text-[#EA3943]" />
                    <p className="text-xs font-bold text-[#EA3943] uppercase tracking-wide">Enforcement Action</p>
                  </div>
                  <p className="text-xs text-[#8892A4] mb-3">
                    Triggers cross-chain revocation via CCIP to all registered destination chains.
                  </p>
                  <button
                    onClick={handleRevoke} disabled={revoking}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={revoking
                      ? { background: "rgba(234,57,67,0.1)", color: "#EA394370", cursor: "wait" }
                      : { background: "#EA3943", color: "white", boxShadow: "0 0 16px rgba(234,57,67,0.4)" }
                    }
                    onMouseEnter={e => !revoking && ((e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(234,57,67,0.6)")}
                    onMouseLeave={e => !revoking && ((e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(234,57,67,0.4)")}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {revoking ? "Broadcasting via CCIP…" : "Revoke Cross-Chain"}
                  </button>
                </div>
              )}

              {(revoked || currentStatus === "revoked") && (
                <div className="rounded-2xl p-4 min-w-[220px]"
                  style={{ background: "#13151A", border: "1px solid rgba(245,172,55,0.25)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-[#F5AC37]" />
                    <p className="text-xs font-bold text-[#F5AC37] uppercase tracking-wide">Revocation Active</p>
                  </div>
                  <p className="text-xs text-[#8892A4]">Revoked on Sepolia · CCIP broadcast to all chains</p>
                  {revokeTx && (
                    <a
                      href={`${ADDRESSES.sepolia.explorer}/tx/${revokeTx}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#4A5568] mt-1 mono block hover:text-[#8892A4] transition-colors"
                    >
                      {revokeTx.slice(0, 18)}…
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#13151A", border: "1px solid #1F2235" }}>
            {(["checks", "history", "transfers"] as const).map(s => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={activeSection === s
                  ? { background: "#1F2235", color: "#FFFFFF" }
                  : { color: "#8892A4" }
                }
              >
                {s === "checks"    && "Compliance Checks"}
                {s === "history"   && "Attestation History"}
                {s === "transfers" && "Transfer Log"}
              </button>
            ))}
          </div>

          {/* Compliance Checks */}
          {activeSection === "checks" && (() => {
            const checks = getChecks(subject);
            return (
              <div className="rounded-2xl p-5 fade-in" style={surface}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-[#8892A4]" />
                  <span className="font-semibold text-white text-sm">Full Compliance Check Results</span>
                  <span className="text-xs text-[#4A5568] ml-auto">CRE Confidential HTTP · Chainlink DON</span>
                </div>
                <CheckRow label="Sanctions Screen (OFAC / UN / EU)"  passed={checks.sanctions.passed}    detail={checks.sanctions.detail} />
                <CheckRow label="KYC / AML Verification"             passed={checks.kyc.passed}           detail={checks.kyc.detail} />
                <CheckRow label="Accredited Investor Status"         passed={checks.accredited.passed}    detail={checks.accredited.detail} />
                <CheckRow label="Jurisdiction Eligibility"           passed={checks.jurisdiction.passed}  detail={checks.jurisdiction.detail} />
                <div className="mt-4 rounded-xl p-3 flex items-start gap-2"
                  style={{ background: "#181A22", border: "1px solid #1F2235" }}
                >
                  <Shield className="w-4 h-4 text-[#4A5568] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#4A5568]">
                    Results fetched via Chainlink CRE Confidential HTTP from compliance oracle.
                    Raw API responses never leave the secure enclave — only pass/fail verdicts are recorded on-chain.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Attestation History */}
          {activeSection === "history" && (() => {
            const history = getHistory(subject);
            return (
              <div className="rounded-2xl p-5 fade-in" style={surface}>
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-[#8892A4]" />
                  <span className="font-semibold text-white text-sm">Attestation History</span>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ background: "#1F2235" }} />
                  <div className="space-y-4">
                    {history.map((h, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                          style={h.event.includes("REVOK")
                            ? { background: "rgba(234,57,67,0.15)", border: "1px solid rgba(234,57,67,0.3)" }
                            : h.event.includes("bridged") || h.event.includes("broadcast")
                            ? { background: "rgba(123,92,248,0.15)", border: "1px solid rgba(123,92,248,0.3)" }
                            : { background: "rgba(22,199,132,0.15)", border: "1px solid rgba(22,199,132,0.3)" }
                          }
                        >
                          {h.event.includes("REVOK") ? <AlertTriangle className="w-3.5 h-3.5 text-[#EA3943]" />
                           : h.event.includes("bridged") || h.event.includes("broadcast") ? <Globe className="w-3.5 h-3.5 text-[#7B5CF8]" />
                           : <CheckCircle className="w-3.5 h-3.5 text-[#16C784]" />}
                        </div>
                        <div className="flex-1 rounded-xl px-4 py-3" style={{ background: "#181A22", border: "1px solid #1F2235" }}>
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-semibold ${h.event.includes("REVOK") ? "text-[#EA3943]" : "text-white"}`}>
                              {h.event}
                            </p>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                              style={h.chain.includes("Arb")
                                ? { background: "rgba(123,92,248,0.12)", border: "1px solid rgba(123,92,248,0.25)", color: "#7B5CF8" }
                                : { background: "rgba(55,91,210,0.12)", border: "1px solid rgba(55,91,210,0.25)", color: "#375BD2" }
                              }
                            >{h.chain}</span>
                          </div>
                          <p className="text-xs text-[#8892A4] mt-1">{h.detail}</p>
                          <p className="text-xs text-[#4A5568] mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formatDate(h.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Transfer Log */}
          {activeSection === "transfers" && (() => {
            const mockKey = Object.keys(MOCK_REGULATOR_DATA).find(k => k.toLowerCase() === subject.address.toLowerCase());
            const mockTransfers = mockKey ? MOCK_REGULATOR_DATA[mockKey].transfers : [];

            if (subject.transfers.length > 0) {
              return (
                <div className="rounded-2xl overflow-hidden fade-in" style={surface}>
                  <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1F2235" }}>
                    <Activity className="w-4 h-4 text-[#8892A4]" />
                    <span className="font-semibold text-white text-sm">Full Transfer Log</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full ml-2"
                      style={{ background: "rgba(22,199,132,0.1)", border: "1px solid rgba(22,199,132,0.25)", color: "#16C784" }}
                    >Live · Sepolia</span>
                    <span className="text-xs text-[#4A5568] ml-auto">Amounts visible to regulator only</span>
                  </div>
                  <table>
                    <thead>
                      <tr><th>Block</th><th>From</th><th>To</th><th>Amount (CBT)</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {subject.transfers.map((tx, i) => (
                        <tr key={i}>
                          <td><span className="mono text-[#8892A4]">{tx.blockNumber.toString()}</span></td>
                          <td><span className="mono text-[#C8D0DC]">{shortAddr(tx.from, 8, 6)}</span></td>
                          <td><span className="mono text-[#8892A4]">{shortAddr(tx.to, 8, 6)}</span></td>
                          <td>
                            <span className="font-semibold text-white">{formatCBT(tx.amount)}</span>
                            <span className="text-xs text-[#4A5568] ml-1">CBT</span>
                          </td>
                          <td className="text-xs text-[#4A5568]">
                            {new Date(Number(tx.timestamp) * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            return (
              <div className="rounded-2xl overflow-hidden fade-in" style={surface}>
                <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #1F2235" }}>
                  <Activity className="w-4 h-4 text-[#8892A4]" />
                  <span className="font-semibold text-white text-sm">Full Transfer Log</span>
                  <span className="text-xs text-[#4A5568] ml-auto">Amounts visible to regulator only</span>
                </div>
                {mockTransfers.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[#4A5568] text-sm">No transfer records found</div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>TX Hash</th><th>From</th><th>To</th><th>Amount (CBT)</th><th>Time</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {mockTransfers.map((tx, i) => (
                        <tr key={i}>
                          <td><span className="mono text-[#375BD2]">{tx.hash}</span></td>
                          <td><span className="font-medium text-white">{tx.from}</span></td>
                          <td><span className="text-[#8892A4]">{tx.to}</span></td>
                          <td>
                            <span className="font-semibold text-white">{tx.amount}</span>
                            <span className="text-xs text-[#4A5568] ml-1">CBT</span>
                          </td>
                          <td className="text-xs text-[#4A5568]">{formatDate(tx.timestamp)}</td>
                          <td>
                            {tx.compliant
                              ? <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: "rgba(22,199,132,0.12)", border: "1px solid rgba(22,199,132,0.3)", color: "#16C784" }}
                                >✓ Allowed</span>
                              : <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: "rgba(234,57,67,0.12)", border: "1px solid rgba(234,57,67,0.3)", color: "#EA3943" }}
                                >✗ Blocked</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {!subject && !loading && (
        <div className="rounded-2xl p-12 text-center" style={surface}>
          <Search className="w-12 h-12 text-[#1F2235] mx-auto mb-4" />
          <p className="text-[#8892A4] font-medium">Select a subject above to view full compliance details</p>
          <p className="text-xs text-[#4A5568] mt-1">All data is visible to authorized regulators — unlike the public view</p>
        </div>
      )}
    </div>
  );
}
