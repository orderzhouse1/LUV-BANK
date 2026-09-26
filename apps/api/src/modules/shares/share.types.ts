import type {
  PrivateShareSnapshotPayload,
  ShareScopeCode,
  ShareWindow,
} from "@luv-bank/validation";

export type ShareSnapshotRecord = {
  id: string;
  relationshipId: string;
  createdById: string;
  scope: ShareScopeCode;
  window: ShareWindow;
  snapshotVersion: string;
  payload: PrivateShareSnapshotPayload;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShareSnapshotCreateInput = {
  relationshipId: string;
  createdById: string;
  scope: ShareScopeCode;
  window: ShareWindow;
  snapshotVersion: string;
  payload: PrivateShareSnapshotPayload;
  tokenHash: string;
  expiresAt: Date;
};

export type ShareSnapshotRepository = {
  create(input: ShareSnapshotCreateInput): Promise<ShareSnapshotRecord>;
  listByRelationshipId(relationshipId: string): Promise<ShareSnapshotRecord[]>;
  listByRelationshipIds(relationshipIds: string[]): Promise<ShareSnapshotRecord[]>;
  findByIdForRelationship(id: string, relationshipId: string): Promise<ShareSnapshotRecord | null>;
  findByIdForProfiles(id: string, relationshipIds: string[]): Promise<ShareSnapshotRecord | null>;
  findByTokenHash(tokenHash: string): Promise<ShareSnapshotRecord | null>;
  revoke(id: string, relationshipId: string, revokedAt: Date): Promise<ShareSnapshotRecord | null>;
  revokeAllActiveForProfiles(relationshipIds: string[], revokedAt: Date): Promise<number>;
  hardDelete(id: string, relationshipIds: string[]): Promise<boolean>;
  deleteAllForProfiles(relationshipIds: string[]): Promise<number>;
};
