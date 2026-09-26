import { randomUUID } from "node:crypto";
import type { MomentCategoryCode, MomentKind } from "@luv-bank/validation";
import {
  decodeMomentCursor,
  encodeMomentCursor,
  type MomentListParams,
  type MomentRecord,
  type MomentRepository,
} from "./moment.types";

function compareDesc(a: MomentRecord, b: MomentRecord): number {
  const byTime = b.occurredAt.getTime() - a.occurredAt.getTime();
  if (byTime !== 0) {
    return byTime;
  }
  return b.id.localeCompare(a.id);
}

function compareAsc(a: MomentRecord, b: MomentRecord): number {
  const byTime = a.occurredAt.getTime() - b.occurredAt.getTime();
  if (byTime !== 0) {
    return byTime;
  }
  return a.id.localeCompare(b.id);
}

export function createMemoryMomentRepository(): MomentRepository {
  const moments = new Map<string, MomentRecord>();
  const byMutation = new Map<string, string>();
  const inFlight = new Map<string, Promise<{ moment: MomentRecord; created: boolean }>>();

  function mutationKey(relationshipId: string, clientMutationId: string) {
    return `${relationshipId}:${clientMutationId}`;
  }

  return {
    async create(input) {
      const key = mutationKey(input.relationshipId, input.clientMutationId);
      const existingFlight = inFlight.get(key);
      if (existingFlight) {
        return existingFlight;
      }

      const work = (async () => {
        const existingId = byMutation.get(key);
        if (existingId) {
          const existing = moments.get(existingId);
          if (!existing) {
            throw new Error("IDEMPOTENCY_STATE");
          }
          if (existing.payloadFingerprint !== input.payloadFingerprint) {
            const error = new Error("IDEMPOTENCY_CONFLICT");
            error.name = "IdempotencyConflict";
            throw error;
          }
          // Replay ignores caller's score fields — original scoring is preserved.
          return { moment: existing, created: false };
        }

        const now = new Date();
        const moment: MomentRecord = {
          id: randomUUID(),
          relationshipId: input.relationshipId,
          kind: input.kind,
          categoryCode: input.categoryCode,
          note: input.note,
          occurredAt: input.occurredAt,
          clientMutationId: input.clientMutationId,
          payloadFingerprint: input.payloadFingerprint,
          scoreImpact: input.scoreImpact,
          scoringVersion: input.scoringVersion,
          createdAt: now,
          updatedAt: now,
        };
        moments.set(moment.id, moment);
        byMutation.set(key, moment.id);
        return { moment, created: true };
      })();

      inFlight.set(key, work);
      try {
        return await work;
      } finally {
        inFlight.delete(key);
      }
    },

    async findByIdForProfile(relationshipId, momentId) {
      const moment = moments.get(momentId);
      if (!moment || moment.relationshipId !== relationshipId) {
        return null;
      }
      return moment;
    },

    async list(params: MomentListParams) {
      let items = [...moments.values()].filter((m) => m.relationshipId === params.relationshipId);
      if (params.kind) {
        items = items.filter((m) => m.kind === params.kind);
      }
      if (params.categoryCode) {
        items = items.filter((m) => m.categoryCode === params.categoryCode);
      }
      if (params.from) {
        items = items.filter((m) => m.occurredAt.getTime() >= params.from!.getTime());
      }
      if (params.to) {
        items = items.filter((m) => m.occurredAt.getTime() <= params.to!.getTime());
      }
      items.sort(compareDesc);

      if (params.cursor) {
        const cursor = decodeMomentCursor(params.cursor);
        items = items.filter((m) => {
          const time = m.occurredAt.getTime();
          const cursorTime = cursor.occurredAt.getTime();
          return time < cursorTime || (time === cursorTime && m.id < cursor.id);
        });
      }

      const page = items.slice(0, params.limit);
      const hasMore = items.length > params.limit;
      const last = page[page.length - 1];
      return {
        items: page,
        nextCursor: hasMore && last ? encodeMomentCursor(last.occurredAt, last.id) : null,
      };
    },

    async listAllForProfile(relationshipId) {
      return [...moments.values()]
        .filter((m) => m.relationshipId === relationshipId)
        .sort(compareAsc);
    },

    async listAllForProfiles(relationshipIds) {
      const idSet = new Set(relationshipIds);
      return [...moments.values()].filter((m) => idSet.has(m.relationshipId)).sort(compareAsc);
    },

    async deleteAllForProfiles(relationshipIds) {
      const idSet = new Set(relationshipIds);
      let count = 0;
      for (const [id, moment] of moments) {
        if (idSet.has(moment.relationshipId)) {
          moments.delete(id);
          byMutation.delete(mutationKey(moment.relationshipId, moment.clientMutationId));
          count += 1;
        }
      }
      return count;
    },

    async update(relationshipId, momentId, patch) {
      const existing = moments.get(momentId);
      if (!existing || existing.relationshipId !== relationshipId) {
        return null;
      }
      const next: MomentRecord = {
        ...existing,
        kind: (patch.kind ?? existing.kind) as MomentKind,
        categoryCode: (patch.categoryCode ?? existing.categoryCode) as MomentCategoryCode,
        note: patch.note === undefined ? existing.note : patch.note,
        occurredAt: patch.occurredAt ?? existing.occurredAt,
        scoreImpact: patch.scoreImpact ?? existing.scoreImpact,
        scoringVersion: patch.scoringVersion ?? existing.scoringVersion,
        updatedAt: new Date(),
      };
      moments.set(momentId, next);
      return next;
    },

    async delete(relationshipId, momentId) {
      const existing = moments.get(momentId);
      if (!existing || existing.relationshipId !== relationshipId) {
        return false;
      }
      moments.delete(momentId);
      byMutation.delete(mutationKey(relationshipId, existing.clientMutationId));
      return true;
    },
  };
}
