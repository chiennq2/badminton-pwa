// vite-plugin-firebase-sw.ts (fixed version)
import type { Plugin } from 'vite';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { config } from 'dotenv';

interface FirebaseSwPluginOptions {
  envPrefix?: string;
}

export function firebaseMessagingSw(options: FirebaseSwPluginOptions = {}): Plugin {
  const { envPrefix = 'VITE_' } = options;
  let isGenerated = false;
  let env: NodeJS.ProcessEnv;

  const loadEnv = () => {
    if (process.env.NODE_ENV !== 'production') {
      try {
        config();
        console.log('✅ .env loaded');
      } catch (_) {}
    }
    env = process.env;
  };

  const generateSW = (force = false) => {
    if (isGenerated && !force) return;
    loadEnv();

    const required = [
      `${envPrefix}FIREBASE_API_KEY`,
      `${envPrefix}FIREBASE_AUTH_DOMAIN`,
      `${envPrefix}FIREBASE_PROJECT_ID`,
      `${envPrefix}FIREBASE_STORAGE_BUCKET`,
      `${envPrefix}FIREBASE_MESSAGING_SENDER_ID`,
      `${envPrefix}FIREBASE_APP_ID`,
    ];

    if (required.some(v => !env[v])) {
      console.warn('⚠ Missing Firebase env vars, skip SW gen');
      return;
    }

    const swContent = `// firebase-messaging-sw.js
self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "${env[`${envPrefix}FIREBASE_API_KEY`]}",
  authDomain: "${env[`${envPrefix}FIREBASE_AUTH_DOMAIN`]}",
  projectId: "${env[`${envPrefix}FIREBASE_PROJECT_ID`]}",
  storageBucket: "${env[`${envPrefix}FIREBASE_STORAGE_BUCKET`]}",
  messagingSenderId: "${env[`${envPrefix}FIREBASE_MESSAGING_SENDER_ID`]}",
  appId: "${env[`${envPrefix}FIREBASE_APP_ID`]}",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'Thông báo mới';
  const opts = {
    body: payload?.notification?.body || '',
    icon: payload?.notification?.icon || '/favicon.ico',
    data: { url: payload?.data?.url || '/' }
  };
  self.registration.showNotification(title, opts);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(win => {
        for (const client of win) {
          if ('focus' in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});`;

    const out = resolve(process.cwd(), 'public/firebase-messaging-sw.js');
    const dir = dirname(out);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(out, swContent);
    isGenerated = true;
    console.log('✅ SW generated');
  };

  return {
    name: 'vite-plugin-firebase-messaging-sw',
    buildStart() { generateSW(); },
    configResolved() { if (!isGenerated) generateSW(); },
    configureServer(server) {
      generateSW();
      const envPath = resolve(process.cwd(), '.env');
      if (existsSync(envPath)) {
        server.watcher.add(envPath);
        server.watcher.on('change', f => {
          if (f === envPath) {
            isGenerated = false;
            generateSW(true);
          }
        });
      }
    },
    closeBundle() { if (!isGenerated) generateSW(true); }
  };
}
export default firebaseMessagingSw;
