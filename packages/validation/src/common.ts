import { z } from "zod";

export const localeSchema = z.enum(["en", "ar"]);
export type Locale = z.infer<typeof localeSchema>;

export const cuidSchema = z.string().min(1);
export const isoDateTimeSchema = z.string().datetime();
