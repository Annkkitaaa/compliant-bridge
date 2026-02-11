import { Router, Request, Response } from "express";
import { lookupAddress } from "../data/seed-data";

const router = Router();

const RESTRICTED_JURISDICTIONS = ["KP", "IR", "SY", "CU", "MM"];

export function checkJurisdiction(address: string) {
  const record = lookupAddress(address);

  if (!record) {
    return {
      address,
      jurisdiction: "unknown",
      restricted: false,
      checkedAt: new Date().toISOString(),
      note: "No jurisdiction record found for this address",
    };
  }

  const restricted =
    record.jurisdictionRestricted ||
    RESTRICTED_JURISDICTIONS.includes(record.jurisdiction);

  return {
    address,
    jurisdiction: record.jurisdiction,
    restricted,
    checkedAt: new Date().toISOString(),
    note: restricted
      ? `Jurisdiction ${record.jurisdiction} is restricted`
      : `Jurisdiction ${record.jurisdiction} is permitted`,
  };
}

router.post("/jurisdiction-check", (req: Request, res: Response) => {
  const { address } = req.body;

  if (!address) {
    res.status(400).json({ error: "Missing required field: address" });
    return;
  }

  const result = checkJurisdiction(address);
  res.json(result);
});

export default router;
