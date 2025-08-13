import axios from 'axios';
import AdaptiveStorage from '../platform/storage';
import { API_BASE_URL } from '@env';

// API base URL - défini dans le fichier .env
// Valeur par défaut pour les émulateurs/simulateurs si la variable d'environnement n'est pas définie
const BASE_URL = API_BASE_URL || 'http://10.0.2.2:5000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Intercepteur pour ajouter le token JWT à chaque requête
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AdaptiveStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et les erreurs
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.error(`[API Error] ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
    
    // Si l'erreur est due à un token expiré (401), essayer de rafraîchir
    if (error.response?.status === 401) {
      try {
        // Vérifier si on n'est pas déjà en train d'essayer de rafraîchir le token
        const isRefreshRequest = error.config.url?.includes('/auth/refresh');
        if (!isRefreshRequest) {
          // Essayer de rafraîchir le token
          const refreshResp = await apiClient.post('/auth/refresh');
          const newToken = refreshResp.data.token;
          
          if (newToken) {
            // Sauvegarder le nouveau token
            await AdaptiveStorage.setItem('token', newToken);
            
            // Répéter la requête qui a échoué avec le nouveau token
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(error.config);
          }
        }
      } catch (refreshError) {
        console.error('[Token Refresh Failed]', refreshError);
        // En cas d'échec, on efface le token (ce qui obligera l'utilisateur à se reconnecter)
        await AdaptiveStorage.removeItem('token');
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
