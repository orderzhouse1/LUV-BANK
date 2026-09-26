import type { RequestHandler } from "express";
import { insightSummaryQuerySchema, insightSummaryResponseSchema } from "@luv-bank/validation";
import { AppError } from "../../errors/app-error";
import type { AuthedRequest } from "../../middleware/auth";
import type { InsightService } from "./insight.service";

function noStore(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
}

export function createInsightControllers(service: InsightService) {
  const summary: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const query = insightSummaryQuerySchema.parse(req.query);
      const payload = await service.summarize(user.id, query);
      noStore(res);
      res.status(200).json(insightSummaryResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  return { summary };
}
