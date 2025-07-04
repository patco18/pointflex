import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/authService'; // Assuming UserProfile is defined here
import apiClient from '../api/client';

// Define a proper User type based on your backend's User model
interface UserProfile {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    role: string;
    company_id?: number;
    company_name?: string;
    // Add other fields from your User.to_dict(include_sensitive=True)
    // For example:
    // office_latitude?: number;
    // office_longitude?: number;
    // office_radius?: number;
    // work_start_time?: string;
    // theme_color?: string;
    // logo_url?: string;
}


interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  // You might add other auth-related functions here, e.g., register
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = async () => {
      setIsLoading(true);
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUserJson = await AsyncStorage.getItem('user');

        if (storedToken && storedUserJson) {
          setToken(storedToken);
          setUser(JSON.parse(storedUserJson) as UserProfile);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        } else if (storedToken) {
          // Token exists but no user data, try fetching /auth/me
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const fetchedUser = await authService.getCurrentUser(); // getCurrentUser now also tries /auth/me
          if (fetchedUser) {
            setUser(fetchedUser);
          } else { // Token likely invalid if /auth/me failed
            await AsyncStorage.removeItem('token');
            delete apiClient.defaults.headers.common['Authorization'];
          }
        }
      } catch (e) {
        console.error("Failed to load auth data", e);
        // Ensure cleanup if loading fails
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        delete apiClient.defaults.headers.common['Authorization'];
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthData();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        const newToken = await AsyncStorage.getItem('token'); // Get token set by authService.login
        setToken(newToken);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("AuthContext login error", error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await authService.logout();
    setUser(null);
    setToken(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Add derived states like isAdmin, isSuperAdmin if needed, similar to web app
  // context.isAdmin = context.user?.role === 'admin' || context.user?.role === 'admin_rh';
  // context.isSuperAdmin = context.user?.role === 'superadmin';
  return context;
};
