const CACHE_NAME = 'historia-v1';
const STATIC_CACHE = 'historia-static-v1';
const TILE_CACHE = 'historia-tiles-v1';
const API_CACHE = 'historia-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

const TILE_URL_PATTERN = /^https:\/\/[abc]\.tile\.openstreetmap\.org\//;
const MAX_TILE_CACHE_SIZE = 1000;

const API_TTL = 5 * 60 * 1000;

const CACHEABLE_API_ENDPOINTS = [
  '/api/events',
  '/api/tags',
  '/api/date-templates',
  '/api/date-template-groups',
  '/api/lenses'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('historia-') && 
                     name !== STATIC_CACHE && 
                     name !== TILE_CACHE &&
                     name !== API_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (TILE_URL_PATTERN.test(event.request.url)) {
    event.respondWith(handleTileRequest(event.request));
    return;
  }
  
  if (event.request.method !== 'GET') {
    return;
  }
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request, url));
    return;
  }
  
  event.respondWith(handleStaticRequest(event.request));
});

async function handleStaticRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

function is_cacheable_endpoint(pathname) {
  return CACHEABLE_API_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));
}

async function handleApiRequest(request, url) {
  const cache = await caches.open(API_CACHE);
  const cacheKey = request.url;
  
  if (!is_cacheable_endpoint(url.pathname)) {
    try {
      return await fetch(request);
    } catch (error) {
      return create_offline_response();
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      const body = await responseToCache.text();
      const cachedResponse = new Response(body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(cacheKey, cachedResponse);
      console.log('[SW] Cached API response:', url.pathname);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, checking cache for:', url.pathname);
    
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      const cachedAt = parseInt(cachedResponse.headers.get('sw-cached-at') || '0');
      const age = Date.now() - cachedAt;
      const ageMinutes = Math.round(age / 60000);
      
      console.log(`[SW] Serving cached data (${ageMinutes} min old):`, url.pathname);
      
      const headers = new Headers(cachedResponse.headers);
      headers.set('sw-from-cache', 'true');
      headers.set('sw-cache-age', age.toString());
      
      const body = await cachedResponse.text();
      return new Response(body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    return create_offline_response();
  }
}

function create_offline_response() {
  return new Response(
    JSON.stringify({ 
      error: 'Offline', 
      message: 'Network unavailable and no cached data',
      offline: true
    }),
    { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

async function revalidate_if_stale(request, cachedAt, cache) {
  const age = Date.now() - cachedAt;
  
  if (age > API_TTL) {
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        const headers = new Headers(networkResponse.headers);
        headers.set('sw-cached-at', Date.now().toString());
        
        const body = await networkResponse.text();
        const cachedResponse = new Response(body, {
          status: networkResponse.status,
          statusText: networkResponse.statusText,
          headers: headers
        });
        
        cache.put(request.url, cachedResponse);
        console.log('[SW] Background revalidated:', new URL(request.url).pathname);
      }
    } catch (error) {
    }
  }
}

async function handleTileRequest(request) {
  const cache = await caches.open(TILE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    fetchAndCacheTile(request, cache);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      trimTileCache(cache);
    }
    
    return networkResponse;
  } catch (error) {
    return new Response('', { status: 408, statusText: 'Tile unavailable offline' });
  }
}

async function fetchAndCacheTile(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
  }
}

async function trimTileCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_TILE_CACHE_SIZE) {
    const deleteCount = keys.length - MAX_TILE_CACHE_SIZE;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE).then(() => {
      console.log('[SW] API cache cleared');
    });
  }
});
