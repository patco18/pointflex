import apiClient from '../api/client';

/**
 * Type pour les coordonnées GPS
 */
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Service pour gérer les fonctionnalités de pointage
 */
export const attendanceService = {
  /**
   * Effectue un pointage de type "bureau" avec géolocalisation
   * @param location - Coordonnées GPS
   * @returns Données de confirmation du pointage
   */
  async checkInOffice(location: LocationData) {
    try {
      const payload = {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        }
      };
      
      const response = await apiClient.post('/attendance/checkin/office', payload);
      return response.data;
    } catch (error) {
      console.error('Check-in office error:', error);
      throw error;
    }
  },
  
  /**
   * Effectue un pointage de type "mission" avec un numéro d'ordre
   * @param missionCode - Numéro d'ordre ou code de la mission
   * @param location - Coordonnées GPS (optionnelles selon la configuration)
   * @returns Données de confirmation du pointage
   */
  async checkInMission(missionCode: string, location?: LocationData) {
    try {
      const payload: any = { missionCode };
      
      if (location) {
        payload.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        };
      }
      
      const response = await apiClient.post('/attendance/checkin/mission', payload);
      return response.data;
    } catch (error) {
      console.error('Check-in mission error:', error);
      throw error;
    }
  },
  
  /**
   * Récupère l'historique des pointages de l'utilisateur
   * @param page - Numéro de la page
   * @param limit - Nombre d'éléments par page
   * @returns Liste des pointages
   */
  async getAttendanceHistory(page: number = 1, limit: number = 10) {
    try {
      const response = await apiClient.get('/attendance', {
        params: { page, limit }
      });
      
      return response.data;
    } catch (error) {
      console.error('Get attendance history error:', error);
      throw error;
    }
  },
  
  /**
   * Vérifie si l'utilisateur a déjà pointé aujourd'hui
   * @returns Informations sur le pointage du jour
   */
  async getTodayAttendance() {
    try {
      const response = await apiClient.get('/attendance/today');
      return response.data;
    } catch (error) {
      console.error('Get today attendance error:', error);
      throw error;
    }
  }
};

export default attendanceService;
