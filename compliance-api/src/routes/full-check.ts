import { Router, Request, Response } from "express";
import { checkSanctions } from "./sanctions";
import { checkKyc } from "./kyc";
import { checkAccredited } from "./accredited";
import { checkJurisdiction } from "./jurisdiction";

const router = Router();

type OverallResult = "PASS" | "FAIL" | "REVIEW";

function determineOverallResult(
  sanctions: ReturnType<typeof checkSanctions>,
  kyc: ReturnType<typeof checkKyc>,
  accredited: ReturnType<typeof checkAccredited>,
  jurisdiction: ReturnType<typeof checkJurisdiction>
): OverallResult {
  // FAIL: sanctions match or KYC rejected
  if (sanctions.sanctioned) return "FAIL";
  if (kyc.kycStatus === "rejected") return "FAIL";

  // REVIEW: pending/expired KYC, not accredited, or restricted jurisdiction
  if (kyc.kycStatus === "pending" || kyc.kycStatus === "expired") return "REVIEW";
  if (kyc.kycStatus === "unknown") return "REVIEW";
  if (!accredited.accreditedInvestor) return "REVIEW";
  if (jurisdiction.restricted) return "REVIEW";

  return "PASS";
}

router.post("/full-compliance-check", (req: Request, res: Response) => {
  const { address } = req.body;

  if (!address) {
    res.status(400).json({ error: "Missing required field: address" });
    return;
  }

  const sanctions = checkSanctions(address);
  const kyc = checkKyc(address);
  const accredited = checkAccredited(address);
  const jurisdiction = checkJurisdiction(address);

  const overallResult = determineOverallResult(sanctions, kyc, accredited, jurisdiction);

  res.json({
    address,
    overallResult,
    checks: {
      sanctions,
      kyc,
      accredited,
      jurisdiction,
    },
    checkedAt: new Date().toISOString(),
  });
});

export default router;
