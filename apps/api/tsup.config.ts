import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  dts: false,
  // Bundle workspace TypeScript sources; keep native/npm deps external.
  noExternal: ["@luv-bank/config", "@luv-bank/validation", "@luv-bank/database"],
  external: ["@prisma/client", "argon2", "@js-temporal/polyfill"],
});
