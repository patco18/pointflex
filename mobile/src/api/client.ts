import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // For token storage

// API base URL can be overridden via a .env file. See mobile/.env.example
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.headers.Authorization ? 'with token' : 'without token');
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    console.error(`[API Response Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'NETWORK_ERROR'}`);

    if (error.response?.status === 401) {
      // Attempt to refresh the token. If it fails, clear storage so the
      // AuthContext will redirect the user to the login screen on next render.
      try {
        const currentToken = await AsyncStorage.getItem('token');
        if (currentToken && !error.config.__isRetryRequest && !error.config.url?.includes('/auth/refresh')) {
          const refreshResp = await apiClient.post('/auth/refresh');
          const newToken = refreshResp.data.token;
          if (newToken) {
            await AsyncStorage.setItem('token', newToken);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            error.config.headers.Authorization = `Bearer ${newToken}`;
            error.config.__isRetryRequest = true;
            return apiClient(error.config); // retry original request
          }
        }
      } catch (refreshError) {
        console.log('Token refresh failed, redirecting to login');
      }

      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      delete apiClient.defaults.headers.common['Authorization'];
      // Implement navigation to Login screen in your app if desired
    }

    // You might want to show a global toast message for other errors
    // but often it's better to handle errors in the calling service/component.

    return Promise.reject(error);
  }
);

export default apiClient;
