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

// ===== INDEXEDDB - LƯU THÔNG BÁO ĐỂ XEM LẠI =====
function openNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NotificationsDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        const objectStore = db.createObjectStore('notifications', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('read', 'read', { unique: false });
        objectStore.createIndex('notificationId', 'notificationId', { unique: false });
      }
    };
  });
}

function saveNotificationToIndexedDB(notification) {
  openNotificationDB()
    .then(db => {
      const transaction = db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      store.add(notification);
      console.log('[SW] Notification saved to IndexedDB');
    })
    .catch(error => {
      console.error('[SW] Error saving notification to IndexedDB:', error);
    });
}

function markNotificationAsRead(notificationId) {
  openNotificationDB()
    .then(db => {
      const transaction = db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const index = store.index('notificationId');
      const request = index.openCursor(IDBKeyRange.only(notificationId));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const notification = cursor.value;
          notification.read = true;
          notification.readAt = new Date().toISOString();
          cursor.update(notification);
          console.log('[SW] Notification marked as read:', notificationId);
        }
      };
    })
    .catch(error => {
      console.error('[SW] Error marking notification as read:', error);
    });
}

// ===== XỬ LÝ THÔNG BÁO NỀN (OFFLINE/ONLINE) =====
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  // Lấy dữ liệu từ payload
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Thông báo mới';
  const notificationBody = payload.notification?.body || payload.data?.body || '';
  const notificationImage = payload.notification?.image || payload.data?.imageUrl;
  const clickAction = payload.data?.clickAction || payload.fcmOptions?.link || '/';
  const notificationId = payload.data?.notificationId || `notif_${Date.now()}`;

  const notificationOptions = {
    body: notificationBody,
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/pwa-192x192.png',
    image: notificationImage,
    tag: notificationId,
    requireInteraction: true, // ✅ Không tự động đóng
    renotify: true, // ✅ Rung lại nếu cùng tag
    vibrate: [200, 100, 200],
    timestamp: payload.data?.timestamp ? new Date(payload.data.timestamp).getTime() : Date.now(),
    data: {
      url: clickAction,
      notificationId: notificationId,
      dateOfArrival: Date.now(),
      ...payload.data,
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
  };

  // ✅ Lưu notification vào IndexedDB
  saveNotificationToIndexedDB({
    notificationId: notificationId,
    title: notificationTitle,
    body: notificationBody,
    image: notificationImage,
    timestamp: new Date().toISOString(),
    read: false,
    data: payload.data || {},
  });

  // Hiển thị notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ===== XỬ LÝ PUSH EVENT (FALLBACK) =====
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('[SW] Push payload:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Thông báo mới';
    const notificationBody = payload.notification?.body || payload.data?.body || '';
    const notificationImage = payload.notification?.image || payload.data?.imageUrl;
    const notificationId = payload.data?.notificationId || `notif_${Date.now()}`;
    const clickAction = payload.data?.clickAction || '/';

    const notificationOptions = {
      body: notificationBody,
      icon: payload.notification?.icon || '/favicon.ico',
      badge: '/pwa-192x192.png',
      image: notificationImage,
      vibrate: [200, 100, 200],
      tag: notificationId,
      requireInteraction: true,
      renotify: true,
      timestamp: Date.now(),
      data: {
        url: clickAction,
        notificationId: notificationId,
        ...payload.data,
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
    };

    // Lưu vào IndexedDB
    saveNotificationToIndexedDB({
      notificationId: notificationId,
      title: notificationTitle,
      body: notificationBody,
      image: notificationImage,
      timestamp: new Date().toISOString(),
      read: false,
      data: payload.data || {},
    });

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }
});

// ===== XỬ LÝ CLICK VÀO THÔNG BÁO =====
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event);
  
  const notificationId = event.notification.data?.notificationId || event.notification.tag;
  
  // Đánh dấu đã đọc
  markNotificationAsRead(notificationId);
  
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
        // Tìm tab đang mở app
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);
          
          if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
            // Gửi message cho app để navigate
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: urlToOpen,
              notificationId: notificationId,
              data: event.notification.data,
            });
            
            // Navigate nếu khác path
            if (clientUrl.pathname !== targetUrl.pathname) {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
        
        // Không có tab nào đang mở, mở tab mới
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// ===== XỬ LÝ ĐÓNG THÔNG BÁO =====
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
  
  const notificationId = event.notification.data?.notificationId || event.notification.tag;
  
  // Đánh dấu đã đọc khi đóng
  markNotificationAsRead(notificationId);
});

// ===== SYNC API - ĐỒng BỘ KHI ONLINE LẠI (OPTIONAL) =====
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncPendingNotifications());
  }
});

async function syncPendingNotifications() {
  try {
    console.log('[SW] Syncing pending notifications...');
    
    // Có thể gọi API để lấy các thông báo bị miss khi offline
    // Ví dụ:
    // const response = await fetch('/api/notifications/pending', {
    //   headers: {
    //     'Authorization': 'Bearer ' + token
    //   }
    // });
    // const notifications = await response.json();
    // 
    // notifications.forEach(notif => {
    //   self.registration.showNotification(notif.title, {
    //     body: notif.body,
    //     ...
    //   });
    // });
    
    console.log('[SW] Sync completed');
  } catch (error) {
    console.error('[SW] Sync error:', error);
    throw error; // Retry sync
  }
}

// ===== INSTALL & ACTIVATE =====
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting(); // Activate ngay lập tức
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(
    clients.claim().then(() => {
      console.log('[SW] Service Worker now controls all clients');
    })
  );
});

// ===== HELPER - XÓA NOTIFICATION CŨ (CHẠY MỖI 24H) =====
async function cleanOldNotifications() {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    const index = store.index('timestamp');
    
    // Xóa notification > 30 ngày
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const request = index.openCursor(IDBKeyRange.upperBound(thirtyDaysAgo.toISOString()));
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    console.log('[SW] Old notifications cleaned');
  } catch (error) {
    console.error('[SW] Error cleaning notifications:', error);
  }
}

// Chạy cleanup mỗi 24 giờ
setInterval(() => {
  cleanOldNotifications();
}, 24 * 60 * 60 * 1000);
`;

// Ghi file
const outputPath = join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
writeFileSync(outputPath, swContent, 'utf-8');
console.log('[SW] Firebase Messaging Service Worker loaded with offline support ✅');
console.log('[SW] Features: TTL 28 days, IndexedDB storage, Background sync');
console.log('✅ firebase-messaging-sw.js generated successfully!');
console.log(`📁 Location: ${outputPath}`);