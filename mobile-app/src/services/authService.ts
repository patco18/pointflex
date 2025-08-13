import apiClient from '../api/client';
import AdaptiveStorage from '../platform/storage';

/**
 * Service pour gérer l'authentification avec le backend
 */
export const authService = {
  /**
   * Connecte un utilisateur et stocke son token
   * @param email - Email de l'utilisateur
   * @param password - Mot de passe
   * @returns Les données de l'utilisateur
   */
  async login(email: string, password: string) {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      
      const { token, user } = response.data;
      
      // Stocker le token pour les futures requêtes
      await AdaptiveStorage.setItem('token', token);
      await AdaptiveStorage.setItem('user', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  /**
   * Déconnecte l'utilisateur
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Même en cas d'erreur avec le backend, on supprime les données locales
      await AdaptiveStorage.removeItem('token');
      await AdaptiveStorage.removeItem('user');
    }
  },
  
  /**
   * Vérifie si l'utilisateur est connecté
   * @returns L'utilisateur s'il est connecté, null sinon
   */
  async getCurrentUser() {
    try {
      const userStr = await AdaptiveStorage.getItem('user');
      const token = await AdaptiveStorage.getItem('token');
      
      if (!userStr || !token) return null;
      
      // Optionnel: valider le token avec le backend
      // const response = await apiClient.get('/auth/validate');
      // if (!response.data.valid) return null;
      
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
};

export default authService;
