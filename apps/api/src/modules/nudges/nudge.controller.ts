import type { RequestHandler } from "express";
import {
  nudgeCurrentResponseSchema,
  nudgeSummaryQuerySchema,
  suppressNudgeRequestSchema,
} from "@luv-bank/validation";
import { AppError } from "../../errors/app-error";
import type { AuthedRequest } from "../../middleware/auth";
import type { NudgeService } from "./nudge.service";

function noStore(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
}

export function createNudgeControllers(service: NudgeService) {
  const current: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const query = nudgeSummaryQuerySchema.parse(req.query);
      const payload = await service.current(user.id, query);
      noStore(res);
      res.status(200).json(nudgeCurrentResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  const suppress: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const body = suppressNudgeRequestSchema.parse(req.body);
      await service.suppress(user.id, body);
      noStore(res);
      res.status(200).json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  return { current, suppress };
}
