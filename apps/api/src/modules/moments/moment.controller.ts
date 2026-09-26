import type { RequestHandler } from "express";
import {
  createMomentRequestSchema,
  momentListQuerySchema,
  momentSingleResponseSchema,
  paginatedMomentsResponseSchema,
  updateMomentRequestSchema,
} from "@luv-bank/validation";
import { AppError } from "../../errors/app-error";
import type { AuthedRequest } from "../../middleware/auth";
import type { MomentService } from "./moment.service";

function noStore(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
}

export function createMomentControllers(service: MomentService) {
  const create: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const body = createMomentRequestSchema.parse(req.body);
      const result = await service.create(user.id, body);
      noStore(res);
      res
        .status(result.created ? 201 : 200)
        .json(momentSingleResponseSchema.parse({ moment: result.moment }));
    } catch (error) {
      next(error);
    }
  };

  const list: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const query = momentListQuerySchema.parse(req.query);
      const payload = await service.list(user.id, query);
      noStore(res);
      res.status(200).json(paginatedMomentsResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  const getOne: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const momentId = String(req.params.momentId ?? "");
      const moment = await service.get(user.id, momentId);
      noStore(res);
      res.status(200).json(momentSingleResponseSchema.parse({ moment }));
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const momentId = String(req.params.momentId ?? "");
      const body = updateMomentRequestSchema.parse(req.body);
      const moment = await service.update(user.id, momentId, body);
      noStore(res);
      res.status(200).json(momentSingleResponseSchema.parse({ moment }));
    } catch (error) {
      next(error);
    }
  };

  const remove: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const momentId = String(req.params.momentId ?? "");
      await service.remove(user.id, momentId);
      noStore(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return { create, list, getOne, update, remove };
}
