import { api } from './api';

// Define AnalyticsData interface directly in this file temporarily
interface AnalyticsData {
  kpis: {
    attendanceRate: number;
    attendanceTrend: number;
    onTimeRate: number;
    onTimeTrend: number;
    lateRate: number;
    lateTrend: number;
    averageHoursWorked: number;
    hoursTrend: number;
    absenceRate: number;
    absenceTrend: number;
    upcomingLeaves: number;
  };
  latenessAlerts: Array<{
    id: number;
    userId: number;
    userName: string;
    department?: string;
    lateCount: number;
    lateMinutes: number;
    lastLateDate: string;
    streak: number;
  }>;
}

export const analyticsService = {
  // Récupérer les KPIs généraux
  getAnalyticsKPIs: async (dateRange: string = 'month') => {
    try {
      return await api.get(`/analytics/kpis?range=${dateRange}`);
    } catch (error) {
      console.error('Get analytics KPIs service error:', error);
      throw error;
    }
  },
  
  // Récupérer les alertes de retard
  getLatenessAlerts: async () => {
    try {
      return await api.get('/analytics/alerts/lateness');
    } catch (error) {
      console.error('Get lateness alerts service error:', error);
      throw error;
    }
  },
  
  // Récupérer les données analytiques pour un tableau de bord personnalisé
  getDashboardData: async (options: {
    dateRange?: string;
    departmentId?: number;
    userId?: number;
  } = {}): Promise<{ data: AnalyticsData }> => {
    try {
      const params = {
        range: options.dateRange || 'month',
        department_id: options.departmentId,
        user_id: options.userId
      };
      
      const response = await api.get<AnalyticsData>('/analytics/dashboard', { params });
      return { data: response.data }; // Return the data in the expected format
    } catch (error) {
      console.error('Get dashboard data service error:', error);
      throw error;
    }
  },
  
  // Récupérer des statistiques sur les congés
  getLeaveAnalytics: async (options: {
    dateRange?: string;
    departmentId?: number;
  } = {}) => {
    try {
      const params = {
        range: options.dateRange || 'month',
        department_id: options.departmentId
      };
      
      return await api.get('/analytics/leaves', { params });
    } catch (error) {
      console.error('Get leave analytics service error:', error);
      throw error;
    }
  },
  
  // Télécharger des rapports analytiques (retourne un blob pour téléchargement)
  downloadReport: async (options: {
    type: 'attendance' | 'leave' | 'performance';
    format: 'pdf' | 'excel';
    dateRange?: string;
    departmentId?: number;
  }) => {
    try {
      const params = {
        type: options.type,
        format: options.format,
        range: options.dateRange || 'month',
        department_id: options.departmentId
      };
      
      return await api.get('/analytics/reports/download', { 
        params,
        responseType: 'blob'
      });
    } catch (error) {
      console.error('Download report service error:', error);
      throw error;
    }
  }
};
