import { Router, Request, Response } from "express";
import { lookupAddress } from "../data/seed-data";

const router = Router();

export function checkAccredited(address: string) {
  const record = lookupAddress(address);

  if (!record) {
    return {
      address,
      accreditedInvestor: false,
      accreditationType: null,
      checkedAt: new Date().toISOString(),
      note: "No accreditation record found for this address",
    };
  }

  return {
    address,
    accreditedInvestor: record.accreditedInvestor,
    accreditationType: record.accreditationType || null,
    checkedAt: new Date().toISOString(),
    note: record.accreditedInvestor
      ? `Accredited via ${record.accreditationType}`
      : "Not an accredited investor",
  };
}

router.post("/accredited-investor", (req: Request, res: Response) => {
  const { address } = req.body;

  if (!address) {
    res.status(400).json({ error: "Missing required field: address" });
    return;
  }

  const result = checkAccredited(address);
  res.json(result);
});

export default router;
