/**
 * Phase 10 Neon safety preflight — structural facts only, no row contents, no secrets.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function findRepoRoot(start = process.cwd()) {
  let current = path.resolve(start);
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start);
}

const root = findRepoRoot();

function loadEnv() {
  /** @type {Record<string, string>} */
  const env = {};
  for (const file of [".env.example", ".env"]) {
    const full = path.join(root, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  }
  return env;
}

/**
 * @param {string} value
 */
function summarizeUrl(value) {
  const u = new URL(value);
  const host = u.hostname;
  const first = host.split(".")[0] ?? host;
  return {
    hostKind: /pooler/i.test(host) ? "pooled-looking" : "direct-looking",
    hostPrefix: first.slice(0, 3) + "***",
    databaseName: u.pathname.replace(/^\//, "") || null,
    queryKeys: [...u.searchParams.keys()],
  };
}

/**
 * @param {string} name
 */
function looksProductionName(name) {
  if (!name) return false;
  return /\b(prod|production|live|main-prod)\b/i.test(name);
}

async function main() {
  const env = loadEnv();
  const databaseUrl = env.DIRECT_URL || env.DATABASE_URL;
  if (!databaseUrl) {
    console.log(JSON.stringify({ ok: false, reason: "missing_database_url" }, null, 2));
    process.exit(2);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: ["error"],
  });

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT
        current_database() AS database_name,
        current_user AS db_user,
        inet_server_addr()::text AS server_addr,
        version() AS server_version`,
    );
    const info = Array.isArray(rows) ? rows[0] : rows;

    let branchSetting = null;
    try {
      const branchRows = await prisma.$queryRawUnsafe(
        `SELECT current_setting('neon.branch_id', true) AS branch_id,
                current_setting('neon.tenant_id', true) AS tenant_id`,
      );
      branchSetting = Array.isArray(branchRows) ? branchRows[0] : branchRows;
    } catch {
      branchSetting = { unavailable: true };
    }

    const migrationTable = await prisma.$queryRawUnsafe(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
       ) AS present`,
    );

    const tables = await prisma.$queryRawUnsafe(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`,
    );

    const tableNames = (tables || []).map((t) => t.table_name);

    let migrationCount = 0;
    if (migrationTable?.[0]?.present) {
      const countRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS count FROM "_prisma_migrations"`,
      );
      migrationCount = countRows?.[0]?.count ?? 0;
    }

    const databaseName = String(info.database_name ?? "");
    const branchHints = [
      env.NEON_BRANCH,
      env.DATABASE_BRANCH,
      env.BRANCH_NAME,
      databaseName,
    ].filter(Boolean);

    const productionSuspicion = branchHints.some((h) => looksProductionName(String(h)));

    console.log(
      JSON.stringify(
        {
          ok: true,
          urls: {
            database: summarizeUrl(env.DATABASE_URL),
            direct: summarizeUrl(env.DIRECT_URL),
          },
          connection: {
            databaseName,
            dbUserPresent: Boolean(info.db_user),
            serverVersionFamily: String(info.server_version || "").split(",")[0],
            neonSettings: branchSetting,
          },
          schema: {
            prismaMigrationsTablePresent: Boolean(migrationTable?.[0]?.present),
            migrationRowCount: migrationCount,
            publicTables: tableNames,
            publicTableCount: tableNames.length,
          },
          safety: {
            productionNameSuspicion: productionSuspicion,
            emptyPublicSchema: tableNames.length === 0,
            readyForBaselineMigration:
              !productionSuspicion &&
              (tableNames.length === 0 ||
                (tableNames.length === 1 && tableNames[0] === "_prisma_migrations")),
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.log(
    JSON.stringify(
      {
        ok: false,
        reason: "preflight_failed",
        errorName: error?.name ?? "Error",
        errorCode: error?.code ?? null,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
