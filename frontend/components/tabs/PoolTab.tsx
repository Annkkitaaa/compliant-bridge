// Chainlink Integration: ComplianceGateway (isCompliantWithTier) gates every pool interaction
// Purpose: Compliance-gated AMM UI. Tier-1/2/3 wallets can swap IUSD⇄tTREAS in matching pools.
//          Non-compliant wallets are blocked at the contract level via onlyCompliant() modifier.
"use client";
import { useState, useEffect, useCallback } from "react";
import {
  POOL_ADDRESSES, TIER_CONFIG,
  getBrowserSigner, switchToSepolia, getChainId, shortAddr,
  type PoolTierKey,
} from "@/lib/contracts";
import {
  usePoolInfo, useUserCompliance, useTokenBalances,
  useSwap, useAddLiquidity, useRemoveLiquidity, useFaucet,
  usePoolEvents,
  type TxStatus,
} from "@/lib/useCompliancePool";
import { ToastContainer, ToastData, toastId } from "@/components/Toast";
import DemoAnnotation from "@/components/demo/DemoAnnotation";
import {
  Wallet, Waves, ArrowRightLeft, Plus, Minus,
  Lock, ChevronDown, RefreshCw, Droplets, Activity,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const POOLS = [
  { tier: 1, label: "Basic Pool",         sub: "Tier 1+",         poolKey: "tier1Pool" as PoolTierKey },
  { tier: 2, label: "Accredited Pool",    sub: "Tier 2+",         poolKey: "tier2Pool" as PoolTierKey },
  { tier: 3, label: "Institutional Pool", sub: "Tier 3 only",     poolKey: "tier3Pool" as PoolTierKey },
];

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function isDeployed(addr: string) { return addr !== ZERO_ADDR; }

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtIusd(raw: bigint)   { return (Number(raw) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
function fmtTreas(raw: bigint)  { return (Number(raw) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 4 }); }
function fmtLp(raw: bigint)     { return (Number(raw) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 6 }); }

function StatusDot({ status }: { status: TxStatus }) {
  if (status === "idle")     return null;
  if (status === "approving") return <span className="text-xs text-[#F5AC37]">Approving…</span>;
  if (status === "pending")   return <span className="text-xs text-[#375BD2]">Pending…</span>;
  if (status === "success")   return <span className="text-xs text-[#16C784]">Done ✓</span>;
  if (status === "error")     return <span className="text-xs text-[#EA3943]">Failed</span>;
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PoolTab() {
  const [wallet, setWallet]           = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [panelTab, setPanelTab]       = useState<"swap" | "liquidity">("swap");
  const [liqTab, setLiqTab]           = useState<"add" | "remove">("add");

  // Swap inputs
  const [swapDir, setSwapDir]         = useState<"AtoB" | "BtoA">("AtoB");
  const [swapAmtIn, setSwapAmtIn]     = useState("");

  // Liquidity inputs
  const [addAmtA, setAddAmtA]         = useState("");
  const [addAmtB, setAddAmtB]         = useState("");
  const [removeAmtLp, setRemoveAmtLp] = useState("");

  const [toasts, setToasts]           = useState<ToastData[]>([]);
  const addToast = useCallback((t: ToastData) => setToasts(p => [...p, t]), []);

  const addrs = POOL_ADDRESSES.sepolia;
  const poolAddr = selectedTier ? addrs[POOLS[selectedTier - 1].poolKey] : ZERO_ADDR;
  const contracted = isDeployed(addrs.tier1Pool);

  // Hooks
  const { info, refetch: refetchInfo }  = usePoolInfo(poolAddr);
  const compliance                      = useUserCompliance(wallet, addrs.gateway);
  const { balances, refetch: refetchBal } = useTokenBalances(wallet, poolAddr, addrs.iusd, addrs.tTreas);

  const { swap, status: swapStatus, error: swapErr, reset: resetSwap }    = useSwap(poolAddr, addrs.iusd, addrs.tTreas);
  const { addLiquidity, status: addStatus, error: addErr, reset: resetAdd } = useAddLiquidity(poolAddr, addrs.iusd, addrs.tTreas);
  const { removeLiquidity, status: remStatus, error: remErr, reset: resetRem } = useRemoveLiquidity(poolAddr);
  const { drip, status: faucetStatus, error: faucetErr }                   = useFaucet(addrs.iusd, addrs.tTreas);
  const events                          = usePoolEvents(poolAddr);

  // Connect wallet
  async function connectWallet() {
    try {
      await switchToSepolia();
      const signer = await getBrowserSigner();
      setWallet(await signer.getAddress());
    } catch (e: unknown) {
      addToast({ id: toastId(), type: "error", title: "Connect failed", message: e instanceof Error ? e.message : "Connect failed" });
    }
  }

  // Toast on tx outcome
  useEffect(() => {
    if (swapStatus === "success") { addToast({ id: toastId(), type: "success", title: "Swapped!", message: "Swap complete!" }); resetSwap(); refetchBal(); refetchInfo(); }
    if (swapStatus === "error" && swapErr) { addToast({ id: toastId(), type: "error", title: "Swap failed", message: swapErr }); }
  }, [swapStatus, swapErr]);

  useEffect(() => {
    if (addStatus === "success") { addToast({ id: toastId(), type: "success", title: "Liquidity added!", message: "Liquidity added successfully." }); resetAdd(); refetchBal(); refetchInfo(); setAddAmtA(""); setAddAmtB(""); }
    if (addStatus === "error" && addErr) { addToast({ id: toastId(), type: "error", title: "Add liquidity failed", message: addErr }); }
  }, [addStatus, addErr]);

  useEffect(() => {
    if (remStatus === "success") { addToast({ id: toastId(), type: "success", title: "Liquidity removed!", message: "Liquidity removed successfully." }); resetRem(); refetchBal(); refetchInfo(); setRemoveAmtLp(""); }
    if (remStatus === "error" && remErr) { addToast({ id: toastId(), type: "error", title: "Remove failed", message: remErr }); }
  }, [remStatus, remErr]);

  useEffect(() => {
    if (faucetStatus === "success") { addToast({ id: toastId(), type: "success", title: "Tokens received!", message: "Got 10K IUSD + 10K tTREAS!" }); refetchBal(); }
    if (faucetStatus === "error" && faucetErr) { addToast({ id: toastId(), type: "error", title: "Faucet failed", message: faucetErr ?? "Faucet failed" }); }
  }, [faucetStatus, faucetErr]);

  // Auto-calc addAmtB from ratio when addAmtA changes
  useEffect(() => {
    if (!info || !addAmtA || info.reserveA === 0n) return;
    const rawA = BigInt(Math.floor(parseFloat(addAmtA) * 1e6));
    const rawB = rawA * info.reserveB / info.reserveA;
    setAddAmtB((Number(rawB) / 1e18).toFixed(6));
  }, [addAmtA, info]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(p => p.filter(t => t.id !== id))} />
      <DemoAnnotation forTab="pool" />

      {/* Not yet deployed banner */}
      {!contracted && (
        <div className="rounded-xl p-4 text-sm text-[#F5AC37]"
          style={{ background: "rgba(245,172,55,0.08)", border: "1px solid rgba(245,172,55,0.2)" }}>
          Pool contracts deploying to Sepolia testnet — showing preview UI. Run{" "}
          <code className="font-mono text-xs">forge script script/DeployPool.s.sol --broadcast</code>{" "}
          and update <code className="font-mono text-xs">POOL_ADDRESSES</code> in{" "}
          <code className="font-mono text-xs">frontend/lib/contracts.ts</code>.
        </div>
      )}

      {/* 1. Compliance Banner */}
      <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        style={{ background: "#13151A", border: "1px solid #1F2235" }}>
        <div className="flex-1">
          {!wallet ? (
            <p className="text-[#8892A4] text-sm">Connect your wallet to see your compliance tier and access gated pools.</p>
          ) : compliance === null ? (
            <p className="text-[#8892A4] text-sm">Checking compliance for <span className="text-white font-mono">{shortAddr(wallet)}</span>…</p>
          ) : compliance.tier === 0 ? (
            <div>
              <p className="text-[#EA3943] font-semibold text-sm">No compliance attestation found</p>
              <p className="text-[#4A5568] text-xs mt-0.5">This wallet has no on-chain attestation from the Chainlink CRE workflow.</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ color: compliance.color, background: compliance.bgColor, border: `1px solid ${compliance.borderColor}` }}>
                TIER {compliance.tier} · {compliance.name}
              </span>
              <span className="text-[#8892A4] text-xs">{shortAddr(wallet)} · can access Tier {compliance.tier === 3 ? "1, 2 & 3" : compliance.tier === 2 ? "1 & 2" : "1"} pool{compliance.tier > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
        {!wallet ? (
          <button onClick={connectWallet}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{ background: "#375BD2", color: "white", boxShadow: "0 0 16px rgba(55,91,210,0.3)" }}>
            <Wallet className="w-4 h-4" /> Connect Wallet
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16C784] inline-block" />
            <span className="text-xs text-[#16C784]">Connected</span>
          </div>
        )}
      </div>

      {/* 2. Pool Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {POOLS.map(({ tier, label, sub }) => {
          const cfg = TIER_CONFIG[tier];
          const canAccess = !wallet || !compliance || compliance.canAccessPool(tier);
          const isSelected = selectedTier === tier;
          return (
            <button key={tier}
              onClick={() => canAccess ? setSelectedTier(isSelected ? null : tier) : undefined}
              className="rounded-xl p-4 text-left transition-all duration-200 relative"
              style={{
                background:  isSelected ? cfg.bgColor : "#13151A",
                border: `1px solid ${isSelected ? cfg.color : canAccess ? "#1F2235" : "#1F2235"}`,
                boxShadow: isSelected ? `0 0 20px ${cfg.bgColor}` : "none",
                opacity: canAccess ? 1 : 0.45,
                cursor: canAccess ? "pointer" : "not-allowed",
              }}>
              {!canAccess && <Lock className="absolute top-3 right-3 w-3.5 h-3.5 text-[#4A5568]" />}
              <div className="flex items-center gap-2 mb-2">
                <Waves className="w-4 h-4" style={{ color: cfg.color }} />
                <span className="text-white font-bold text-sm">{label}</span>
              </div>
              <div className="text-xs text-[#8892A4]">{sub}</div>
              {contracted && info && isSelected ? (
                <div className="mt-2 text-xs" style={{ color: cfg.color }}>
                  {fmtIusd(info.reserveA)} IUSD · {fmtTreas(info.reserveB)} tTREAS
                </div>
              ) : (
                <div className="mt-2 text-xs" style={{ color: cfg.color }}>
                  Max transfer: {cfg.maxTransfer}
                </div>
              )}
              {!canAccess && (
                <div className="mt-2 text-xs text-[#4A5568]">Need Tier {tier}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Swap / Liquidity Panel */}
      {selectedTier !== null && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1F2235" }}>
          {/* Panel tab bar */}
          <div className="flex border-b" style={{ borderColor: "#1F2235", background: "#13151A" }}>
            {(["swap", "liquidity"] as const).map(t => (
              <button key={t} onClick={() => setPanelTab(t)}
                className="px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all"
                style={panelTab === t
                  ? { color: TIER_CONFIG[selectedTier].color, borderBottom: `2px solid ${TIER_CONFIG[selectedTier].color}` }
                  : { color: "#4A5568" }}>
                {t === "swap" ? <><ArrowRightLeft className="w-3.5 h-3.5 inline mr-1.5" />Swap</> : <><Plus className="w-3.5 h-3.5 inline mr-1.5" />Liquidity</>}
              </button>
            ))}
            <div className="flex-1" />
            {/* Faucet button */}
            {contracted && (
              <button onClick={drip} disabled={faucetStatus === "pending"}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#4A5568] transition-all hover:text-[#8892A4] disabled:opacity-50">
                <Droplets className="w-3.5 h-3.5" /> Faucet
                {faucetStatus === "pending" && <RefreshCw className="w-3 h-3 animate-spin" />}
              </button>
            )}
          </div>

          <div className="p-5 space-y-4" style={{ background: "#0D0E12" }}>
            {/* Balances row */}
            {wallet && (
              <div className="flex flex-wrap gap-3 text-xs text-[#8892A4]">
                <span>IUSD: <span className="text-white">{fmtIusd(balances.iusd)}</span></span>
                <span>tTREAS: <span className="text-white">{fmtTreas(balances.tTreas)}</span></span>
                <span>LP: <span className="text-white">{fmtLp(balances.lp)}</span></span>
              </div>
            )}

            {/* ── SWAP ── */}
            {panelTab === "swap" && (
              <div className="space-y-3">
                <div className="rounded-lg p-3" style={{ background: "#13151A", border: "1px solid #1F2235" }}>
                  <div className="text-xs text-[#4A5568] mb-1">{swapDir === "AtoB" ? "You pay (IUSD)" : "You pay (tTREAS)"}</div>
                  <input type="number" min="0" placeholder="0.00" value={swapAmtIn}
                    onChange={e => setSwapAmtIn(e.target.value)}
                    className="w-full bg-transparent text-white text-lg font-bold outline-none placeholder-[#252840]" />
                </div>

                {/* Flip */}
                <div className="flex justify-center">
                  <button onClick={() => { setSwapDir(d => d === "AtoB" ? "BtoA" : "AtoB"); setSwapAmtIn(""); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{ background: "#13151A", border: "1px solid #1F2235" }}>
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#8892A4]" />
                  </button>
                </div>

                <div className="rounded-lg p-3" style={{ background: "#13151A", border: "1px solid #1F2235" }}>
                  <div className="text-xs text-[#4A5568] mb-1">{swapDir === "AtoB" ? "You receive (tTREAS)" : "You receive (IUSD)"}</div>
                  <div className="text-lg font-bold text-[#8892A4]">
                    {info && swapAmtIn && parseFloat(swapAmtIn) > 0
                      ? (() => {
                          const rawIn = swapDir === "AtoB"
                            ? BigInt(Math.floor(parseFloat(swapAmtIn) * 1e6))
                            : BigInt(Math.floor(parseFloat(swapAmtIn) * 1e18));
                          const [rIn, rOut] = swapDir === "AtoB" ? [info.reserveA, info.reserveB] : [info.reserveB, info.reserveA];
                          if (rIn === 0n) return "—";
                          const num = rawIn * 997n * rOut / (rIn * 1000n + rawIn * 997n);
                          return swapDir === "AtoB" ? fmtTreas(num) : fmtIusd(num);
                        })()
                      : "0.00"}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#4A5568]">
                  <span>Fee 0.3%</span>
                  {info && info.reserveA > 0n && (
                    <span>Rate: 1 IUSD ≈ {fmtTreas(info.reserveB * BigInt(1e6) / info.reserveA)} tTREAS</span>
                  )}
                </div>

                <button
                  disabled={!wallet || !swapAmtIn || parseFloat(swapAmtIn) <= 0 || swapStatus === "pending" || swapStatus === "approving" || !contracted}
                  onClick={async () => {
                    if (!swapAmtIn) return;
                    const rawIn = swapDir === "AtoB"
                      ? BigInt(Math.floor(parseFloat(swapAmtIn) * 1e6))
                      : BigInt(Math.floor(parseFloat(swapAmtIn) * 1e18));
                    await swap(swapDir === "AtoB" ? "A" : "B", rawIn, 0n);
                  }}
                  className="w-full py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: TIER_CONFIG[selectedTier].color, color: selectedTier === 2 ? "white" : "black" }}>
                  {swapStatus === "approving" ? "Approving…" : swapStatus === "pending" ? "Swapping…" : "Swap"}
                </button>
                <div className="flex justify-end"><StatusDot status={swapStatus} /></div>
              </div>
            )}

            {/* ── LIQUIDITY ── */}
            {panelTab === "liquidity" && (
              <div className="space-y-3">
                {/* Sub-tabs */}
                <div className="flex gap-2">
                  {(["add", "remove"] as const).map(t => (
                    <button key={t} onClick={() => setLiqTab(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={liqTab === t
                        ? { background: TIER_CONFIG[selectedTier].bgColor, color: TIER_CONFIG[selectedTier].color, border: `1px solid ${TIER_CONFIG[selectedTier].borderColor}` }
                        : { background: "#13151A", color: "#4A5568", border: "1px solid #1F2235" }}>
                      {t === "add" ? <><Plus className="w-3 h-3 inline mr-1" />Add</> : <><Minus className="w-3 h-3 inline mr-1" />Remove</>}
                    </button>
                  ))}
                </div>

                {liqTab === "add" && (
                  <div className="space-y-3">
                    <div className="rounded-lg p-3" style={{ background: "#13151A", border: "1px solid #1F2235" }}>
                      <div className="text-xs text-[#4A5568] mb-1">IUSD amount</div>
                      <input type="number" min="0" placeholder="0.00" value={addAmtA}
                        onChange={e => setAddAmtA(e.target.value)}
                        className="w-full bg-transparent text-white font-bold outline-none placeholder-[#252840]" />
                    </div>
                    <div className="rounded-lg p-3" style={{ background: "#13151A", border: "1px solid #1F2235" }}>
                      <div className="text-xs text-[#4A5568] mb-1">tTREAS amount (auto-calculated)</div>
                      <input type="number" min="0" placeholder="0.00" value={addAmtB}
                        onChange={e => setAddAmtB(e.target.value)}
                        className="w-full bg-transparent text-white font-bold outline-none placeholder-[#252840]" />
                    </div>
                    <button
                      disabled={!wallet || !addAmtA || !addAmtB || addStatus === "pending" || addStatus === "approving" || !contracted}
                      onClick={async () => {
                        if (!addAmtA || !addAmtB) return;
                        const a = BigInt(Math.floor(parseFloat(addAmtA) * 1e6));
                        const b = BigInt(Math.floor(parseFloat(addAmtB) * 1e18));
                        await addLiquidity(a, b);
                      }}
                      className="w-full py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: TIER_CONFIG[selectedTier].color, color: selectedTier === 2 ? "white" : "black" }}>
                      {addStatus === "approving" ? "Approving…" : addStatus === "pending" ? "Adding…" : "Add Liquidity"}
                    </button>
                    <div className="flex justify-end"><StatusDot status={addStatus} /></div>
                  </div>
                )}

                {liqTab === "remove" && (
                  <div className="space-y-3">
                    <div className="rounded-lg p-3" style={{ background: "#13151A", border: "1px solid #1F2235" }}>
                      <div className="text-xs text-[#4A5568] mb-1">LP tokens to burn</div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" placeholder="0.00" value={removeAmtLp}
                          onChange={e => setRemoveAmtLp(e.target.value)}
                          className="flex-1 bg-transparent text-white font-bold outline-none placeholder-[#252840]" />
                        <button className="text-xs px-2 py-1 rounded"
                          style={{ background: "#1F2235", color: "#8892A4" }}
                          onClick={() => setRemoveAmtLp(fmtLp(balances.lp).replace(/,/g, ""))}>
                          MAX
                        </button>
                      </div>
                    </div>
                    <button
                      disabled={!wallet || !removeAmtLp || parseFloat(removeAmtLp) <= 0 || remStatus === "pending" || !contracted}
                      onClick={async () => {
                        if (!removeAmtLp) return;
                        const lp = BigInt(Math.floor(parseFloat(removeAmtLp) * 1e18));
                        await removeLiquidity(lp);
                      }}
                      className="w-full py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "#EA3943", color: "white" }}>
                      {remStatus === "pending" ? "Removing…" : "Remove Liquidity"}
                    </button>
                    <div className="flex justify-end"><StatusDot status={remStatus} /></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Live Compliance Log */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1F2235" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ background: "#13151A", borderColor: "#1F2235" }}>
          <Activity className="w-4 h-4 text-[#375BD2]" />
          <span className="text-sm font-bold text-white">Live Compliance Log</span>
          {contracted && selectedTier && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#16C784] inline-block animate-pulse ml-1" />
              <span className="text-xs text-[#16C784]">LIVE</span>
            </>
          )}
        </div>
        <div className="divide-y divide-[#1F2235]" style={{ background: "#0D0E12" }}>
          {events.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[#4A5568] text-sm">
                {!contracted
                  ? "Select a pool to view live events once contracts are deployed."
                  : !selectedTier
                  ? "Select a pool above to view its compliance log."
                  : "No events in the last 1000 blocks."}
              </p>
              {/* Static mock events for demo / pre-deployment */}
              {!contracted && (
                <div className="mt-4 space-y-2">
                  {[
                    { type: "Swapped",          user: "0xAa01…0001", detail: "100 IUSD → 99.7 tTREAS",  compliant: true  },
                    { type: "LiquidityAdded",   user: "0xAa02…0002", detail: "+500 IUSD + 500 tTREAS",  compliant: true  },
                    { type: "ComplianceBlocked",user: "0xAa03…0003", detail: "swap blocked · Tier 0",    compliant: false },
                    { type: "Swapped",          user: "0xAa04…0004", detail: "250 tTREAS → 248 IUSD",   compliant: true  },
                  ].map((ev, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
                      style={{ background: ev.compliant ? "rgba(22,199,132,0.05)" : "rgba(234,57,67,0.05)", border: `1px solid ${ev.compliant ? "rgba(22,199,132,0.15)" : "rgba(234,57,67,0.15)"}` }}>
                      <span style={{ color: ev.compliant ? "#16C784" : "#EA3943" }}>
                        {ev.compliant ? "✓" : "✗"}
                      </span>
                      <span className="text-[#8892A4]">{ev.type}</span>
                      <span className="text-white">{ev.user}</span>
                      <span className="text-[#4A5568] flex-1 text-right">{ev.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : events.map((ev, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs"
              style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
              <span style={{ color: ev.compliant ? "#16C784" : "#EA3943" }}>
                {ev.compliant ? "✓" : "✗"}
              </span>
              <span className="text-[#8892A4] w-28 flex-shrink-0">{ev.type}</span>
              <span className="text-white font-mono">{ev.user}</span>
              {ev.amountA != null && (
                <span className="text-[#4A5568]">+{fmtIusd(ev.amountA)} IUSD</span>
              )}
              {ev.amountIn != null && (
                <span className="text-[#4A5568]">{fmtIusd(ev.amountIn)} → {fmtTreas(ev.amountOut ?? 0n)}</span>
              )}
              <a href={`https://sepolia.etherscan.io/tx/${ev.txHash}`} target="_blank" rel="noreferrer"
                className="ml-auto text-[#375BD2] hover:underline">↗</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
