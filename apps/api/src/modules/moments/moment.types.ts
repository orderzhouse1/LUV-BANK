import { createHash } from "node:crypto";
import type {
  CreateMomentRequest,
  MomentCategoryCode,
  MomentKind,
  MomentListQuery,
  MomentResponse,
  UpdateMomentRequest,
} from "@luv-bank/validation";

export type MomentRecord = {
  id: string;
  relationshipId: string;
  kind: MomentKind;
  categoryCode: MomentCategoryCode;
  note: string | null;
  occurredAt: Date;
  clientMutationId: string;
  payloadFingerprint: string;
  scoreImpact: number;
  scoringVersion: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MomentListParams = {
  relationshipId: string;
  kind?: MomentKind;
  categoryCode?: MomentCategoryCode;
  from?: Date;
  to?: Date;
  cursor?: string;
  limit: number;
};

export type MomentListResult = {
  items: MomentRecord[];
  nextCursor: string | null;
};

export type MomentCreateInput = {
  relationshipId: string;
  kind: MomentKind;
  categoryCode: MomentCategoryCode;
  note: string | null;
  occurredAt: Date;
  clientMutationId: string;
  payloadFingerprint: string;
  scoreImpact: number;
  scoringVersion: string;
};

export type MomentUpdatePatch = {
  kind?: MomentKind;
  categoryCode?: MomentCategoryCode;
  note?: string | null;
  occurredAt?: Date;
  scoreImpact?: number;
  scoringVersion?: string;
};

export type MomentRepository = {
  create(input: MomentCreateInput): Promise<{ moment: MomentRecord; created: boolean }>;
  findByIdForProfile(relationshipId: string, momentId: string): Promise<MomentRecord | null>;
  list(params: MomentListParams): Promise<MomentListResult>;
  /** All moments for a profile (balance aggregation). Ordered by occurredAt ascending. */
  listAllForProfile(relationshipId: string): Promise<MomentRecord[]>;
  listAllForProfiles(relationshipIds: string[]): Promise<MomentRecord[]>;
  deleteAllForProfiles(relationshipIds: string[]): Promise<number>;
  update(
    relationshipId: string,
    momentId: string,
    patch: MomentUpdatePatch,
  ): Promise<MomentRecord | null>;
  delete(relationshipId: string, momentId: string): Promise<boolean>;
};

/** Logical create payload fingerprint (excludes score fields and server clock). */
export function momentPayloadFingerprint(input: {
  kind: MomentKind;
  categoryCode: MomentCategoryCode;
  note: string | null;
  clientOccurredAt: string | null;
}): string {
  const material = [
    input.kind,
    input.categoryCode,
    input.note ?? "",
    input.clientOccurredAt ?? "",
  ].join("|");
  return createHash("sha256").update(material, "utf8").digest("hex");
}

export function toMomentResponse(moment: MomentRecord): MomentResponse {
  return {
    id: moment.id,
    kind: moment.kind,
    categoryCode: moment.categoryCode,
    note: moment.note,
    occurredAt: moment.occurredAt.toISOString(),
    scoreImpact: moment.scoreImpact,
    scoringVersion: moment.scoringVersion,
    createdAt: moment.createdAt.toISOString(),
    updatedAt: moment.updatedAt.toISOString(),
  };
}

export function encodeMomentCursor(occurredAt: Date, id: string): string {
  return Buffer.from(`${occurredAt.toISOString()}|${id}`, "utf8").toString("base64url");
}

export function decodeMomentCursor(cursor: string): { occurredAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const [iso, id] = raw.split("|");
    if (!iso || !id) {
      throw new Error("invalid");
    }
    const occurredAt = new Date(iso);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new Error("invalid");
    }
    return { occurredAt, id };
  } catch {
    throw new Error("INVALID_CURSOR");
  }
}

export type { CreateMomentRequest, MomentListQuery, UpdateMomentRequest };
