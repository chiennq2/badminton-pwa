const CACHE_NAME = 'badminton-pwa-v1';

// Only cache files that definitely exist
const STATIC_CACHE_URLS = [
  '/',
];

// Install event - with error handling
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        // Cache each URL individually to handle failures gracefully
        return Promise.allSettled(
          STATIC_CACHE_URLS.map((url) => {
            return cache.add(url).catch((error) => {
              console.warn(`Failed to cache ${url}:`, error);
              return Promise.resolve(); // Continue even if one fails
            });
          })
        );
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
        // Still skip waiting to activate the service worker
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('firestore') ||
      event.request.url.includes('firebase')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch((error) => {
              console.warn('Failed to cache API response:', error);
            });
          return response;
        })
        .catch((error) => {
          console.log('Network request failed, trying cache:', error);
          // Fallback to cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn('Failed to cache resource:', error);
              });
            
            return response;
          })
          .catch((error) => {
            console.warn('Fetch failed:', error);
            // Return a basic offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(
      syncOfflineData().catch((error) => {
        console.error('Background sync failed:', error);
      })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'Có thông báo mới từ ứng dụng cầu lông',
    icon: '/favicon.ico', // Use favicon instead of missing icons
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Quản Lý Cầu Lông', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sync offline data function
async function syncOfflineData() {
  try {
    console.log('Syncing offline data...');
    
    const offlineData = await getOfflineData();
    if (offlineData && offlineData.length > 0) {
      await syncWithFirestore(offlineData);
      await clearOfflineData();
    }
    
    console.log('Offline data synced successfully');
  } catch (error) {
    console.error('Error syncing offline data:', error);
    throw error; // Re-throw to handle in sync event
  }
}

// Helper functions for offline data management
async function getOfflineData() {
  // Implementation would use IndexedDB to get offline changes
  return [];
}

async function syncWithFirestore(data) {
  // Implementation would sync data with Firestore
  console.log('Syncing data:', data);
}

async function clearOfflineData() {
  // Implementation would clear synced offline data
  console.log('Clearing offline data');
}