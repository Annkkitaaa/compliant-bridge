import { Router, Request, Response } from "express";
import { lookupAddress } from "../data/seed-data";

const router = Router();

export function checkKyc(address: string) {
  const record = lookupAddress(address);

  if (!record) {
    return {
      address,
      kycStatus: "unknown" as const,
      kycExpiry: null,
      checkedAt: new Date().toISOString(),
      note: "No KYC record found for this address",
    };
  }

  return {
    address,
    kycStatus: record.kycStatus,
    kycExpiry: record.kycExpiry || null,
    checkedAt: new Date().toISOString(),
    note:
      record.kycStatus === "approved"
        ? "KYC verified and current"
        : record.kycStatus === "expired"
          ? "KYC verification has expired — renewal required"
          : record.kycStatus === "pending"
            ? "KYC verification in progress"
            : record.kycStatus === "rejected"
              ? "KYC verification rejected"
              : "No KYC record found",
  };
}

router.post("/kyc-status", (req: Request, res: Response) => {
  const { address } = req.body;

  if (!address) {
    res.status(400).json({ error: "Missing required field: address" });
    return;
  }

  const result = checkKyc(address);
  res.json(result);
});

export default router;
