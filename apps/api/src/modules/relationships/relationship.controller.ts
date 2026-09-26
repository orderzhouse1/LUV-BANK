import type { RequestHandler } from "express";
import {
  createRelationshipProfileRequestSchema,
  relationshipProfileResponseSchema,
  updateRelationshipProfileRequestSchema,
} from "@luv-bank/validation";
import type { AuthedRequest } from "../../middleware/auth";
import { AppError } from "../../errors/app-error";
import type { RelationshipService } from "./relationship.service";

export function createRelationshipControllers(service: RelationshipService) {
  const getActive: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const payload = await service.getActive(user.id);
      res.status(200).json(relationshipProfileResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const body = createRelationshipProfileRequestSchema.parse(req.body);
      const payload = await service.create(user.id, body);
      res.status(201).json(relationshipProfileResponseSchema.parse(payload));
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
      const profileId = String(req.params.profileId ?? "");
      const body = updateRelationshipProfileRequestSchema.parse(req.body);
      const payload = await service.update(user.id, profileId, body);
      res.status(200).json(relationshipProfileResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  return { getActive, create, update };
}
