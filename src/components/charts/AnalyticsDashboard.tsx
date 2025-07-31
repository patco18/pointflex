import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import KPIDashboard from './KPIDashboard';
import AttendanceAlerts from './AttendanceAlerts';
import { 
  BarChart,
  LineChart,
  RefreshCw,
  Filter,
  Calendar,
  Download,
  ChevronDown,
  Users,
  Clock
} from 'lucide-react';

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

interface AnalyticsDashboardProps {
  // Données d'analyse qui pourraient être fournies directement ou chargées dans le composant
  analyticsData?: AnalyticsData;
  // Pour le chargement asynchrone
  loadData?: () => Promise<AnalyticsData>;
}

export default function AnalyticsDashboard({ analyticsData, loadData }: AnalyticsDashboardProps) {
  const { user } = useAuth();
  const { userRole, checkPermission } = usePermissions();
  const [loading, setLoading] = useState(!analyticsData);
  const [data, setData] = useState<AnalyticsData | null>(analyticsData || null);
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  
  // Permissions
  const canViewTeamStats = checkPermission('attendance.view_team_stats');
  const canViewDepartmentStats = checkPermission('attendance.view_department_stats');
  const canViewAllStats = checkPermission('attendance.view_all_stats');
  
  useEffect(() => {
    if (!analyticsData && loadData) {
      setLoading(true);
      loadData()
        .then(newData => {
          setData(newData);
        })
        .catch(error => {
          console.error('Erreur lors du chargement des données analytiques:', error);
          // Utiliser des données simulées en cas d'erreur
          setData(generateMockData());
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [analyticsData, loadData]);

  // Génération de données simulées pour la démo
  const generateMockData = (): AnalyticsData => {
    return {
      kpis: {
        attendanceRate: Math.floor(85 + Math.random() * 10),
        attendanceTrend: +(Math.random() * 6 - 3).toFixed(1),
        onTimeRate: Math.floor(80 + Math.random() * 15),
        onTimeTrend: +(Math.random() * 8 - 4).toFixed(1),
        lateRate: Math.floor(5 + Math.random() * 10),
        lateTrend: +(Math.random() * 6 - 3).toFixed(1),
        averageHoursWorked: +(7.5 + Math.random()).toFixed(1),
        hoursTrend: +(Math.random() * 4 - 2).toFixed(1),
        absenceRate: Math.floor(3 + Math.random() * 5),
        absenceTrend: +(Math.random() * 3 - 1.5).toFixed(1),
        upcomingLeaves: Math.floor(3 + Math.random() * 8)
      },
      latenessAlerts: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
        id: i + 1,
        userId: 100 + i,
        userName: ['Jean Dupont', 'Marie Martin', 'Pierre Durand', 'Sophie Petit', 'Luc Dubois'][i % 5],
        department: ['IT', 'Marketing', 'Finance', 'RH', 'Logistique'][i % 5],
        lateCount: Math.floor(Math.random() * 5) + 1,
        lateMinutes: Math.floor(Math.random() * 20) + 5,
        lastLateDate: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000).toLocaleDateString('fr-FR'),
        streak: Math.floor(Math.random() * 3) + (i === 0 ? 2 : 0) // Le premier a plus de chances d'avoir un streak
      }))
    };
  };

  // Si aucune donnée n'est disponible et qu'elles sont en cours de chargement
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          <p className="mt-2 text-gray-600">Chargement des données analytiques...</p>
        </div>
      </div>
    );
  }

  // Si aucune donnée n'est disponible après le chargement
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-10">
          <BarChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Données non disponibles</h3>
          <p className="text-gray-600">
            Les données analytiques ne sont pas disponibles pour le moment. Veuillez réessayer plus tard.
          </p>
        </div>
      </div>
    );
  }

  // Traiter les alertes de retard
  const handleDismissAlert = (id: number) => {
    // Dans un cas réel, cette fonction appellerait une API pour marquer l'alerte comme traitée
    console.log(`Alerte ${id} marquée comme traitée`);
    // Mettre à jour l'état local pour supprimer l'alerte de l'interface
    if (data) {
      setData({
        ...data,
        latenessAlerts: data.latenessAlerts.filter(alert => alert.id !== id)
      });
    }
  };

  // Voir les détails d'un employé
  const handleViewEmployeeDetails = (id: number) => {
    // Dans un cas réel, cette fonction pourrait naviguer vers la page de l'employé
    console.log(`Voir les détails de l'employé ${id}`);
  };

  // Changer la plage de dates
  const handleDateRangeChange = (newRange: 'day' | 'week' | 'month' | 'year') => {
    setDateRange(newRange);
    // Dans un cas réel, chargerait de nouvelles données basées sur la plage de dates
  };

  // Télécharger les rapports
  const handleDownloadReport = () => {
    // Dans un cas réel, cette fonction générerait un rapport PDF ou Excel
    console.log('Téléchargement du rapport');
  };

  return (
    <div>
      {/* En-tête avec filtres et actions */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0">Tableau de Bord Analytique</h1>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative inline-block">
            <button className="btn-outline flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>
                {dateRange === 'day' && 'Aujourd\'hui'}
                {dateRange === 'week' && 'Cette semaine'}
                {dateRange === 'month' && 'Ce mois'}
                {dateRange === 'year' && 'Cette année'}
              </span>
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
              <div className="py-1">
                <button
                  onClick={() => handleDateRangeChange('day')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => handleDateRangeChange('week')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Cette semaine
                </button>
                <button
                  onClick={() => handleDateRangeChange('month')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Ce mois
                </button>
                <button
                  onClick={() => handleDateRangeChange('year')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Cette année
                </button>
              </div>
            </div>
          </div>
          
          <button className="btn-outline flex items-center">
            <Filter className="h-4 w-4 mr-1" />
            <span>Filtres</span>
          </button>
          
          <button className="btn-outline flex items-center" onClick={handleDownloadReport}>
            <Download className="h-4 w-4 mr-1" />
            <span>Exporter</span>
          </button>
          
          <button 
            className="btn-outline flex items-center" 
            onClick={() => loadData && loadData().then(setData)}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>
      
      {/* KPIs basés sur le rôle de l'utilisateur */}
      {data && userRole && (
        <KPIDashboard data={data.kpis} role={userRole} />
      )}
      
      {/* Alertes de retard (visible uniquement pour les rôles de management) */}
      {data && data.latenessAlerts.length > 0 && 
       (userRole === 'superadmin' || userRole === 'admin_rh' || 
        userRole === 'chef_service' || userRole === 'manager') && (
        <AttendanceAlerts 
          alerts={data.latenessAlerts} 
          onDismiss={handleDismissAlert} 
          onViewDetails={handleViewEmployeeDetails}
        />
      )}
      
      {/* Espace pour les graphiques détaillés (à implémenter avec Recharts ou une autre librairie) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-500" />
            Taux de présence par département
          </h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300">
            <div className="text-center text-gray-500">
              <BarChart className="h-10 w-10 mx-auto mb-2" />
              <p>Graphique du taux de présence par département</p>
              <p className="text-xs mt-1">Implémentation à venir avec Recharts</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-green-500" />
            Évolution des retards sur la période
          </h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300">
            <div className="text-center text-gray-500">
              <LineChart className="h-10 w-10 mx-auto mb-2" />
              <p>Graphique d'évolution des retards</p>
              <p className="text-xs mt-1">Implémentation à venir avec Recharts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
