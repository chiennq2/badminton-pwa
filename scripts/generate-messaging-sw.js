// scripts/generate-messaging-sw.js
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Đọc .env file
const envPath = join(__dirname, '..', '.env');
let envVars = {};

try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/['"]/g, '');
    }
  });
} catch (error) {
  console.error('Error reading .env file:', error);
  process.exit(1);
}

// Tạo firebase-messaging-sw.js
const swContent = `// public/firebase-messaging-sw.js
// This file is auto-generated. Do not edit manually.
// Generated at: ${new Date().toISOString()}

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase Configuration
const firebaseConfig = {
  apiKey: "${envVars.VITE_FIREBASE_API_KEY}",
  authDomain: "${envVars.VITE_FIREBASE_AUTH_DOMAIN}",
  projectId: "${envVars.VITE_FIREBASE_PROJECT_ID}",
  storageBucket: "${envVars.VITE_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${envVars.VITE_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${envVars.VITE_FIREBASE_APP_ID}"
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
`;

// Ghi file
const outputPath = join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
writeFileSync(outputPath, swContent, 'utf-8');

console.log('✅ firebase-messaging-sw.js generated successfully!');
console.log(`📁 Location: ${outputPath}`);