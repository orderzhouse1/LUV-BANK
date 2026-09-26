import type { RequestHandler } from "express";
import { balanceSummaryQuerySchema, balanceSummaryResponseSchema } from "@luv-bank/validation";
import { AppError } from "../../errors/app-error";
import type { AuthedRequest } from "../../middleware/auth";
import type { BalanceService } from "./balance.service";

function noStore(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
}

export function createBalanceControllers(service: BalanceService) {
  const summary: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const query = balanceSummaryQuerySchema.parse(req.query);
      const payload = await service.summarize(user.id, query);
      noStore(res);
      res.status(200).json(balanceSummaryResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  return { summary };
}
