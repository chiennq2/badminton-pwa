const __APP_VERSION__ = `1.0.${new Date().getTime()}`;
const CACHE_NAME = `badminton-pwa-${__APP_VERSION__}`;
const STATIC_CACHE_URLS = [
  '/favicon.ico',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
];

// === INSTALL EVENT ===
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return Promise.allSettled(
          STATIC_CACHE_URLS.map((url) =>
            cache.add(url).catch((error) => {
              console.warn(`[SW] Failed to cache ${url}:`, error);
            })
          )
        );
      })
      .finally(() => self.skipWaiting())
  );
});

// === ACTIVATE EVENT ===
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );

      await self.clients.claim();

      // Gửi message tới các tab đang mở để reload
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        client.postMessage({ type: 'RELOAD_PAGE' });
      }

      console.log('[SW] Activated and all clients updated.');
    })()
  );
});

// === FETCH EVENT ===
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bỏ qua request không cùng origin hoặc chrome-extension
  if (!request.url.startsWith(self.location.origin) ||
      request.url.startsWith('chrome-extension://')) {
    return;
  }

  // 🌐 Network-first cho navigation (index.html)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // 🧩 Network-first cho API / Firestore / Firebase
  if (request.url.includes('/api/') ||
      request.url.includes('firestore') ||
      request.url.includes('firebase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 🧱 Cache-first cho static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        }));
    })
  );
});

// === BACKGROUND SYNC ===
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(syncOfflineData().catch((err) => {
      console.error('[SW] Background sync failed:', err);
    }));
  }
});

// === PUSH NOTIFICATION ===
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  const options = {
    body: event.data ? event.data.text() : 'Có thông báo mới từ ứng dụng cầu lông',
    icon: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: { dateOfArrival: Date.now(), primaryKey: 1 },
  };
  event.waitUntil(
    self.registration.showNotification('Quản Lý Cầu Lông', options)
  );
});

// === NOTIFICATION CLICK ===
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.');
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});

// === SKIP WAITING MESSAGE ===
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received');
    self.skipWaiting();
  }
});

// === OFFLINE SYNC FUNCTIONS ===
async function syncOfflineData() {
  try {
    console.log('[SW] Syncing offline data...');
    const offlineData = await getOfflineData();
    if (offlineData?.length > 0) {
      await syncWithFirestore(offlineData);
      await clearOfflineData();
    }
    console.log('[SW] Offline data synced successfully');
  } catch (err) {
    console.error('[SW] Error syncing offline data:', err);
    throw err;
  }
}

async function getOfflineData() {
  return [];
}
async function syncWithFirestore(data) {
  console.log('[SW] Syncing data:', data);
}
async function clearOfflineData() {
  console.log('[SW] Clearing offline data');
}

// === LOCAL NOTIFICATION (GỬI NỘI BỘ TỪ ADMIN) ===
self.addEventListener('message', (event) => {
  if (event.data?.type === 'LOCAL_NOTIFICATION') {
    const { title, body } = event.data;
    console.log('[SW] Hiển thị thông báo nội bộ:', title, body);

    self.registration.showNotification(title || 'Thông báo từ quản trị viên', {
      body: body || '',
      icon: '/favicon.ico',
      vibrate: [100, 50, 100],
      badge: '/pwa-192x192.png',
      data: { dateOfArrival: Date.now() },
    });
  }
});

