import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement en fonction du mode (dev, prod)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      {
        name: 'vite-plugin-firebase-sw',
        buildStart() {
          console.log('Processing Firebase Service Worker...');
        },
        writeBundle() {
          // Lire le fichier service worker template
          const swPath = path.resolve(__dirname, 'public', 'firebase-messaging-sw.js');
          if (fs.existsSync(swPath)) {
            let swContent = fs.readFileSync(swPath, 'utf8');
            
            // Remplacer les placeholders par les vraies valeurs
            swContent = swContent
              .replace('REPLACE_AT_BUILD_TIME_API_KEY', env.VITE_FIREBASE_API_KEY || '')
              .replace('REPLACE_AT_BUILD_TIME_AUTH_DOMAIN', env.VITE_FIREBASE_AUTH_DOMAIN || '')
              .replace('REPLACE_AT_BUILD_TIME_PROJECT_ID', env.VITE_FIREBASE_PROJECT_ID || '')
              .replace('REPLACE_AT_BUILD_TIME_STORAGE_BUCKET', env.VITE_FIREBASE_STORAGE_BUCKET || '')
              .replace('REPLACE_AT_BUILD_TIME_MESSAGING_SENDER_ID', env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
              .replace('REPLACE_AT_BUILD_TIME_APP_ID', env.VITE_FIREBASE_APP_ID || '');
            
            // Écrire le service worker modifié dans le dossier dist
            const distSwPath = path.resolve(__dirname, 'dist', 'firebase-messaging-sw.js');
            fs.writeFileSync(distSwPath, swContent);
            console.log('Firebase Service Worker configuration replaced successfully!');
          } else {
            console.warn('Firebase Service Worker template not found');
          }
        }
      }
    ],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/stream': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})