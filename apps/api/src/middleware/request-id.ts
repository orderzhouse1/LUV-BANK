import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export type RequestWithId = Request & {
  requestId: string;
};

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  const requestId = incoming && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
  (req as RequestWithId).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
