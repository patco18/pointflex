import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Printer, FileSpreadsheet, FileText } from 'lucide-react';

// Composant temporaire pour les graphiques
const AttendanceCharts = {
  TrendChart: ({ data, startDate, endDate }) => (
    <div className="flex items-center justify-center h-full bg-gray-100 border rounded p-4">
      <p className="text-gray-500 text-center">
        Graphique de tendance d'assiduité<br />
        <span className="text-sm">Installez Recharts pour activer cette visualisation</span>
      </p>
    </div>
  ),
  StatusDistributionChart: ({ presences, absences, lates }) => (
    <div className="flex items-center justify-center h-full bg-gray-100 border rounded p-4">
      <p className="text-gray-500 text-center">
        Graphique de répartition des statuts<br />
        <span className="text-sm">Installez Recharts pour activer cette visualisation</span>
      </p>
    </div>
  ),
  DepartmentComparisonChart: ({ data }) => (
    <div className="flex items-center justify-center h-full bg-gray-100 border rounded p-4">
      <p className="text-gray-500 text-center">
        Graphique de comparaison des départements<br />
        <span className="text-sm">Installez Recharts pour activer cette visualisation</span>
      </p>
    </div>
  ),
  TopEmployeesChart: ({ data }) => (
    <div className="flex items-center justify-center h-full bg-gray-100 border rounded p-4">
      <p className="text-gray-500 text-center">
        Graphique des meilleurs employés<br />
        <span className="text-sm">Installez Recharts pour activer cette visualisation</span>
      </p>
    </div>
  )
};

// Import des nouveaux composants
import ReportFilters, { ReportFilters as FilterOptions } from '../../../components/filters/ReportFilters';
import ExportService from '../../../services/ExportService';

const AttendanceReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // État pour les filtres
  const [currentPeriod, setCurrentPeriod] = useState({
    start: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'), // Premier jour du mois
    end: format(new Date(), 'yyyy-MM-dd') // Aujourd'hui
  });

  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true);
      try {
        if (location.state?.reportData) {
          setReportData(location.state.reportData);
          if (location.state.period) {
            setCurrentPeriod(location.state.period);
          }
        } else if (location.state?.period) {
          const { start, end } = location.state.period;
          setCurrentPeriod({ start, end });
          const response = await api.get('/admin/attendance/comprehensive-report', {
            params: { start_date: start, end_date: end }
          });
          setReportData(response.data);
        } else {
          const today = new Date();
          const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          const start = format(startDate, 'yyyy-MM-dd');
          const end = format(endDate, 'yyyy-MM-dd');
          setCurrentPeriod({ start, end });
          const response = await api.get('/admin/attendance/comprehensive-report', {
            params: { start_date: start, end_date: end }
          });
          setReportData(response.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données du rapport:', error);
        toast.error('Impossible de charger les données du rapport.');
      } finally {
        setLoading(false);
      }
    };
    loadReportData();
  }, [location.state]);

  const formatDuration = (durationInHours: number): string => {
    const hours = Math.floor(durationInHours);
    const minutes = Math.round((durationInHours - hours) * 60);
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  };

  // Gestion des exportations
  const exportToPDF = () => {
    if (reportRef.current && reportData) {
      ExportService.exportToPDF(reportData, reportRef.current);
      setExportMenuOpen(false);
    } else {
      toast.error('Impossible d\'exporter le rapport en PDF.');
    }
  };
  
  const exportToExcel = () => {
    if (reportData) {
      ExportService.exportToExcel(reportData);
      setExportMenuOpen(false);
    } else {
      toast.error('Impossible d\'exporter le rapport en Excel.');
    }
  };
  
  const exportToCSV = () => {
    if (reportData) {
      ExportService.exportToCSV(reportData);
      setExportMenuOpen(false);
    } else {
      toast.error('Impossible d\'exporter le rapport en CSV.');
    }
  };

  const printReport = () => {
    window.print();
  };
  
  // Gestion des filtres
  const handleFilterChange = async (filters: FilterOptions) => {
    setLoading(true);
    try {
      const params: any = {
        start_date: filters.startDate,
        end_date: filters.endDate
      };
      
      // Ajouter les filtres supplémentaires s'ils ne sont pas "all"
      if (filters.departmentId !== 'all') params.department_id = filters.departmentId;
      if (filters.serviceId !== 'all') params.service_id = filters.serviceId;
      if (filters.officeId !== 'all') params.office_id = filters.officeId;
      
      const response = await api.get('/admin/attendance/comprehensive-report', { params });
      setReportData(response.data);
      setCurrentPeriod({ start: filters.startDate, end: filters.endDate });
      setShowFilters(false); // Fermer le panneau de filtres après application
      toast.success('Rapport mis à jour avec les nouveaux filtres');
    } catch (error) {
      console.error('Erreur lors de l\'application des filtres:', error);
      toast.error('Impossible d\'appliquer les filtres au rapport.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between border-b pb-2 mb-2">
            <h2 className="text-xl font-bold">Rapport d'assiduité indisponible</h2>
            <button 
              className="bg-gray-200 px-3 py-1 rounded text-sm flex items-center gap-1"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
          </div>
          <div>
            <p>Aucune donnée n'est disponible pour générer le rapport.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4" ref={reportRef}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Rapport complet d'assiduité</h1>
            <p className="text-gray-500">
              Période: {reportData.period && format(new Date(reportData.period.start), 'dd MMMM yyyy', { locale: fr })} - 
              {reportData.period && format(new Date(reportData.period.end), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => navigate(-1)} 
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <button 
              onClick={printReport} 
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded flex items-center gap-1"
            >
              <Printer className="w-4 h-4" /> Imprimer
            </button>
            <div className="relative">
              <button 
                onClick={() => setExportMenuOpen(!exportMenuOpen)} 
                className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> Exporter
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={exportToPDF}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="w-4 h-4" /> Exporter en PDF
                    </button>
                    <button
                      onClick={exportToExcel}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Exporter en Excel
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Download className="w-4 h-4" /> Exporter en CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded"
            >
              {showFilters ? "Masquer filtres" : "Filtres avancés"}
            </button>
          </div>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <ReportFilters 
            onFilterChange={handleFilterChange} 
            defaultPeriod={currentPeriod}
          />
        )}

        {/* Notification si données simulées */}
        {reportData.stats?.containsSimulatedData && (
          <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-md mb-6 text-yellow-800">
            <p className="font-medium">Note: Ce rapport contient des données simulées</p>
            <p className="text-sm">Certaines données de ce rapport sont simulées car suffisamment de données réelles n'étaient pas disponibles pour la période sélectionnée.</p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="text-blue-500 text-sm font-medium">Total Présences</p>
            <p className="text-2xl font-bold">{reportData.stats?.totalPresences || 0}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <p className="text-red-500 text-sm font-medium">Total Absences</p>
            <p className="text-2xl font-bold">{reportData.stats?.totalAbsences || 0}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
            <p className="text-yellow-500 text-sm font-medium">Total Retards</p>
            <p className="text-2xl font-bold">{reportData.stats?.totalLate || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <p className="text-green-500 text-sm font-medium">Heures Travaillées</p>
            <p className="text-2xl font-bold">{formatDuration(reportData.stats?.totalWorkHours || 0)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-4 ${activeTab === 'overview' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-gray-500 hover:text-gray-700'}`}
            >
              Vue générale
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`py-2 px-4 ${activeTab === 'departments' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-gray-500 hover:text-gray-700'}`}
            >
              Départements
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`py-2 px-4 ${activeTab === 'employees' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-gray-500 hover:text-gray-700'}`}
            >
              Employés
            </button>
            <button
              onClick={() => setActiveTab('missions')}
              className={`py-2 px-4 ${activeTab === 'missions' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-gray-500 hover:text-gray-700'}`}
            >
              Missions
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`py-2 px-4 ${activeTab === 'charts' 
                ? 'border-b-2 border-blue-500 text-blue-500' 
                : 'text-gray-500 hover:text-gray-700'}`}
            >
              Visualisations
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4">Tendances d'assiduité</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 border rounded">
                  <p className="text-gray-500">Graphique des tendances d'assiduité</p>
                  {/* Le graphique serait intégré ici avec une librairie comme recharts */}
                </div>
              </div>
              
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4">Meilleurs employés</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(reportData.topEmployees || []).slice(0, 3).map((employee: any, index: number) => (
                    <div key={index} className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-bold">{employee.name}</div>
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Top {index + 1}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        <p>Présences: {employee.presences}</p>
                        <p>Retards: {employee.lates}</p>
                        <p>Absences: {employee.absences}</p>
                        <p>Heures travaillées: {formatDuration(employee.workHours)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'departments' && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-4">Performance par département</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Département</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Employés</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Présences</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Absences</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Retards</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Heures</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.departmentStats || []).map((dept: any, index: number) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-6 py-4 whitespace-nowrap border">{dept.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">{dept.employeeCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">{dept.presences}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">{dept.absences}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">{dept.lates}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">{formatDuration(dept.workHours)}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">
                          <span className={`px-2 py-1 rounded text-xs font-medium
                            ${dept.attendanceRate >= 90 ? 'bg-green-100 text-green-800' : 
                              dept.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'}`}>
                            {dept.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-4">Détails des employés</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Département</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Présences</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Absences</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Retards</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Heures</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.employeeStats || []).map((emp: any, index: number) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-6 py-4 whitespace-nowrap border">{emp.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">{emp.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">{emp.presences}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">{emp.absences}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">{emp.lates}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">{formatDuration(emp.workHours)}</td>
                        <td className="px-6 py-4 whitespace-nowrap border">
                          <span className={`px-2 py-1 rounded text-xs font-medium
                            ${emp.attendanceRate >= 90 ? 'bg-green-100 text-green-800' : 
                              emp.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'}`}>
                            {emp.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'missions' && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-4">Rapport des missions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <p className="text-indigo-500 text-sm font-medium">Total des missions</p>
                  <p className="text-2xl font-bold">{reportData.missionStats?.totalMissions || 0}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <p className="text-purple-500 text-sm font-medium">Jours en mission</p>
                  <p className="text-2xl font-bold">{reportData.missionStats?.totalDays || 0}</p>
                </div>
              </div>
              
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4">Détail des missions</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Titre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Employé</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Début</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Fin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Jours</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Heures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.missions || []).map((mission: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-6 py-4 whitespace-nowrap border">{mission.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap border">{mission.employeeName}</td>
                          <td className="px-6 py-4 whitespace-nowrap border">
                            {format(new Date(mission.startDate), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border">
                            {format(new Date(mission.endDate), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border">{mission.days}</td>
                          <td className="px-6 py-4 whitespace-nowrap border">{formatDuration(mission.hours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-4">Visualisations des données d'assiduité</h3>
              
              {/* Message installation */}
              <div className="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-md text-blue-700">
                <p className="font-medium">Note: Pour activer toutes les fonctionnalités</p>
                <p className="text-sm">Installez les bibliothèques nécessaires avec les commandes:</p>
                <div className="mt-2 text-sm">
                  <code className="bg-blue-100 px-1 py-0.5 rounded block mb-1">npm install recharts</code>
                  <code className="bg-blue-100 px-1 py-0.5 rounded block mb-1">npm install jspdf html2canvas</code>
                  <code className="bg-blue-100 px-1 py-0.5 rounded block">npm install xlsx file-saver</code>
                </div>
              </div>
              
              {/* Section des graphiques */}
              <div className="space-y-8">
                {/* Graphique de tendance d'assiduité */}
                <div className="p-4 border rounded-lg">
                  <h4 className="text-md font-medium mb-4">Tendance d'assiduité sur la période</h4>
                  <div className="h-72 w-full">
                    {reportData.attendanceByDate ? (
                      <AttendanceCharts.TrendChart 
                        data={reportData.attendanceByDate} 
                        startDate={reportData.period?.start}
                        endDate={reportData.period?.end}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-50 border rounded">
                        <p className="text-gray-500">Données insuffisantes pour la visualisation</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Graphique de répartition par statut */}
                <div className="p-4 border rounded-lg">
                  <h4 className="text-md font-medium mb-4">Répartition des statuts de présence</h4>
                  <div className="h-72 w-full">
                    {reportData.stats ? (
                      <AttendanceCharts.StatusDistributionChart 
                        presences={reportData.stats.totalPresences || 0}
                        absences={reportData.stats.totalAbsences || 0}
                        lates={reportData.stats.totalLate || 0}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-50 border rounded">
                        <p className="text-gray-500">Données insuffisantes pour la visualisation</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Graphique de comparaison départementale */}
                <div className="p-4 border rounded-lg">
                  <h4 className="text-md font-medium mb-4">Comparaison des départements</h4>
                  <div className="h-96 w-full">
                    {reportData.departmentStats?.length > 0 ? (
                      <AttendanceCharts.DepartmentComparisonChart 
                        data={reportData.departmentStats}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-50 border rounded">
                        <p className="text-gray-500">Données insuffisantes pour la visualisation</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Graphique des meilleurs employés */}
                <div className="p-4 border rounded-lg">
                  <h4 className="text-md font-medium mb-4">Top 5 des employés avec le meilleur taux de présence</h4>
                  <div className="h-72 w-full">
                    {reportData.employeeStats?.length > 0 ? (
                      <AttendanceCharts.TopEmployeesChart 
                        data={reportData.employeeStats.slice(0, 5)}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-50 border rounded">
                        <p className="text-gray-500">Données insuffisantes pour la visualisation</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceReport;
