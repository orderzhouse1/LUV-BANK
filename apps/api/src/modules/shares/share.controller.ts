import type { RequestHandler } from "express";
import {
  createShareSnapshotRequestSchema,
  previewShareSnapshotRequestSchema,
  resolveShareSnapshotRequestSchema,
  shareSnapshotCreateResponseSchema,
  shareSnapshotListResponseSchema,
  shareSnapshotPreviewResponseSchema,
  shareSnapshotResolveResponseSchema,
} from "@luv-bank/validation";
import { AppError } from "../../errors/app-error";
import type { AuthedRequest } from "../../middleware/auth";
import type { ShareService } from "./share.service";

function noStore(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
}

export function createShareControllers(service: ShareService) {
  const preview: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const body = previewShareSnapshotRequestSchema.parse(req.body);
      const payload = await service.preview(user.id, body);
      noStore(res);
      res.status(200).json(shareSnapshotPreviewResponseSchema.parse(payload));
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
      const body = createShareSnapshotRequestSchema.parse(req.body);
      const payload = await service.create(user.id, body);
      noStore(res);
      res.status(201).json(shareSnapshotCreateResponseSchema.parse(payload));
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
      const payload = await service.list(user.id);
      noStore(res);
      res.status(200).json(shareSnapshotListResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  const revoke: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const shareId = String(req.params.shareId ?? "");
      const payload = await service.revoke(user.id, shareId);
      noStore(res);
      res.status(200).json(payload);
    } catch (error) {
      next(error);
    }
  };

  const resolve: RequestHandler = async (req, res, next) => {
    try {
      const body = resolveShareSnapshotRequestSchema.parse(req.body);
      const payload = await service.resolve(body);
      noStore(res);
      res.status(200).json(shareSnapshotResolveResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  return { preview, create, list, revoke, resolve };
}
