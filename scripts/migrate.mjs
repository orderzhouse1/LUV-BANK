#!/usr/bin/env node
/**
 * Explicit one-shot Prisma migration helper.
 * Does not print connection strings or secrets.
 *
 * Usage (from repo root, with DIRECT_URL in env):
 *   node scripts/migrate.mjs status
 *   node scripts/migrate.mjs deploy
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = path.join(root, "packages/database/prisma/schema.prisma");

const command = process.argv[2];
if (command !== "status" && command !== "deploy") {
  console.error("Usage: node scripts/migrate.mjs <status|deploy>");
  process.exit(2);
}

if (!existsSync(schema)) {
  console.error("Prisma schema missing.");
  process.exit(2);
}

const directUrl = process.env.DIRECT_URL?.trim();
if (!directUrl) {
  console.error("Migration blocked: DIRECT_URL is missing.");
  process.exit(2);
}
if (/REPLACE|CHANGE_ME|YOUR_SECRET/i.test(directUrl)) {
  console.error("Migration blocked: DIRECT_URL looks like a placeholder.");
  process.exit(2);
}

const args =
  command === "status"
    ? ["exec", "prisma", "migrate", "status", "--schema", schema]
    : ["exec", "prisma", "migrate", "deploy", "--schema", schema];

const result = spawnSync("pnpm", ["--filter", "@luv-bank/database", ...args], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
