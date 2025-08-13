/**
 * Module de stockage adaptatif qui utilise AsyncStorage pour mobile
 * et localStorage pour le web
 */

// Détection de la plateforme web
const isWeb = typeof window !== 'undefined' && window.localStorage !== undefined;

// Import conditionnel
let AsyncStorage: any;
if (!isWeb) {
  // Utilisation d'AsyncStorage pour les plateformes mobiles
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

// Interface pour le stockage adaptatif
const AdaptiveStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      return localStorage.getItem(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      localStorage.setItem(key, value);
      return Promise.resolve();
    } else {
      return await AsyncStorage.setItem(key, value);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      localStorage.removeItem(key);
      return Promise.resolve();
    } else {
      return await AsyncStorage.removeItem(key);
    }
  },

  clear: async (): Promise<void> => {
    if (isWeb) {
      localStorage.clear();
      return Promise.resolve();
    } else {
      return await AsyncStorage.clear();
    }
  },

  getAllKeys: async (): Promise<string[]> => {
    if (isWeb) {
      return Object.keys(localStorage);
    } else {
      return await AsyncStorage.getAllKeys();
    }
  }
};

export default AdaptiveStorage;
