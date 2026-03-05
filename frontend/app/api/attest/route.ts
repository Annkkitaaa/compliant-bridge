/**
 * POST /api/attest
 * Server-side relayer: attests any wallet address on both gateways using
 * the deployer's private key. This is the standard "compliance relay" pattern —
 * the server acts as the authorized compliance authority for the demo.
 *
 * Required env var: ATTESTOR_PRIVATE_KEY (deployer private key)
 */
import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { ADDRESSES, POOL_ADDRESSES, SEPOLIA_RPC } from "@/lib/contracts";

const ATTEST_ABI = [
  "function attestCompliance(address subject, tuple(address subject, uint8 tier, uint256 maxTransferValue, uint256 validUntil, bytes32 checkId, bytes jurisdictionData, uint256 issuedAt, uint256 sourceChainId) attestation) external",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address: string = body.address;

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const privateKey = process.env.ATTESTOR_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: "Attestor not configured — add ATTESTOR_PRIVATE_KEY to .env.local" },
        { status: 503 },
      );
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const attestor  = new ethers.Wallet(privateKey, provider);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const attestation = {
      subject:          address,
      tier:             1,                           // Tier 1 — Basic (any user can request)
      maxTransferValue: ethers.parseEther("10000"),  // $10K limit for Tier 1
      validUntil:       now + BigInt(365 * 24 * 60 * 60), // 1 year
      checkId:          ethers.keccak256(ethers.toUtf8Bytes(address + now.toString())),
      jurisdictionData: ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "bool"],
        ["US", "NY", false],
      ),
      issuedAt:         now,
      sourceChainId:    BigInt(11155111), // Sepolia
    };

    // Attest on OLD gateway → Institution + Regulator tabs
    const oldGw = new ethers.Contract(ADDRESSES.sepolia.gateway, ATTEST_ABI, attestor);
    const tx1 = await oldGw.attestCompliance(address, attestation);
    await tx1.wait();

    // Attest on POOL gateway → Compliant Pool tab
    const poolGw = new ethers.Contract(POOL_ADDRESSES.sepolia.gateway, ATTEST_ABI, attestor);
    const tx2 = await poolGw.attestCompliance(address, attestation);
    await tx2.wait();

    return NextResponse.json({ success: true, tier: 1 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/attest]", msg);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}
