import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { firebaseMessagingSw } from './vite-plugin-firebase-sw';

export default defineConfig(async () => {
  const reactPlugin = (await import('@vitejs/plugin-react')).default;
  const { VitePWA } = await import('vite-plugin-pwa');
  
  // Lấy version từ package.json
  let appVersion = '1.0.1';
  try {
    const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
    appVersion = packageJson.version || '1.0.1';
  } catch (error) {
    console.warn('Could not read package.json, using default version');
  }

  // Plugin để inject version vào swV2.js
  const injectVersionPlugin = {
    name: 'inject-version-to-sw',
    writeBundle() {
      try {
        const swPath = resolve(process.cwd(), 'public', 'swV2.js');
        let swContent = readFileSync(swPath, 'utf-8');
        
        // Replace APP_VERSION placeholder
        swContent = swContent.replace(
          /const APP_VERSION = ['"][^'"]*['"]/,
          `const APP_VERSION = '${appVersion}'`
        );
        
        writeFileSync(swPath, swContent, 'utf-8');
        console.log(`✅ Injected version ${appVersion} into swV2.js`);
      } catch (error) {
        console.warn('⚠️ Could not inject version into swV2.js:', error);
      }
    }
  };

  return {
    plugins: [
      reactPlugin(),
      
      // Plugin tự động tạo firebase-messaging-sw.js
      firebaseMessagingSw({
        envPrefix: 'VITE_',
      }),
      
      // Plugin inject version vào SW
      injectVersionPlugin,
      
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'DrunkSmasherS',
          short_name: 'DrunkSmasherS',
          description: 'Ứng dụng quản lý lịch đánh cầu lông',
          theme_color: '#4caf50',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'masked-icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                }
              }
            },
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firestore-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 1 day
                }
              }
            }
          ]
        }
      })
    ],
    
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5173',
          changeOrigin: true
        },
        '/published': {
          target: 'http://localhost:5173',
          changeOrigin: true
        }
      }
    },
    
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
    
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material', '@mui/x-data-grid'],
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/messaging']
          }
        }
      }
    }
  };
});