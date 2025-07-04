import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // For token storage

// TODO: User should set this via .env or other config mechanism
const API_BASE_URL = 'http://YOUR_LOCAL_IP_OR_DOMAIN:5000/api'; // Replace with actual backend URL

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
      // Token might be invalid or expired
      // TODO: Implement token refresh logic or navigate to login
      console.log('API Error 401: Unauthorized. Token may be invalid.');
      await AsyncStorage.removeItem('token'); // Clear invalid token
      // Potentially navigate to Login screen here using a navigation service
      // This is a common place for a global navigation handler or event emitter.
      // Example: navigationService.navigate('Login');
    }

    // You might want to show a global toast message for other errors
    // but often it's better to handle errors in the calling service/component.

    return Promise.reject(error);
  }
);

export default apiClient;
