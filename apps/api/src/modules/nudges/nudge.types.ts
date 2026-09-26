import type { NudgeCode } from "@luv-bank/validation";

export type NudgeSuppressionRecord = {
  id: string;
  relationshipId: string;
  nudgeCode: NudgeCode;
  suppressedUntil: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type NudgeSuppressionRepository = {
  findActive(
    relationshipId: string,
    nudgeCode: NudgeCode,
    now: Date,
  ): Promise<NudgeSuppressionRecord | null>;
  upsert(input: {
    relationshipId: string;
    nudgeCode: NudgeCode;
    suppressedUntil: Date;
  }): Promise<NudgeSuppressionRecord>;
  listByRelationshipIds(relationshipIds: string[]): Promise<NudgeSuppressionRecord[]>;
  deleteAllForProfiles(relationshipIds: string[]): Promise<number>;
};
