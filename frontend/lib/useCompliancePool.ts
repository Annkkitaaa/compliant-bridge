"use client";
/**
 * React hooks for the Compliance Liquidity Pool.
 * All ethers calls use the same JsonRpcProvider / BrowserProvider pattern
 * as the rest of the frontend (see contracts.ts).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  COMPLIANCE_POOL_ABI,
  MOCK_ERC20_ABI,
  GATEWAY_TIER_ABI,
  POOL_ADDRESSES,
  TIER_CONFIG,
  getReadProvider,
  getBrowserSigner,
  shortAddr,
} from "./contracts";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PoolInfo {
  gateway:      string;
  tokenA:       string;
  tokenB:       string;
  requiredTier: number;
  reserveA:     bigint;
  reserveB:     bigint;
  totalSupply:  bigint;
  tvlDisplay:   string; // formatted "100,000 IUSD + 100,000 tTREAS"
}

export interface UserCompliance {
  tier:           number;
  name:           string;
  color:          string;
  bgColor:        string;
  borderColor:    string;
  canAccessPool:  (requiredTier: number) => boolean;
}

export interface SwapQuote {
  amountOut:    bigint;
  priceImpact:  number; // %
  fee:          bigint;
}

export interface TokenBalances {
  iusd:   bigint;
  tTreas: bigint;
  lp:     bigint;
}

export interface PoolEvent {
  type:      "LiquidityAdded" | "LiquidityRemoved" | "Swapped" | "ComplianceBlocked";
  user:      string;
  amountA?:  bigint;
  amountB?:  bigint;
  amountIn?: bigint;
  amountOut?:bigint;
  txHash:    string;
  blockNumber: bigint;
  compliant: boolean; // true = green, false = red
}

export type TxStatus = "idle" | "approving" | "pending" | "success" | "error";

// ── Zero address check ─────────────────────────────────────────────────────────
function isDeployed(addr: string) {
  return addr !== "0x0000000000000000000000000000000000000000";
}

// ── usePoolInfo ────────────────────────────────────────────────────────────────

export function usePoolInfo(poolAddress: string) {
  const [info, setInfo]   = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!isDeployed(poolAddress)) { setInfo(null); return; }
    setLoading(true);
    try {
      const { ethers } = await import("ethers");
      const provider = getReadProvider("sepolia");
      const pool = new ethers.Contract(poolAddress, COMPLIANCE_POOL_ABI, provider);
      const [gw, tA, tB, rt, rA, rB, ts] = await pool.getPoolInfo();
      const tvl = rA > 0n
        ? `${Number(rA / BigInt(1e6)).toLocaleString()} IUSD + ${Number(rB / BigInt(1e18)).toLocaleString()} tTREAS`
        : "No liquidity yet";
      setInfo({ gateway: gw, tokenA: tA, tokenB: tB, requiredTier: Number(rt), reserveA: rA, reserveB: rB, totalSupply: ts, tvlDisplay: tvl });
    } catch { setInfo(null); }
    finally { setLoading(false); }
  }, [poolAddress]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 15_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { info, loading, refetch: fetch };
}

// ── useUserCompliance ─────────────────────────────────────────────────────────

export function useUserCompliance(userAddress: string | null, gatewayAddress: string) {
  const [compliance, setCompliance] = useState<UserCompliance | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const refetch = useCallback(() => setRefreshCount(c => c + 1), []);

  useEffect(() => {
    if (!userAddress || !isDeployed(gatewayAddress)) { setCompliance(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider = getReadProvider("sepolia");
        const gw = new ethers.Contract(gatewayAddress, GATEWAY_TIER_ABI, provider);
        const tier: bigint = await gw.getComplianceTier(userAddress);
        const t = Number(tier);
        const cfg = TIER_CONFIG[t] ?? { name: "None", color: "#4A5568", bgColor: "rgba(74,85,104,0.1)", borderColor: "rgba(74,85,104,0.3)", maxTransfer: "—", poolKey: "tier1Pool" as const };
        if (!cancelled) setCompliance({
          tier: t,
          name:        cfg.name,
          color:       cfg.color,
          bgColor:     cfg.bgColor,
          borderColor: cfg.borderColor,
          canAccessPool: (req) => t >= req,
        });
      } catch { if (!cancelled) setCompliance(null); }
    })();
    return () => { cancelled = true; };
  }, [userAddress, gatewayAddress, refreshCount]);

  return { compliance, refetch };
}

// ── useSwapQuote ───────────────────────────────────────────────────────────────

export function useSwapQuote(
  poolAddress: string,
  tokenIn: "A" | "B",
  amountInRaw: bigint,
  reserveA: bigint,
  reserveB: bigint,
) {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!isDeployed(poolAddress) || amountInRaw === 0n || reserveA === 0n) { setQuote(null); return; }
    timer.current = setTimeout(async () => {
      try {
        const { ethers } = await import("ethers");
        const provider = getReadProvider("sepolia");
        const pool = new ethers.Contract(poolAddress, COMPLIANCE_POOL_ABI, provider);
        const [rIn, rOut] = tokenIn === "A" ? [reserveA, reserveB] : [reserveB, reserveA];
        const amountOut: bigint = await pool.getAmountOut(amountInRaw, rIn, rOut);
        const fee = amountInRaw * 3n / 1000n;
        // Price impact ≈ amountIn / reserveIn
        const impact = rIn > 0n ? Number((amountInRaw * 10000n) / rIn) / 100 : 0;
        setQuote({ amountOut, priceImpact: impact, fee });
      } catch { setQuote(null); }
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [poolAddress, tokenIn, amountInRaw, reserveA, reserveB]);

  return quote;
}

// ── useTokenBalances ──────────────────────────────────────────────────────────

export function useTokenBalances(
  userAddress: string | null,
  poolAddress: string,
  iusdAddress: string,
  tTreasAddress: string,
) {
  const [balances, setBalances] = useState<TokenBalances>({ iusd: 0n, tTreas: 0n, lp: 0n });

  const fetch = useCallback(async () => {
    if (!userAddress || !isDeployed(iusdAddress)) return;
    try {
      const { ethers } = await import("ethers");
      const provider = getReadProvider("sepolia");
      const iusd   = new ethers.Contract(iusdAddress,   MOCK_ERC20_ABI,       provider);
      const tTreas = new ethers.Contract(tTreasAddress, MOCK_ERC20_ABI,       provider);
      const pool   = new ethers.Contract(poolAddress,   COMPLIANCE_POOL_ABI,  provider);
      const [iusdBal, tTreasBal, lpBal] = await Promise.all([
        iusd.balanceOf(userAddress),
        tTreas.balanceOf(userAddress),
        isDeployed(poolAddress) ? pool.getLPBalance(userAddress) : 0n,
      ]);
      setBalances({ iusd: iusdBal, tTreas: tTreasBal, lp: lpBal });
    } catch { /* ignore */ }
  }, [userAddress, poolAddress, iusdAddress, tTreasAddress]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 10_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { balances, refetch: fetch };
}

// ── usePoolEvents ─────────────────────────────────────────────────────────────

export function usePoolEvents(poolAddress: string) {
  const [events, setEvents] = useState<PoolEvent[]>([]);

  useEffect(() => {
    if (!isDeployed(poolAddress)) { setEvents([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const { ethers } = await import("ethers");
        const provider = getReadProvider("sepolia");
        const pool = new ethers.Contract(poolAddress, COMPLIANCE_POOL_ABI, provider);
        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - 50000);

        const [added, removed, swapped, blocked] = await Promise.all([
          pool.queryFilter(pool.filters.LiquidityAdded(),   fromBlock),
          pool.queryFilter(pool.filters.LiquidityRemoved(), fromBlock),
          pool.queryFilter(pool.filters.Swapped(),          fromBlock),
          pool.queryFilter(pool.filters.ComplianceBlocked(), fromBlock),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ev = (arr: (import("ethers").Log | import("ethers").EventLog)[]) => arr as any[];

        const all: PoolEvent[] = [
          ...ev(added).map((e) => ({
            type:       "LiquidityAdded" as const,
            user:       shortAddr(e.args.provider),
            amountA:    e.args.amountA as bigint,
            amountB:    e.args.amountB as bigint,
            txHash:     e.transactionHash as string,
            blockNumber: BigInt(e.blockNumber as number),
            compliant:  true,
          })),
          ...ev(removed).map((e) => ({
            type:       "LiquidityRemoved" as const,
            user:       shortAddr(e.args.provider),
            amountA:    e.args.amountA as bigint,
            amountB:    e.args.amountB as bigint,
            txHash:     e.transactionHash as string,
            blockNumber: BigInt(e.blockNumber as number),
            compliant:  true,
          })),
          ...ev(swapped).map((e) => ({
            type:       "Swapped" as const,
            user:       shortAddr(e.args.trader),
            amountIn:   e.args.amountIn as bigint,
            amountOut:  e.args.amountOut as bigint,
            txHash:     e.transactionHash as string,
            blockNumber: BigInt(e.blockNumber as number),
            compliant:  true,
          })),
          ...ev(blocked).map((e) => ({
            type:       "ComplianceBlocked" as const,
            user:       shortAddr(e.args.user),
            txHash:     e.transactionHash as string,
            blockNumber: BigInt(e.blockNumber as number),
            compliant:  false,
          })),
        ];

        all.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        if (!cancelled) setEvents(all.slice(0, 10));
      } catch { if (!cancelled) setEvents([]); }
    })();
    return () => { cancelled = true; };
  }, [poolAddress]);

  return events;
}

// ── useSwap ────────────────────────────────────────────────────────────────────

export function useSwap(poolAddress: string, iusdAddress: string, tTreasAddress: string) {
  const [status, setStatus]   = useState<TxStatus>("idle");
  const [txHash, setTxHash]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const swap = useCallback(async (tokenIn: "A" | "B", amountIn: bigint, amountOutMin: bigint) => {
    setStatus("idle"); setError(null); setTxHash(null);
    try {
      const { ethers } = await import("ethers");
      const signer = await getBrowserSigner();
      const tokenInAddress = tokenIn === "A" ? iusdAddress : tTreasAddress;
      const tokenContract  = new ethers.Contract(tokenInAddress, MOCK_ERC20_ABI, signer);
      const poolContract   = new ethers.Contract(poolAddress, COMPLIANCE_POOL_ABI, signer);

      // Check / set allowance
      const allowance: bigint = await tokenContract.allowance(await signer.getAddress(), poolAddress);
      if (allowance < amountIn) {
        setStatus("approving");
        const approveTx = await tokenContract.approve(poolAddress, amountIn * 2n);
        await approveTx.wait();
      }

      setStatus("pending");
      const tx = await poolContract.swap(tokenInAddress, amountIn, amountOutMin);
      setTxHash(tx.hash);
      await tx.wait();
      setStatus("success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes("NotCompliant") ? "Wallet not compliant for this pool" : msg.slice(0, 80));
      setStatus("error");
    }
  }, [poolAddress, iusdAddress, tTreasAddress]);

  const reset = useCallback(() => { setStatus("idle"); setError(null); setTxHash(null); }, []);

  return { swap, status, txHash, error, reset };
}

// ── useAddLiquidity ────────────────────────────────────────────────────────────

export function useAddLiquidity(poolAddress: string, iusdAddress: string, tTreasAddress: string) {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const addLiquidity = useCallback(async (amountA: bigint, amountB: bigint) => {
    setStatus("idle"); setError(null); setTxHash(null);
    try {
      const { ethers } = await import("ethers");
      const signer  = await getBrowserSigner();
      const iusd    = new ethers.Contract(iusdAddress,   MOCK_ERC20_ABI,      signer);
      const tTreas  = new ethers.Contract(tTreasAddress, MOCK_ERC20_ABI,      signer);
      const pool    = new ethers.Contract(poolAddress,   COMPLIANCE_POOL_ABI, signer);
      const me      = await signer.getAddress();

      const [allowA, allowB] = await Promise.all([
        iusd.allowance(me, poolAddress),
        tTreas.allowance(me, poolAddress),
      ]);

      setStatus("approving");
      const approvals = [];
      if (allowA < amountA) approvals.push(iusd.approve(poolAddress, amountA * 2n));
      if (allowB < amountB) approvals.push(tTreas.approve(poolAddress, amountB * 2n));
      if (approvals.length > 0) {
        const txs = await Promise.all(approvals);
        await Promise.all(txs.map((t: { wait: () => Promise<unknown> }) => t.wait()));
      }

      setStatus("pending");
      const tx = await pool.addLiquidity(amountA, amountB, 0n, 0n);
      setTxHash(tx.hash);
      await tx.wait();
      setStatus("success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes("NotCompliant") ? "Wallet not compliant for this pool" : msg.slice(0, 80));
      setStatus("error");
    }
  }, [poolAddress, iusdAddress, tTreasAddress]);

  const reset = useCallback(() => { setStatus("idle"); setError(null); setTxHash(null); }, []);

  return { addLiquidity, status, txHash, error, reset };
}

// ── useRemoveLiquidity ─────────────────────────────────────────────────────────

export function useRemoveLiquidity(poolAddress: string) {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const removeLiquidity = useCallback(async (lpAmount: bigint) => {
    setStatus("idle"); setError(null); setTxHash(null);
    try {
      const { ethers } = await import("ethers");
      const signer = await getBrowserSigner();
      const pool   = new ethers.Contract(poolAddress, COMPLIANCE_POOL_ABI, signer);

      setStatus("pending");
      const tx = await pool.removeLiquidity(lpAmount);
      setTxHash(tx.hash);
      await tx.wait();
      setStatus("success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes("NotCompliant") ? "Wallet not compliant for this pool" : msg.slice(0, 80));
      setStatus("error");
    }
  }, [poolAddress]);

  const reset = useCallback(() => { setStatus("idle"); setError(null); setTxHash(null); }, []);

  return { removeLiquidity, status, txHash, error, reset };
}

// ── useFaucet ──────────────────────────────────────────────────────────────────

export function useFaucet(iusdAddress: string, tTreasAddress: string) {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [error, setError]   = useState<string | null>(null);

  const drip = useCallback(async () => {
    setStatus("pending"); setError(null);
    try {
      const { ethers } = await import("ethers");
      const signer = await getBrowserSigner();
      const iusd   = new ethers.Contract(iusdAddress,   MOCK_ERC20_ABI, signer);
      const tTreas = new ethers.Contract(tTreasAddress, MOCK_ERC20_ABI, signer);
      const [tx1, tx2] = await Promise.all([iusd.faucet(), tTreas.faucet()]);
      await Promise.all([tx1.wait(), tx2.wait()]);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 80));
      setStatus("error");
    }
  }, [iusdAddress, tTreasAddress]);

  return { drip, status, error };
}
