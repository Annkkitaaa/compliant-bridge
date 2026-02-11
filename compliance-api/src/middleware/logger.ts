import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  const address = req.body?.address || "N/A";
  console.log(`[${timestamp}] ${req.method} ${req.path} - address: ${address}`);
  next();
}
