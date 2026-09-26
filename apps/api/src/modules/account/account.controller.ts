import type { RequestHandler } from "express";
import {
  changePasswordRequestSchema,
  currentPasswordRequestSchema,
  dataExportSchema,
  deleteAccountRequestSchema,
  deletionSummaryResponseSchema,
  sessionListResponseSchema,
} from "@luv-bank/validation";
import type { ApiEnv } from "../../config/env";
import { AppError } from "../../errors/app-error";
import { buildClearedAuthCookieHeaders } from "../../lib/cookies";
import type { AuthedRequest } from "../../middleware/auth";
import type { AccountService } from "./account.service";

function noStore(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
}

function requireUser(req: AuthedRequest) {
  if (!req.authUser || !req.authSessionId) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
  }
  return { user: req.authUser, sessionId: req.authSessionId };
}

export function createAccountControllers(env: ApiEnv, service: AccountService) {
  const listSessions: RequestHandler = async (req, res, next) => {
    try {
      const { user, sessionId } = requireUser(req as AuthedRequest);
      const payload = await service.listSessions(user.id, sessionId);
      noStore(res);
      res.status(200).json(sessionListResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  const revokeSession: RequestHandler = async (req, res, next) => {
    try {
      const { user, sessionId } = requireUser(req as AuthedRequest);
      const targetId = String(req.params.sessionId ?? "");
      const result = await service.revokeSession(user.id, sessionId, targetId);
      noStore(res);
      if (result.revokedCurrent) {
        res.setHeader("Set-Cookie", buildClearedAuthCookieHeaders(env));
        res.status(204).send();
        return;
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  const changePassword: RequestHandler = async (req, res, next) => {
    try {
      const { user } = requireUser(req as AuthedRequest);
      const body = changePasswordRequestSchema.parse(req.body);
      const payload = await service.changePassword(user, body);
      noStore(res);
      res.status(200).json(payload);
    } catch (error) {
      next(error);
    }
  };

  const exportData: RequestHandler = async (req, res, next) => {
    try {
      const { user, sessionId } = requireUser(req as AuthedRequest);
      const body = currentPasswordRequestSchema.parse(req.body);
      const payload = await service.exportPersonalData(user, sessionId, body);
      noStore(res);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="luv-bank-data-export-v1.json"');
      res.status(200).json(dataExportSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  const deletionSummary: RequestHandler = async (req, res, next) => {
    try {
      const { user } = requireUser(req as AuthedRequest);
      const payload = await service.deletionSummary(user.id);
      noStore(res);
      res.status(200).json(deletionSummaryResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  const revokeAllShares: RequestHandler = async (req, res, next) => {
    try {
      const { user } = requireUser(req as AuthedRequest);
      const payload = await service.revokeAllShares(user.id);
      noStore(res);
      res.status(200).json(payload);
    } catch (error) {
      next(error);
    }
  };

  const hardDeleteShare: RequestHandler = async (req, res, next) => {
    try {
      const { user } = requireUser(req as AuthedRequest);
      const shareId = String(req.params.shareId ?? "");
      const payload = await service.hardDeleteShare(user.id, shareId);
      noStore(res);
      res.status(200).json(payload);
    } catch (error) {
      next(error);
    }
  };

  const deleteAccount: RequestHandler = async (req, res, next) => {
    try {
      const { user } = requireUser(req as AuthedRequest);
      const body = deleteAccountRequestSchema.parse(req.body);
      await service.deleteAccount(user, body);
      noStore(res);
      res.setHeader("Set-Cookie", buildClearedAuthCookieHeaders(env));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  return {
    listSessions,
    revokeSession,
    changePassword,
    exportData,
    deletionSummary,
    revokeAllShares,
    hardDeleteShare,
    deleteAccount,
  };
}
