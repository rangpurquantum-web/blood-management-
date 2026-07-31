/// Service Worker for Blood Management System PWA
/// Strategy: Network-first with cache fallback for navigation,
///           Cache-first for static assets

const CACHE_NAME = "blood-management-v1";
const OFFLINE_URL = "/offline";

// Core assets to pre-cache during install
const PRECACHE_ASSETS = ["/manifest.json", OFFLINE_URL];

// Install: pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET, API routes, Next.js internals, and extensions
  if (
    request.method !== "GET" ||
    request.url.includes("/api/") ||
    request.url.includes("/_next/") ||
    request.url.startsWith("chrome-extension://")
  ) {
    return;
  }

  // Navigation requests (HTML pages) — network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // If offline, try cache first, then show offline page
          return caches
            .match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Static assets — network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for basic (same-origin) requests
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: serve from cache
        return caches.match(request);
      })
  );
});
