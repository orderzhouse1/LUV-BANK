import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Soft request deadline: if the response has not finished within timeoutMs,
 * respond 504 once. Does not kill the underlying work.
 */
export function requestTimeoutMiddleware(timeoutMs: number): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (res.headersSent) return;
      res.status(504).json({
        error: {
          code: "REQUEST_TIMEOUT",
          message: "The request took too long to complete.",
          requestId: (req as Request & { requestId?: string }).requestId,
        },
      });
    }, timeoutMs);

    const clear = () => clearTimeout(timer);
    res.on("finish", clear);
    res.on("close", clear);
    next();
  };
}
