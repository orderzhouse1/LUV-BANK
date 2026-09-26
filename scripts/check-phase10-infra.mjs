import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

function loadEnv(file) {
  const full = path.join(root, file);
  if (!existsSync(full)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = { ...loadEnv(".env.example"), ...loadEnv(".env") };

const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CSRF_SECRET",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "API_PUBLIC_URL",
  "CORS_ORIGINS",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_API_URL",
];

const runtimeWanted = {
  PERSISTENCE_DRIVER: "prisma",
  ACTIVE_SCORING_POLICY: "MVP_EQUAL_WEIGHT_V1",
  ACTIVE_INSIGHT_RULESET: "DESCRIPTIVE_INSIGHTS_V1",
  ACTIVE_NUDGE_RULESET: "GENTLE_NUDGES_V1",
  ACTIVE_SHARE_SNAPSHOT_VERSION: "PRIVATE_SHARE_SNAPSHOT_V1",
};

/**
 * @param {string} name
 * @param {string | undefined} value
 */
function isPlaceholder(name, value) {
  if (value == null || value === "") return true;
  const v = value.toLowerCase();
  const needles = [
    "replace_with",
    "user:password",
    "password@host",
    "@host/",
    "changeme",
    "placeholder",
    "xxxx",
    "todo",
  ];
  if (needles.some((n) => v.includes(n))) return true;
  if (name.includes("SECRET") && (v.includes("replace") || value.length < 32)) return true;
  if (
    (name === "DATABASE_URL" || name === "DIRECT_URL") &&
    (!v.startsWith("postgres") || v.includes("user:password") || v.includes("@host/"))
  ) {
    return true;
  }
  return false;
}

/**
 * @param {string} value
 */
function maskUrl(value) {
  try {
    const u = new URL(value);
    const labels = u.hostname.split(".");
    const hostMasked = labels
      .map((part, idx) => (idx === 0 && part.length > 2 ? `${part.slice(0, 2)}***` : part))
      .join(".");
    return {
      protocol: u.protocol.replace(":", ""),
      hostMasked,
      databaseNamePresent: u.pathname.replace(/^\//, "").length > 0,
      hasQuery: Boolean(u.search),
      looksPooled: /pooler|pgbouncer/i.test(`${u.hostname}${u.search}`),
    };
  } catch {
    return { invalid: true };
  }
}

const missing = [];
const requiredReport = required.map((name) => {
  const value = env[name];
  const present = value != null && value !== "";
  const placeholder = isPlaceholder(name, value);
  /** @type {Record<string, unknown>} */
  const row = { name, present, placeholder };
  if ((name === "DATABASE_URL" || name === "DIRECT_URL") && present && !placeholder) {
    Object.assign(row, maskUrl(value));
  }
  if (!present || placeholder) missing.push(name);
  return row;
});

const runtime = Object.fromEntries(
  Object.entries(runtimeWanted).map(([key, want]) => [
    key,
    {
      present: env[key] != null && env[key] !== "",
      matchesWanted: (env[key] ?? null) === want,
      // Never print secret-like values; these runtime keys are non-secret enums.
      value: env[key] ?? null,
    },
  ]),
);

console.log(
  JSON.stringify(
    {
      envFilePresent: existsSync(path.join(root, ".env")),
      required: requiredReport,
      runtime,
      missingOrPlaceholder: missing,
      blocked: missing.length > 0,
    },
    null,
    2,
  ),
);
