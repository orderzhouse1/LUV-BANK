import type { RequestHandler } from "express";
import {
  reminderPreferenceResponseSchema,
  snoozeReminderRequestSchema,
  upsertReminderPreferenceSchema,
} from "@luv-bank/validation";
import { AppError } from "../../errors/app-error";
import type { AuthedRequest } from "../../middleware/auth";
import type { ReminderService } from "./reminder.service";

function noStore(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader("Cache-Control", "no-store");
}

export function createReminderControllers(service: ReminderService) {
  const getPreference: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const payload = await service.getPreference(user.id);
      noStore(res);
      res.status(200).json(reminderPreferenceResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  const upsertPreference: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const body = upsertReminderPreferenceSchema.parse(req.body);
      const payload = await service.upsertPreference(user.id, body);
      noStore(res);
      res.status(200).json(reminderPreferenceResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  const dismiss: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const payload = await service.dismiss(user.id);
      noStore(res);
      res.status(200).json(reminderPreferenceResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  const snooze: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
      }
      const body = snoozeReminderRequestSchema.parse(req.body);
      const payload = await service.snooze(user.id, body);
      noStore(res);
      res.status(200).json(reminderPreferenceResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  return { getPreference, upsertPreference, dismiss, snooze };
}
