import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import AnalyticsDashboard from '../components/charts/AnalyticsDashboard';
import { analyticsService } from '../services/analyticsService';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { Settings, Info } from 'lucide-react';

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
  // Autres données d'analyse que nous pourrions ajouter dans le futur
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { userRole, checkPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  
  const canAccessAnalytics = checkPermission('analytics.access_basic');
  
  useEffect(() => {
    if (!canAccessAnalytics) {
      setError('Vous n\'avez pas les permissions nécessaires pour accéder à cette page.');
      setLoading(false);
      return;
    }
    
    loadDashboardData();
  }, [canAccessAnalytics]);
  
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Dans une implémentation réelle, ces données seraient récupérées depuis le backend
      const response = await analyticsService.getDashboardData();
      const data = response.data;
      setAnalyticsData(data);
      return data; // Return the data to satisfy the Promise<AnalyticsData> return type
    } catch (err) {
      console.error('Erreur lors du chargement des données analytiques:', err);
      setError('Une erreur est survenue lors du chargement des données. Veuillez réessayer plus tard.');
      throw err; // Rethrow the error to be caught by the calling function
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner text="Chargement du tableau de bord analytique..." />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Info className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Accès refusé</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tableau de Bord et Analytique</h1>
        
        {checkPermission('analytics.configure') && (
          <button className="btn-outline flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Configurer les analyses
          </button>
        )}
      </div>
      
      <AnalyticsDashboard 
        analyticsData={analyticsData} 
        loadData={loadDashboardData} 
      />
    </div>
  );
}
