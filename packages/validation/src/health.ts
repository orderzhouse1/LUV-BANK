import { z } from "zod";

export const healthStatusSchema = z.enum(["ok"]);

export const healthResponseSchema = z.object({
  status: healthStatusSchema,
  service: z.literal("luv-bank-api"),
  timestamp: z.string().datetime(),
});

export const readinessResponseSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  service: z.literal("luv-bank-api"),
  persistence: z.enum(["memory", "prisma"]),
  database: z.enum(["ok", "unavailable", "not_required"]),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
