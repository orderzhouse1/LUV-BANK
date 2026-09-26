import { PrismaClient } from "@prisma/client";

/**
 * Prisma client wrapper.
 *
 * Creating or importing this module does not prove Neon connectivity.
 * Do not run queries in Phase 0 without a real DATABASE_URL.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient(process.env.DATABASE_URL);
  }
  return globalForPrisma.prisma;
}

/** Lazy singleton — safe to import without implying a live database session. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { PrismaClient };
export type * from "@prisma/client";
