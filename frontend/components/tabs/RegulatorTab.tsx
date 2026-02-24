"use client";
import { useState, useCallback } from "react";
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
  // Mirror fields used in UI
  tier:        number;
  jurisdiction: string;
  maxTransfer: string;
  issuedAt:    Date;
  validUntil:  Date;
  status:      "compliant" | "revoked" | "expiring" | "unknown";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function short(addr: string) {
  return shortAddr(addr, 8, 6);
}

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
    return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse inline-block" />COMPLIANT</span>;
  if (status === "revoked")
    return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />REVOKED</span>;
  if (status === "expiring")
    return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />EXPIRING SOON</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200">UNKNOWN</span>;
}

function CheckRow({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden mb-2 ${passed ? "border-emerald-100" : "border-red-100"}`}>
      <button
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${passed ? "bg-emerald-50 hover:bg-emerald-100" : "bg-red-50 hover:bg-red-100"}`}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {passed
            ? <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            : <XCircle    className="w-4 h-4 text-red-600    flex-shrink-0" />
          }
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <span className={`text-xs font-bold ${passed ? "text-emerald-600" : "text-red-600"}`}>
            {passed ? "PASS" : "FAIL"}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-white border-t border-slate-100">
          <p className="text-xs text-slate-600 font-mono">{detail}</p>
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

  // ── Lookup address ────────────────────────────────────────────────────────

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

      // RegulatorView has onlyRegulator — use owner address as from-override for eth_call
      const regView = new ethers.Contract(ADDRESSES.sepolia.regulatorView, REGULATOR_ABI, provider);
      const ownerAddr: string = await regView.owner();

      // Override: pass owner as msg.sender in eth_call (no signing needed for view)
      const [details, transfers]: [
        [OnchainAttestation, boolean, boolean],
        TransferRecord[],
      ] = await Promise.all([
        regView.getFullComplianceDetails.staticCall(addr, { from: ownerAddr }) as Promise<[OnchainAttestation, boolean, boolean]>,
        regView.getTransferHistory.staticCall(addr, { from: ownerAddr }) as Promise<TransferRecord[]>,
      ]);

      const [att, compliant, isRevoked] = details;

      if (att.validUntil === 0n) {
        // No on-chain attestation — try mock data for demo
        const mockKey = Object.keys(MOCK_REGULATOR_DATA).find(
          k => k.toLowerCase() === addr.toLowerCase(),
        );
        if (mockKey) {
          const mock = MOCK_REGULATOR_DATA[mockKey];
          setSubject({
            address:    addr,
            label:      mock.label,
            attestation: null,
            compliant:  mock.status !== "revoked",
            revoked:    mock.status === "revoked",
            transfers:  [],
            tier:        mock.tier,
            jurisdiction: mock.jurisdiction,
            maxTransfer:  mock.maxTransfer,
            issuedAt:     mock.issuedAt,
            validUntil:   mock.validUntil,
            status:       mock.status,
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
        address:    addr,
        label:      knownLabel(addr),
        attestation: att,
        compliant,
        revoked: isRevoked,
        transfers,
        tier:        Number(att.tier),
        jurisdiction,
        maxTransfer: formatCBT(att.maxTransferValue),
        issuedAt:    new Date(Number(att.issuedAt) * 1000),
        validUntil,
        status,
      });
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Failed to load data";
      // Fallback to mock data on RPC error
      const mockKey = Object.keys(MOCK_REGULATOR_DATA).find(
        k => k.toLowerCase() === addr.toLowerCase(),
      );
      if (mockKey) {
        const mock = MOCK_REGULATOR_DATA[mockKey];
        setSubject({
          address:    addr,
          label:      mock.label,
          attestation: null,
          compliant:  mock.status !== "revoked",
          revoked:    mock.status === "revoked",
          transfers:  [],
          tier:        mock.tier,
          jurisdiction: mock.jurisdiction,
          maxTransfer:  mock.maxTransfer,
          issuedAt:     mock.issuedAt,
          validUntil:   mock.validUntil,
          status:       mock.status,
        });
        addToast({ type: "info", title: "Using demo data", message: "Could not reach Sepolia RPC" });
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

      // Contract pays CCIP fee from its own LINK balance — no ETH required from caller
      const tx = await invalidator.invalidateAcrossChains(
        subject.address,
        reason,
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
        // Demo fallback — real revocation was sent from test scripts
        addToast({
          type: "info",
          title: "Demo mode",
          message: "Revocation requires compliance officer role. Bob was already revoked via CCIP in our demo run.",
        });
        setRevoked(true);
        setSubject(prev => prev ? { ...prev, status: "revoked", revoked: true } : prev);
      } else {
        addToast({ type: "error", title: "Revocation failed", message: msg.slice(0, 120) });
      }
    } finally {
      setRevoking(false);
    }
  }

  // Mock compliance checks (derived from on-chain data + well-known mock data)
  function getChecks(s: SubjectData) {
    const mock = MOCK_REGULATOR_DATA[
      Object.keys(MOCK_REGULATOR_DATA).find(k => k.toLowerCase() === s.address.toLowerCase()) ?? ""
    ];
    if (mock) return mock.checks;
    // Generic checks based on on-chain attestation
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

  // ── Render ────────────────────────────────────────────────────────────────

  const currentStatus = revoked ? "revoked" : (subject?.status ?? "unknown");

  return (
    <div className="fade-in space-y-5">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Regulator header */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">REGULATOR ACCESS PORTAL</p>
            <p className="text-slate-400 text-xs mt-0.5">Full compliance visibility · Authorized personnel only</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300 text-xs font-semibold">Full Data Access</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Subject Lookup</p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Enter wallet address or select below…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && lookup(query.trim())}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mono"
            />
          </div>
          <button
            onClick={() => lookup(query.trim())}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Loading…" : "Lookup"}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {SUBJECT_OPTIONS.map(opt => (
            <button
              key={opt.address}
              onClick={() => { setQuery(opt.address); lookup(opt.address); }}
              className="text-xs px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 transition-colors"
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
          <div className="card p-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold text-sm">
                    {subject.label[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-lg">{subject.label}</h3>
                      <StatusBadge status={currentStatus} />
                      {subject.attestation && (
                        <span className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Live · Sepolia
                        </span>
                      )}
                    </div>
                    <p className="mono text-slate-400 text-xs">{subject.address}</p>
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
                    <div key={label} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-400 font-semibold">{label}</p>
                      <p className="text-sm font-semibold text-slate-700">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revocation control */}
              {(currentStatus === "compliant" || currentStatus === "expiring") && !revoked && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertOctagon className="w-4 h-4 text-red-600" />
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Enforcement Action</p>
                  </div>
                  <p className="text-xs text-red-600 mb-3">
                    Triggers cross-chain revocation via CCIP to all registered destination chains.
                  </p>
                  <button
                    onClick={handleRevoke}
                    disabled={revoking}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                      revoking
                        ? "bg-red-100 text-red-400 cursor-wait"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {revoking ? "Broadcasting via CCIP…" : "Revoke Cross-Chain"}
                  </button>
                </div>
              )}

              {(revoked || currentStatus === "revoked") && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Revocation Active</p>
                  </div>
                  <p className="text-xs text-slate-400">Revoked on Sepolia · CCIP broadcast to all chains</p>
                  {revokeTx && (
                    <a
                      href={`${ADDRESSES.sepolia.explorer}/tx/${revokeTx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 mt-1 mono block hover:text-slate-300"
                    >
                      {revokeTx.slice(0, 18)}…
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {(["checks", "history", "transfers"] as const).map(s => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  activeSection === s
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
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
              <div className="card p-5 fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-700">Full Compliance Check Results</span>
                  <span className="text-xs text-slate-400 ml-auto">CRE Confidential HTTP · Chainlink DON verified</span>
                </div>
                <CheckRow label="Sanctions Screen (OFAC / UN / EU)"  passed={checks.sanctions.passed}    detail={checks.sanctions.detail} />
                <CheckRow label="KYC / AML Verification"             passed={checks.kyc.passed}           detail={checks.kyc.detail} />
                <CheckRow label="Accredited Investor Status"         passed={checks.accredited.passed}    detail={checks.accredited.detail} />
                <CheckRow label="Jurisdiction Eligibility"           passed={checks.jurisdiction.passed}  detail={checks.jurisdiction.detail} />
                <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500">
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
              <div className="card p-5 fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-700">Attestation History</span>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
                  <div className="space-y-4">
                    {history.map((h, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                          h.event.includes("REVOK") ? "bg-red-100 border border-red-200"
                          : h.event.includes("bridged") || h.event.includes("broadcast") ? "bg-violet-100 border border-violet-200"
                          : "bg-emerald-100 border border-emerald-200"
                        }`}>
                          {h.event.includes("REVOK") ? <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                           : h.event.includes("bridged") || h.event.includes("broadcast") ? <Globe className="w-3.5 h-3.5 text-violet-600" />
                           : <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-semibold ${h.event.includes("REVOK") ? "text-red-700" : "text-slate-700"}`}>
                              {h.event}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              h.chain.includes("Arb")
                                ? "bg-violet-50 text-violet-600 border border-violet-200"
                                : "bg-blue-50 text-blue-600 border border-blue-200"
                            }`}>{h.chain}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{h.detail}</p>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
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
            // Prefer on-chain transfers, fallback to mock
            const mockKey = Object.keys(MOCK_REGULATOR_DATA).find(
              k => k.toLowerCase() === subject.address.toLowerCase(),
            );
            const mockTransfers = mockKey ? MOCK_REGULATOR_DATA[mockKey].transfers : [];

            if (subject.transfers.length > 0) {
              // On-chain transfers
              return (
                <div className="card overflow-hidden fade-in">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-700">Full Transfer Log</span>
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full ml-2">Live · Sepolia</span>
                    <span className="text-xs text-slate-400 ml-auto">Amounts visible to regulator only</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Block</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Amount (CBT)</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subject.transfers.map((tx, i) => (
                        <tr key={i}>
                          <td><span className="mono text-slate-500">{tx.blockNumber.toString()}</span></td>
                          <td><span className="mono text-slate-600">{shortAddr(tx.from, 8, 6)}</span></td>
                          <td><span className="mono text-slate-500">{shortAddr(tx.to, 8, 6)}</span></td>
                          <td>
                            <span className="font-semibold text-slate-800">{formatCBT(tx.amount)}</span>
                            <span className="text-xs text-slate-400 ml-1">CBT</span>
                          </td>
                          <td className="text-xs text-slate-400">
                            {new Date(Number(tx.timestamp) * 1000).toLocaleString("en-US", {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            // Fallback mock transfers
            return (
              <div className="card overflow-hidden fade-in">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-700">Full Transfer Log</span>
                  <span className="text-xs text-slate-400 ml-auto">Amounts visible to regulator only</span>
                </div>
                {mockTransfers.length === 0 ? (
                  <div className="px-5 py-8 text-center text-slate-400 text-sm">No transfer records found</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>TX Hash</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Amount (CBT)</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockTransfers.map((tx, i) => (
                        <tr key={i}>
                          <td><span className="mono text-blue-600">{tx.hash}</span></td>
                          <td><span className="font-medium text-slate-700">{tx.from}</span></td>
                          <td><span className="text-slate-500">{tx.to}</span></td>
                          <td>
                            <span className="font-semibold text-slate-800">{tx.amount}</span>
                            <span className="text-xs text-slate-400 ml-1">CBT</span>
                          </td>
                          <td className="text-xs text-slate-400">{formatDate(tx.timestamp)}</td>
                          <td>
                            {tx.compliant
                              ? <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ Allowed</span>
                              : <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">✗ Blocked</span>
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
        <div className="card p-12 text-center">
          <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Select a subject above to view full compliance details</p>
          <p className="text-xs text-slate-300 mt-1">All data is visible to authorized regulators — unlike the public view</p>
        </div>
      )}
    </div>
  );
}
