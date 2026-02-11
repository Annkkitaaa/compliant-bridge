import { Request, Response, NextFunction } from "express";

const API_KEY = process.env.COMPLIANCE_API_KEY || "test-api-key-123";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/api/v1/health") {
    next();
    return;
  }

  const key = req.headers["x-api-key"];

  if (!key) {
    res.status(401).json({ error: "Missing x-api-key header" });
    return;
  }

  if (key !== API_KEY) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  next();
}
