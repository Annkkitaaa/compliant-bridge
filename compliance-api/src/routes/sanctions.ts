import { Router, Request, Response } from "express";
import { lookupAddress } from "../data/seed-data";

const router = Router();

export function checkSanctions(address: string) {
  const record = lookupAddress(address);

  if (!record) {
    return {
      address,
      sanctioned: false,
      source: null,
      riskScore: 0,
      checkedAt: new Date().toISOString(),
      note: "Address not found in any sanctions list",
    };
  }

  return {
    address,
    sanctioned: record.sanctioned,
    source: record.sanctionSource || null,
    riskScore: record.sanctioned ? 100 : 0,
    checkedAt: new Date().toISOString(),
    note: record.sanctioned
      ? `Match found on ${record.sanctionSource}`
      : "No sanctions match",
  };
}

router.post("/sanctions-check", async (req: Request, res: Response) => {
  const { address } = req.body;

  if (!address) {
    res.status(400).json({ error: "Missing required field: address" });
    return;
  }

  // Artificial delay for realism (200-500ms)
  const delay = 200 + Math.random() * 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const result = checkSanctions(address);
  res.json(result);
});

export default router;
