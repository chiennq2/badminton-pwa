// public/firebase-messaging-sw.js
// This file is auto-generated. Do not edit manually.
// Generated at: 2025-10-30T00:54:17.642Z

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD58M5UTw3dfP5295_4aGPZkYH2aslR7k0",
  authDomain: "bad-host-cf713.firebaseapp.com",
  projectId: "bad-host-cf713",
  storageBucket: "bad-host-cf713.firebasestorage.app",
  messagingSenderId: "92896256453",
  appId: "1:92896256453:web:e354c3d5747a8627852bac"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Thông báo mới';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Mở ứng dụng',
      },
      {
        action: 'close',
        title: 'Đóng',
      }
    ],
    tag: payload.data?.tag || 'notification',
    requireInteraction: false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ 
        type: 'window', 
        includeUncontrolled: true 
      }).then((windowClients) => {
        // Check if app is already open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);
          
          if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
            if (clientUrl.pathname !== targetUrl.pathname) {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Handle push events
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push received:', event);
  
  if (!event.data) {
    console.log('[firebase-messaging-sw.js] Push event has no data');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('[firebase-messaging-sw.js] Push payload:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Thông báo mới';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || '',
      icon: payload.notification?.icon || '/favicon.ico',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      data: payload.data || {},
      tag: payload.data?.tag || 'push-notification',
      requireInteraction: false,
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
  }
});
