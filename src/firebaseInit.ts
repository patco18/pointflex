// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { api } from './services/api'; // Assuming your API service is set up to send the token

// TODO: Replace with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#available-libraries
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// TODO: Replace with your VAPID key from Firebase Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = "YOUR_FIREBASE_WEB_PUSH_VAPID_KEY";

let app: FirebaseApp | null = null;

export const initializeFirebaseApp = () => {
  if (app) return app;
  try {
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

// TODO: Add logic for onTokenRefresh if needed
// import { onTokenRefresh } from "firebase/messaging";
// onTokenRefresh(messaging, () => { getFCMToken(); });

initializeFirebaseApp(); // Initialize on load
