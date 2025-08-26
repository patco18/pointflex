// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { api } from './services/api'; // Assuming your API service is set up to send the token

// Configuration fictive pour le développement en cas de problème de configuration
const defaultConfig = {
  apiKey: "AIzaSyFake-key-for-development-only",
  authDomain: "fake-app.firebaseapp.com",
  projectId: "fake-app",
  storageBucket: "fake-app.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
  measurementId: "G-00000000"
};

// Firebase project configuration pulled from environment variables
// See: https://firebase.google.com/docs/web/setup#available-libraries
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultConfig.measurementId
};

// VAPID key from Firebase Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let app: FirebaseApp | null = null;

const validateFirebaseConfig = (): boolean => {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => value === undefined || value === "")
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    missingKeys.forEach((key) => {
      console.warn(`Firebase config missing value for ${key}`);
    });

    // Temporairement commenté pour éviter le blocage du chargement de la page
    // if (import.meta.env.DEV) {
    //   throw new Error(`Missing Firebase config values: ${missingKeys.join(', ')}`);
    // }

    return true; // Retourner true pour permettre l'initialisation même avec des valeurs manquantes
  }

  return true;
};

export const initializeFirebaseApp = () => {
  if (app) return app;
  
  try {
    // Tentative d'initialisation même avec configuration incomplète
    console.warn("Tentative d'initialisation de Firebase...");
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    return app;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return null;
  }
};

export const requestNotificationPermission = async () => {
  const currentApp = initializeFirebaseApp();
  if (!currentApp) {
    console.error("Firebase app not initialized for permission request.");
    return null;
  }
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    alert('This browser does not support desktop notification');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      return getFCMToken();
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while requesting notification permission: ', error);
    return null;
  }
};

const getFCMToken = async () => {
  const currentApp = initializeFirebaseApp();
   if (!currentApp) {
    console.error("Firebase app not initialized for getting token.");
    return null;
  }
  const messaging = getMessaging(currentApp);
  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      // Send this token to your server
      await sendTokenToServer(currentToken);
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

const sendTokenToServer = async (token: string) => {
  try {
    // Using a generic endpoint, replace if you created a specific one in adminService or similar
    await api.post('/push/subscribe', { token: token, device_type: 'web' });
    console.log('Token sent to server successfully.');
  } catch (error) {
    console.error('Error sending token to server: ', error);
  }
};

// Handle foreground messages
export const onForegroundMessage = (callback: (payload: MessagePayload) => void) => {
  const currentApp = initializeFirebaseApp();
  if (!currentApp) {
    console.error("Firebase app not initialized for foreground message handling.");
    return () => {}; // Return an empty unsubscribe function
  }
  const messaging = getMessaging(currentApp);
  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground. ', payload);
    callback(payload);
    // Customize notification handling here (e.g., show a toast)
    // Example: toast(payload.notification?.title || 'New Message');
  });
};

export const listenToTokenRefresh = async () => {
  const currentApp = initializeFirebaseApp();
  if (!currentApp) {
    console.error("Firebase app not initialized for token refresh handling.");
    return;
  }
  if (!('serviceWorker' in navigator)) {
    console.error('Service workers are not supported in this browser.');
    return;
  }
  try {
    // Ensure messaging is initialized so the service worker subscription is active
    getMessaging(currentApp);
    const registration = await navigator.serviceWorker.ready;
    registration.addEventListener('pushsubscriptionchange', () => {
      getFCMToken();
    });
  } catch (error) {
    console.error('Failed to attach token refresh listener:', error);
  }
};

initializeFirebaseApp(); // Initialize on load
listenToTokenRefresh();
