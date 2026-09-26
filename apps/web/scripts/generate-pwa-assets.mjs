/**
 * Deterministic Phase 9 PWA asset generation.
 *
 * - Rasterizes public/pwa/mark.svg into install icons
 * - Writes public/sw.js with an injected cache version
 *
 * Interim mark is not claimed as final client-approved branding.
 *
 * Usage: node scripts/generate-pwa-assets.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const pwaDir = path.join(webRoot, "public", "pwa");
const iconsDir = path.join(pwaDir, "icons");

const CACHE_VERSION = process.env.PWA_CACHE_VERSION || "phase-9-v1";

const ICON_SPECS = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-512-maskable.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
  { name: "favicon-32.png", size: 32, maskable: false },
];

function buildServiceWorkerSource(version) {
  return `/* Luv Bank privacy-safe service worker (${version})
 * Allowlisted static caching only. Never caches private app/API data.
 * No push, Background Sync, or mutation replay.
 */
/* eslint-disable no-restricted-globals */
const CACHE_VERSION = ${JSON.stringify(version)};
const STATIC_CACHE = "luv-bank-static-" + CACHE_VERSION;
const OFFLINE_CACHE = "luv-bank-offline-" + CACHE_VERSION;
const MAX_STATIC_ENTRIES = 64;

const OFFLINE_EN = "/pwa/offline-en.html";
const OFFLINE_AR = "/pwa/offline-ar.html";

const PRECACHE_URLS = [
  OFFLINE_EN,
  OFFLINE_AR,
  "/pwa/mark.svg",
  "/pwa/icons/icon-192.png",
  "/pwa/icons/icon-512.png",
  "/pwa/icons/icon-512-maskable.png",
  "/pwa/icons/apple-touch-icon.png",
  "/pwa/icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("luv-bank-") && key !== STATIC_CACHE && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNavigationRequest(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return request.method === "GET" && accept.includes("text/html");
}

function shouldBypass(request, url) {
  if (request.method !== "GET") return true;
  if (!isSameOrigin(url)) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/_next/image")) return true;
  if (url.searchParams.has("_rsc")) return true;
  if (url.pathname.includes("_rsc")) return true;
  if (url.pathname.includes("/public/share-snapshots")) return true;
  return false;
}

function isAllowlistedStatic(url) {
  if (!isSameOrigin(url)) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/pwa/")) return true;
  return false;
}

function isSafeToCache(response) {
  if (!response || response.status !== 200) return false;
  if (response.type !== "basic" && response.type !== "cors" && response.type !== "default") {
    return false;
  }
  const cacheControl = response.headers.get("Cache-Control") || "";
  if (/\\bno-store\\b/i.test(cacheControl) || /\\bprivate\\b/i.test(cacheControl)) return false;
  if (response.headers.has("Set-Cookie")) return false;
  return true;
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const overflow = keys.length - maxEntries;
  for (let i = 0; i < overflow; i += 1) {
    await cache.delete(keys[i]);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isSafeToCache(response)) {
    await cache.put(request, response.clone());
    await trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES);
  }
  return response;
}

async function navigationFallback(url) {
  const offlineUrl = url.pathname.startsWith("/ar/") || url.pathname === "/ar" ? OFFLINE_AR : OFFLINE_EN;
  const cache = await caches.open(OFFLINE_CACHE);
  const cached = await cache.match(offlineUrl);
  if (cached) return cached;
  return Response.redirect(offlineUrl, 302);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (shouldBypass(request, url)) {
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          // Never write navigations / HTML documents into Cache Storage.
          return response;
        } catch {
          return navigationFallback(url);
        }
      })(),
    );
    return;
  }

  if (isAllowlistedStatic(url)) {
    event.respondWith(cacheFirst(request));
  }
});
`;
}

async function rasterizeIcons(svgBuffer) {
  await mkdir(iconsDir, { recursive: true });

  for (const spec of ICON_SPECS) {
    const pipeline = sharp(svgBuffer);
    let image = pipeline;
    if (spec.maskable) {
      // Keep ~20% padding for maskable safe zone.
      const inner = Math.round(spec.size * 0.72);
      const pad = Math.round((spec.size - inner) / 2);
      const resized = await sharp(svgBuffer)
        .resize(inner, inner, { fit: "contain", background: { r: 247, g: 241, b: 243, alpha: 1 } })
        .png()
        .toBuffer();
      image = sharp({
        create: {
          width: spec.size,
          height: spec.size,
          channels: 4,
          background: { r: 247, g: 241, b: 243, alpha: 1 },
        },
      }).composite([{ input: resized, left: pad, top: pad }]);
    } else {
      image = sharp(svgBuffer).resize(spec.size, spec.size, {
        fit: "contain",
        background: { r: 247, g: 241, b: 243, alpha: 1 },
      });
    }

    const outPath = path.join(iconsDir, spec.name);
    await image.png().toFile(outPath);
    console.log(`wrote ${path.relative(webRoot, outPath)}`);
  }
}

async function main() {
  const svgPath = path.join(pwaDir, "mark.svg");
  const svgBuffer = await readFile(svgPath);
  await rasterizeIcons(svgBuffer);

  const swPath = path.join(webRoot, "public", "sw.js");
  await writeFile(swPath, buildServiceWorkerSource(CACHE_VERSION), "utf8");
  console.log(`wrote public/sw.js (cache ${CACHE_VERSION})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
