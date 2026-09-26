/* Luv Bank privacy-safe service worker (phase-9-v1)
 * Allowlisted static caching only. Never caches private app/API data.
 * No push, Background Sync, or mutation replay.
 */
/* eslint-disable no-restricted-globals */
const CACHE_VERSION = "phase-9-v1";
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
  if (/\bno-store\b/i.test(cacheControl) || /\bprivate\b/i.test(cacheControl)) return false;
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
