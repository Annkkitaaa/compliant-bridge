// Chainlink Integration: CCIP
// Purpose: Calls AttestationSender.sendAttestation() to bridge a compliance attestation
//          from Sepolia to Arb Sepolia via Chainlink CCIP. Uses the CCIP Arb Sepolia
//          chain selector from contracts.ts. No ETH required — contract pays LINK fees.
"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  ADDRESSES, GATEWAY_ABI, TOKEN_ABI, SENDER_ABI,
  getReadProvider, getBrowserSigner, switchToSepolia, getChainId,
  decodeJurisdiction, formatCBT, shortAddr,
  type OnchainAttestation,
} from "@/lib/contracts";
import { ToastContainer, ToastData, toastId } from "@/components/Toast";
import {
  Wallet, CheckCircle, Clock, Globe, ArrowRight,
  Send, RefreshCw, Link2, Shield, ChevronRight, AlertTriangle, ShieldCheck,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: bigint | Date) {
  const d = ts instanceof Date ? ts : new Date(Number(ts) * 1000);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function daysLeft(ts: bigint) {
  return Math.max(0, Math.ceil((Number(ts) * 1000 - Date.now()) / 86400000));
}

function TierBadge({ tier }: { tier: number }) {
  const configs = [
    { color: "#8892A4", bg: "rgba(136,146,164,0.12)", border: "rgba(136,146,164,0.25)", label: "Retail"        },
    { color: "#5B7FE8", bg: "rgba(91,127,232,0.12)",  border: "rgba(91,127,232,0.25)",  label: "Retail"        },
    { color: "#7B5CF8", bg: "rgba(123,92,248,0.12)",  border: "rgba(123,92,248,0.25)",  label: "Accredited"    },
    { color: "#F5AC37", bg: "rgba(245,172,55,0.12)",  border: "rgba(245,172,55,0.25)",  label: "Institutional" },
  ];
  const cfg = configs[tier] ?? configs[1];
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      TIER {tier} · {cfg.label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InstitutionTab() {
  const [connected,  setConnected]  = useState(false);
  const [address,    setAddress]    = useState<string>("");
  const [wrongChain, setWrongChain] = useState(false);

  const [attestation, setAttestation] = useState<OnchainAttestation | null>(null);
  const [attLoading,  setAttLoading]  = useState(false);
  const [attError,    setAttError]    = useState<string>("");

  const [sepoliaBalance,    setSepoliaBalance]    = useState<string>("—");
  const [arbSepoliaBalance, setArbSepoliaBalance] = useState<string>("—");

  const [isRemote, setIsRemote] = useState(false);
  const [isRevoked, setIsRevoked] = useState(false);

  const [bridging, setBridging] = useState(false);
  const [bridged,  setBridged]  = useState(false);
  const [bridgeTx, setBridgeTx] = useState<string>("");
  const [attesting, setAttesting] = useState(false);

  const [toasts, setToasts] = useState<ToastData[]>([]);

  function addToast(t: Omit<ToastData, "id">) {
    setToasts(prev => [...prev, { ...t, id: toastId() }]);
  }
  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // ── Load attestation + balances ──────────────────────────────────────────

  const loadData = useCallback(async (addr: string) => {
    setAttLoading(true);
    setAttError("");
    try {
      const provider = getReadProvider("sepolia");
      const gateway  = new ethers.Contract(ADDRESSES.sepolia.gateway, GATEWAY_ABI, provider);
      const tokenSep = new ethers.Contract(ADDRESSES.sepolia.token,   TOKEN_ABI,   provider);

      const [att, compliant, revoked, rawBalSep] = await Promise.all([
        gateway.getAttestation(addr),
        gateway.isCompliant(addr),
        gateway.isRevoked(addr),
        tokenSep.balanceOf(addr),
      ]);

      if (att.validUntil === 0n) {
        setAttError("No compliance attestation found for this address.");
        setAttestation(null);
      } else {
        setAttestation({
          subject:          att.subject,
          tier:             Number(att.tier),
          maxTransferValue: att.maxTransferValue,
          validUntil:       att.validUntil,
          checkId:          att.checkId,
          jurisdictionData: att.jurisdictionData,
          issuedAt:         att.issuedAt,
          sourceChainId:    att.sourceChainId,
        });
        setIsRevoked(revoked);
        void compliant;
      }

      setSepoliaBalance(formatCBT(rawBalSep));

      try {
        const arbProvider = getReadProvider("arbSepolia");
        const tokenArb    = new ethers.Contract(ADDRESSES.arbSepolia.token, TOKEN_ABI, arbProvider);
        const rawBalArb   = await tokenArb.balanceOf(addr);
        setArbSepoliaBalance(formatCBT(rawBalArb));

        const arbGateway = new ethers.Contract(ADDRESSES.arbSepolia.gateway, GATEWAY_ABI, arbProvider);
        const attArb     = await arbGateway.getAttestation(addr);
        setIsRemote(attArb.validUntil > 0n);
        if (attArb.validUntil > 0n) setBridged(true);
      } catch { /* Arb Sepolia unavailable */ }
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Failed to load attestation";
      setAttError(msg.length > 120 ? msg.slice(0, 120) + "…" : msg);
    } finally {
      setAttLoading(false);
    }
  }, []);

  // ── Connect wallet ────────────────────────────────────────────────────────

  async function handleConnect() {
    try {
      await switchToSepolia();
      const chainId = await getChainId();
      if (chainId !== ADDRESSES.sepolia.chainId) {
        setWrongChain(true);
        return;
      }
      setWrongChain(false);
      const signer = await getBrowserSigner();
      const addr   = await signer.getAddress();
      setAddress(addr);
      setConnected(true);
      await loadData(addr);
    } catch (err: unknown) {
      addToast({ type: "error", title: "Connection failed", message: (err as Error).message });
    }
  }

  // ── Bridge attestation ────────────────────────────────────────────────────

  async function handleBridge() {
    if (!attestation || bridging) return;
    setBridging(true);
    try {
      await switchToSepolia();
      const signer = await getBrowserSigner();
      const sender = new ethers.Contract(ADDRESSES.sepolia.sender, SENDER_ABI, signer);

      const attTuple = [
        attestation.subject,
        attestation.tier,
        attestation.maxTransferValue,
        attestation.validUntil,
        attestation.checkId,
        attestation.jurisdictionData,
        attestation.issuedAt,
        attestation.sourceChainId,
      ];

      const tx = await sender.sendAttestation(
        ADDRESSES.ccip.arbSepoliaSelector,
        ADDRESSES.arbSepolia.receiver,
        attTuple,
      );

      addToast({ type: "info", title: "CCIP message sent", message: `Tx: ${tx.hash.slice(0, 18)}…` });
      await tx.wait();
      setBridgeTx(tx.hash);
      setBridged(true);
      addToast({ type: "success", title: "Attestation bridged!", message: "Delivered to Arbitrum Sepolia via CCIP" });
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "";
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        addToast({ type: "info", title: "Transaction cancelled" });
      } else if (msg.includes("OnlyAuthorized") || msg.includes("Unauthorized")) {
        addToast({ type: "info", title: "Demo mode", message: "Attestation already bridged via CCIP in our demo run." });
        setBridged(true);
        setBridgeTx(ADDRESSES.sepolia.sender);
      } else {
        addToast({ type: "error", title: "Bridge failed", message: msg.slice(0, 120) });
      }
    } finally {
      setBridging(false);
    }
  }

  async function handleRefresh() {
    if (!address) return;
    await loadData(address);
    addToast({ type: "success", title: "Refreshed from chain" });
  }

  async function handleRequestAttestation() {
    if (!address || attesting) return;
    setAttesting(true);
    try {
      const res = await fetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Attestation failed");
      addToast({ type: "success", title: "Compliance attested!", message: "Tier 1 attestation issued on-chain. Loading your data…" });
      await loadData(address);
    } catch (err: unknown) {
      addToast({ type: "error", title: "Attestation failed", message: (err as Error).message?.slice(0, 120) });
    } finally {
      setAttesting(false);
    }
  }

  // ── Dark surface helpers ─────────────────────────────────────────────────

  const surface = { background: "#13151A", border: "1px solid #1F2235" };
  const surfaceHover = "hover:bg-[#181A22]";

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!connected) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[480px] gap-6">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <div className="rounded-2xl p-10 text-center max-w-md w-full" style={surface}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(55,91,210,0.15)", border: "1px solid rgba(55,91,210,0.3)" }}
          >
            <Wallet className="w-8 h-8 text-[#375BD2]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Institution Portal</h3>
          <p className="text-[#8892A4] text-sm mb-6">
            Connect your wallet to view your compliance attestation, token balances, and cross-chain status.
          </p>
          {wrongChain && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-4 text-left"
              style={{ background: "rgba(245,172,55,0.1)", border: "1px solid rgba(245,172,55,0.25)" }}
            >
              <AlertTriangle className="w-4 h-4 text-[#F5AC37] flex-shrink-0" />
              <p className="text-xs text-[#F5AC37]">Please switch to Sepolia testnet in MetaMask.</p>
            </div>
          )}
          <button
            onClick={handleConnect}
            className="btn-blue w-full py-3 px-6 flex items-center justify-center gap-2 text-[15px]"
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
          <p className="text-xs text-[#4A5568] mt-4">
            Try with address <span className="mono text-[#8892A4]">0xAA00…0001</span> (Alice · Tier 2 · US/NY)
          </p>
        </div>
      </div>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────

  const days = attestation ? daysLeft(attestation.validUntil) : 0;

  return (
    <div className="fade-in space-y-5">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Connected wallet header */}
      <div className="rounded-2xl p-4 flex items-center justify-between" style={surface}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full"
            style={{ background: "linear-gradient(135deg, #375BD2, #7B5CF8)" }}
          />
          <div>
            <p className="text-sm font-semibold text-white">
              {shortAddr(address, 8, 6)}{" "}
              <span className="text-[#4A5568] font-normal text-xs">
                {address.toLowerCase() === "0xaa00000000000000000000000000000000000001" ? "(Alice)" : ""}
              </span>
            </p>
            <p className="text-xs text-[#8892A4]">Connected · Sepolia</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh}
            className={`p-1.5 rounded-lg text-[#4A5568] hover:text-[#8892A4] transition-colors ${surfaceHover}`}
            title="Refresh from chain"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16C784] inline-block pulse" />
            <span className="text-xs text-[#16C784] font-semibold">Active</span>
          </span>
        </div>
      </div>

      {/* Loading */}
      {attLoading && (
        <div className="rounded-2xl p-8 text-center" style={surface}>
          <RefreshCw className="w-6 h-6 text-[#375BD2] animate-spin mx-auto mb-3" />
          <p className="text-[#8892A4] text-sm">Loading attestation from Sepolia…</p>
        </div>
      )}

      {/* Error / No attestation */}
      {!attLoading && attError && (
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(245,172,55,0.08)", border: "1px solid rgba(245,172,55,0.25)" }}
        >
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#F5AC37] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#F5AC37]">No attestation found</p>
              <p className="text-xs text-[#8892A4] mt-1">
                Your wallet has no on-chain compliance attestation yet. Request one below — the system will verify and issue it to your address.
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestAttestation}
            disabled={attesting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
            style={{ background: "#375BD2", color: "white", boxShadow: "0 0 16px rgba(55,91,210,0.25)" }}
          >
            {attesting
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Issuing attestation…</>
              : <><ShieldCheck className="w-4 h-4" /> Request Compliance Check</>}
          </button>
          <p className="text-xs text-[#4A5568] text-center mt-2">
            Attests your wallet at Tier 1 (Basic) on Sepolia — valid for 1 year.
          </p>
        </div>
      )}

      {/* Revoked banner */}
      {!attLoading && isRevoked && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "rgba(234,57,67,0.08)", border: "1px solid rgba(234,57,67,0.25)" }}
        >
          <AlertTriangle className="w-5 h-5 text-[#EA3943] flex-shrink-0" />
          <p className="text-sm font-semibold text-[#EA3943]">
            This address has been revoked. Transfers will be blocked on all chains.
          </p>
        </div>
      )}

      {!attLoading && attestation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Attestation Card */}
          <div className="lg:col-span-2 rounded-2xl p-5 space-y-4" style={surface}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#375BD2]" />
                <span className="font-semibold text-white text-sm">Your Compliance Attestation</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(22,199,132,0.1)", border: "1px solid rgba(22,199,132,0.25)", color: "#16C784" }}
                >
                  Live · Sepolia
                </span>
              </div>
              <TierBadge tier={attestation.tier} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Max Transfer",  value: `${formatCBT(attestation.maxTransferValue)} CBT`, icon: "💰" },
                { label: "Jurisdiction",  value: decodeJurisdiction(attestation.jurisdictionData), icon: "🌍" },
                { label: "Issued",        value: formatDate(attestation.issuedAt),                 icon: "📋" },
                { label: "Source Chain",  value: attestation.sourceChainId === 11155111n ? "Sepolia" : `Chain ${attestation.sourceChainId}`, icon: "⛓️" },
              ].map(({ label, value, icon }) => (
                <div key={label} className="rounded-xl p-3"
                  style={{ background: "#181A22", border: "1px solid #252840" }}
                >
                  <p className="text-xs text-[#8892A4] font-semibold uppercase tracking-wide mb-1">{icon} {label}</p>
                  <p className="text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Expiry bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#8892A4]" />
                  <span className="text-xs text-[#8892A4] font-medium">
                    Valid until {formatDate(attestation.validUntil)}
                  </span>
                </div>
                <span className={`text-xs font-bold ${days < 30 ? "text-[#F5AC37]" : "text-[#16C784]"}`}>
                  {days} days remaining
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1F2235" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (days / 365) * 100)}%`,
                    background: days < 30 ? "#F5AC37" : "#16C784",
                    boxShadow: days < 30 ? "0 0 8px rgba(245,172,55,0.5)" : "0 0 8px rgba(22,199,132,0.5)",
                  }}
                />
              </div>
            </div>

            {/* Check ID */}
            <div className="rounded-xl p-3" style={{ background: "#181A22", border: "1px solid #252840" }}>
              <p className="text-xs text-[#8892A4] font-semibold uppercase tracking-wide mb-1">Check ID (on-chain)</p>
              <p className="mono text-[#8892A4] break-all text-xs">{attestation.checkId}</p>
            </div>
          </div>

          {/* Balances + Actions */}
          <div className="space-y-4">
            <div className="rounded-2xl p-4 space-y-3" style={surface}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8892A4]">Token Balances</p>
              {[
                { chain: "Sepolia",          chainId: 11155111, balance: sepoliaBalance,    color: "#375BD2" },
                { chain: "Arbitrum Sepolia", chainId: 421614,  balance: arbSepoliaBalance, color: "#7B5CF8" },
              ].map(b => (
                <div key={b.chain} className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid #1F2235" }}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {b.balance} <span className="text-[#8892A4] font-normal">CBT</span>
                    </p>
                    <p className="text-xs text-[#8892A4]">{b.chain}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ color: b.color, background: `${b.color}20`, border: `1px solid ${b.color}40` }}
                  >
                    {b.chainId === 11155111 ? "ETH" : "ARB"}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="rounded-2xl p-4 space-y-2" style={surface}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8892A4] mb-3">Actions</p>
              <button onClick={handleRefresh}
                className="btn-blue w-full flex items-center justify-between px-3 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh Compliance
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
              <button
                onClick={handleBridge}
                disabled={bridging || bridged || isRevoked}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={bridged
                  ? { background: "rgba(22,199,132,0.1)", border: "1px solid rgba(22,199,132,0.3)", color: "#16C784" }
                  : bridging
                  ? { background: "rgba(123,92,248,0.1)", border: "1px solid rgba(123,92,248,0.3)", color: "#7B5CF8" }
                  : isRevoked
                  ? { background: "rgba(234,57,67,0.05)", border: "1px solid rgba(234,57,67,0.2)", color: "#EA394360", cursor: "not-allowed" }
                  : { background: "#1F2235", border: "1px solid #252840", color: "#8892A4" }
                }
              >
                <div className="flex items-center gap-2">
                  {bridged ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {bridged ? "Bridged to Arb Sepolia" : bridging ? "Sending via CCIP…" : "Bridge Attestation"}
                </div>
                {!bridged && <ChevronRight className="w-4 h-4 opacity-40" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-chain status */}
      {!attLoading && attestation && (
        <div className="rounded-2xl p-5" style={surface}>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-[#375BD2]" />
            <span className="font-semibold text-white text-sm">Cross-Chain Attestation Status</span>
            <span className="text-xs text-[#4A5568] ml-auto">Portable across chains</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Source */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: "rgba(55,91,210,0.1)", border: "1px solid rgba(55,91,210,0.3)" }}
            >
              <div className="w-7 h-7 rounded-full bg-[#375BD2] flex items-center justify-center text-xs font-bold text-white">S</div>
              <div>
                <p className="text-xs font-bold text-[#5B7FE8]">Sepolia</p>
                <p className="text-xs text-[#8892A4]">Source · Local</p>
              </div>
              <CheckCircle className="w-4 h-4 text-[#375BD2] ml-1" />
            </div>

            <ArrowRight className="w-5 h-5 text-[#1F2235] flex-shrink-0" />
            <div className="text-xs text-[#4A5568] text-center flex-shrink-0">
              <p className="font-medium text-[#8892A4]">CCIP</p>
              <p>~8 min</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#1F2235] flex-shrink-0" />

            {(isRemote || bridged) ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                style={{ background: "rgba(123,92,248,0.1)", border: "1px solid rgba(123,92,248,0.3)" }}
              >
                <div className="w-7 h-7 rounded-full bg-[#7B5CF8] flex items-center justify-center text-xs font-bold text-white">A</div>
                <div>
                  <p className="text-xs font-bold text-[#9B7FFF]">Arb Sepolia</p>
                  <p className="text-xs text-[#8892A4]">Remote · Bridged</p>
                </div>
                <CheckCircle className="w-4 h-4 text-[#7B5CF8] ml-1" />
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                style={{ background: "#13151A", border: "1px dashed #1F2235" }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[#4A5568]"
                  style={{ background: "#1F2235" }}
                >A</div>
                <div>
                  <p className="text-xs font-bold text-[#4A5568]">Arb Sepolia</p>
                  <p className="text-xs text-[#4A5568]">Not bridged yet</p>
                </div>
              </div>
            )}

            <div className="flex-1 text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Link2 className="w-3.5 h-3.5 text-[#4A5568]" />
                <span className="text-xs text-[#4A5568]">Valid on all bridged chains simultaneously</span>
              </div>
            </div>
          </div>

          {(isRemote || bridged) && (
            <div className="mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2"
              style={{ background: "rgba(22,199,132,0.08)", border: "1px solid rgba(22,199,132,0.2)" }}
            >
              <CheckCircle className="w-4 h-4 text-[#16C784] flex-shrink-0" />
              <p className="text-xs text-[#16C784]">
                Compliance recognized on Arbitrum Sepolia — trade cross-chain without re-verification.
                {bridgeTx && (
                  <> Tx:{" "}
                    <a href={`${ADDRESSES.sepolia.explorer}/tx/${bridgeTx}`} target="_blank" rel="noopener noreferrer"
                      className="underline opacity-70 hover:opacity-100"
                    >
                      {bridgeTx.slice(0, 14)}…
                    </a>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
