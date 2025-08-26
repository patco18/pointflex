// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, MessagePayload } from "firebase/messaging";
import { api } from './services/api'; // Assuming your API service is set up to send the token

// État de l'initialisation
let isFirebaseInitialized = false;

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
    .filter(([, value]) => value === undefined || value === "" || 
           (typeof value === 'string' && value.includes('fake-')))
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    console.warn(`Firebase configuration incomplète. Manquant: ${missingKeys.join(', ')}`);
    return false; // Configuration invalide
  }

  if (!VAPID_KEY || VAPID_KEY === "") {
    console.warn("VAPID key manquante pour les notifications push.");
    return false; // Configuration invalide
  }

  return true; // Configuration valide
};

export const initializeFirebaseApp = () => {
  if (app) return app;
  
  // Vérifier la validité de la configuration
  const isConfigValid = validateFirebaseConfig();
  
  // Si la configuration n'est pas valide, ne pas initialiser Firebase
  if (!isConfigValid) {
    console.warn("Initialisation de Firebase ignorée - configuration incomplète");
    return null;
  }
  
  try {
    console.log("Initialisation de Firebase...");
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialisé avec succès");
    return app;
  } catch (error) {
    console.error("Erreur lors de l'initialisation de Firebase:", error);
    return null;
  }
};

export const requestNotificationPermission = async () => {
  // Vérifier si les notifications sont supportées
  if (!('Notification' in window)) {
    console.log('Ce navigateur ne prend pas en charge les notifications');
    return null;
  }

  try {
    // Vérifier si la permission est déjà accordée
    if (Notification.permission === 'granted') {
      console.log('Permission de notification déjà accordée.');
      return getFCMToken();
    }
    
    // Demander la permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Permission de notification accordée.');
      return getFCMToken();
    } else {
      console.log('Permission de notification refusée.');
      return null;
    }
  } catch (error) {
    console.error('Erreur lors de la demande de permission de notification: ', error);
    return null;
  }
};

const getFCMToken = async () => {
  // Initialiser Firebase uniquement si nécessaire
  const currentApp = initializeFirebaseApp();
  if (!currentApp) {
    console.error("Firebase non initialisé - impossible d'obtenir un token.");
    return null;
  }
  
  // Vérifier la disponibilité de la VAPID key
  if (!VAPID_KEY) {
    console.error("VAPID key manquante, impossible d'obtenir un token FCM.");
    return null;
  }
  
  // Vérifier si Service Worker est supporté
  if (!('serviceWorker' in navigator)) {
    console.error('Service workers non supportés par ce navigateur.');
    return null;
  }
  
  try {
    // Initialiser la messagerie Firebase
    const messaging = getMessaging(currentApp);
    
    // Obtenir le token
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    
    if (currentToken) {
      console.log('Token FCM obtenu avec succès');
      // Envoyer le token au serveur
      await sendTokenToServer(currentToken);
      return currentToken;
    } else {
      console.log('Aucun token disponible. Veuillez accorder les permissions.');
      return null;
    }
  } catch (err) {
    console.error('Erreur lors de la récupération du token FCM: ', err);
    return null;
  }
};

const sendTokenToServer = async (token: string) => {
  try {
    // Vérifier que le token est valide
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('Token invalide - impossible de l\'envoyer au serveur');
      return;
    }
    
    // Envoyer le token au serveur
    await api.post('/push/subscribe', { 
      token: token, 
      device_type: 'web',
      timestamp: new Date().toISOString() // Pour le suivi des inscriptions
    });
    
    console.log('Token envoyé au serveur avec succès');
    
    // Stocker localement pour référence
    localStorage.setItem('fcm_token', token);
    localStorage.setItem('fcm_token_timestamp', new Date().toISOString());
  } catch (error) {
    console.error('Erreur lors de l\'envoi du token au serveur: ', error);
    // Ne pas bloquer l'utilisateur si le serveur est indisponible
  }
};

// Handle foreground messages
/**
 * Configure la réception de messages Firebase en premier plan
 * @param callback Fonction à exécuter lorsqu'un message est reçu
 * @returns Fonction pour annuler l'abonnement aux messages
 */
export const onForegroundMessage = (callback: (payload: MessagePayload) => void) => {
  // Initialiser Firebase seulement si nécessaire
  const currentApp = initializeFirebaseApp();
  if (!currentApp) {
    console.warn("Firebase non initialisé - impossible de recevoir des messages en premier plan");
    return () => {}; // Retourner une fonction vide
  }
  
  try {
    // Initialiser la messagerie Firebase
    const messaging = getMessaging(currentApp);
    
    // S'abonner aux messages en premier plan
    return onMessage(messaging, (payload) => {
      console.log('Message reçu en premier plan:', payload);
      
      // Exécuter le callback fourni
      if (typeof callback === 'function') {
        callback(payload);
      }
      
      // On pourrait ajouter ici un traitement par défaut, comme afficher une notification toast
      // Exemple: toast.success(payload.notification?.title || 'Nouveau message');
    });
  } catch (error) {
    console.error("Erreur lors de la configuration des messages en premier plan:", error);
    return () => {}; // Retourner une fonction vide en cas d'erreur
  }
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

// Nous ne faisons plus l'initialisation automatique au chargement pour éviter de bloquer la page
// initializeFirebaseApp(); 
// listenToTokenRefresh();
