import apiClient from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoginResponse {
  token: string;
  user: any; // Define a proper User type matching your backend User model
}

interface UserProfile {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    role: string;
    company_id?: number;
    company_name?: string;
    // Add other fields as needed from your User.to_dict(include_sensitive=True)
}

export const login = async (email: string, password: string): Promise<UserProfile | null> => {
  try {
    const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    if (response.data.token && response.data.user) {
      await AsyncStorage.setItem('token', response.data.token);
      // Store user data as well, or just the parts needed globally
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      return response.data.user;
    }
    return null;
  } catch (error) {
    console.error('Login failed:', error);
    throw error; // Rethrow to be handled by UI
  }
};

export const logout = async () => {
  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    delete apiClient.defaults.headers.common['Authorization'];
    // Optionally, call a backend /auth/logout endpoint if it exists and does server-side invalidation
  } catch (error) {
    console.error('Logout failed:', error);
    // Still, proceed with client-side cleanup
  }
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      return JSON.parse(userJson) as UserProfile;
    }
    // Optionally, try to fetch from /auth/me if token exists but user data is missing
    const token = await AsyncStorage.getItem('token');
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await apiClient.get<{profile: UserProfile}>('/auth/me'); // Assuming /me returns {profile: User}
        if (response.data.profile) {
            await AsyncStorage.setItem('user', JSON.stringify(response.data.profile));
            return response.data.profile;
        }
    }
    return null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    // If /auth/me fails (e.g. 401), the interceptor should handle token removal.
    return null;
  }
};

// Add register function if needed, similar to login
// export const register = async (userData: any) => { ... };
