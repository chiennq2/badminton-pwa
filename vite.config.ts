import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { firebaseMessagingSw } from './vite-plugin-firebase-sw';

export default defineConfig(async ({ mode }) => {
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

  const isDev = mode === 'development';
  console.log(`🔧 Building for ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);

  return {
    plugins: [
      reactPlugin(),
      
      // Plugin tự động tạo firebase-messaging-sw.js
      firebaseMessagingSw({
        envPrefix: 'VITE_',
      }),
      
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        
        // Chỉ inject register script trong production
        injectRegister: false, // Tắt auto-inject, tự đăng ký trong App.tsx
        
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
          
          // Không cache service worker files
          navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js$/],
          
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
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
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'googleapis-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 1 day
                }
              }
            }
          ]
        },

        // Development settings
        devOptions: {
          enabled: true, // Bật PWA trong dev mode
          type: 'module',
          navigateFallback: 'index.html',
        }
      })
    ],
    
    server: {
      port: 5173,
      host: true, // Cho phép truy cập từ network
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