/**
 * Utilitaire pour charger Firebase de manière sécurisée après l'initialisation de l'application
 */
import { initializeFirebaseApp, listenToTokenRefresh } from '../firebaseInit';

/**
 * Initialise Firebase de manière sécurisée après le chargement de l'application
 * Cette fonction peut être appelée depuis App.tsx ou après connexion
 */
export const initializeFirebaseSafely = async () => {
  try {
    // Initialiser après un court délai pour ne pas bloquer le rendu initial
    setTimeout(() => {
      console.log("Tentative d'initialisation de Firebase...");
      const app = initializeFirebaseApp();
      
      if (app) {
        console.log("Firebase initialisé avec succès après chargement de l'application");
        // Configurer l'écoute des changements de token
        listenToTokenRefresh()
          .catch(err => console.error("Erreur lors de la configuration de l'écoute des tokens:", err));
      } else {
        console.warn("L'initialisation de Firebase a échoué - les notifications ne seront pas disponibles");
      }
    }, 2000); // Délai de 2 secondes pour éviter de bloquer le chargement initial
    
    return true;
  } catch (error) {
    console.error("Erreur lors de l'initialisation sécurisée de Firebase:", error);
    return false;
  }
};

/**
 * Vérifie si les notifications sont disponibles dans le navigateur
 */
export const areNotificationsAvailable = (): boolean => {
  return (
    'Notification' in window && 
    'serviceWorker' in navigator && 
    'PushManager' in window
  );
};
