import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { api, attendanceService } from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Search, Filter, Download, Calendar, MapPin, Clock, 
  ChevronDown, ChevronRight, BarChart3, Users, AlertCircle,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface AttendanceRecord {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  department: string;
  service: string;
  type: 'office' | 'mission';
  date_pointage: string;
  heure_arrivee: string;
  heure_depart?: string;
  statut: string;
  mission_order_number?: string;
  latitude?: number;
  longitude?: number;
}

interface StatsSummary {
  present_count: number;
  absent_count: number;
  late_count: number;
  total_employees: number;
  average_arrival_time: string;
  average_work_hours: number;
}

const AttendanceHistoryAdmin: React.FC = () => {
  const navigate = useNavigate();
  
  // États
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [employees, setEmployees] = useState<{id: number, name: string}[]>([]);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState<number | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total_pages: 1,
    total_items: 0
  });

  // Récupérer les données des employés
  const { data: employeesData } = useApi(() => api.get('/admin/employees'));

  // Récupérer la liste des départements
  const { data: departmentsData } = useApi(() => api.get('/admin/departments'));

  // Charger les données au montage du composant et lors du changement de filtres
  useEffect(() => {
    loadAttendanceData();
    
    if (employeesData) {
      const employees = (employeesData as any).employees || [];
      setEmployees(employees.map((emp: any) => ({
        id: emp.id,
        name: `${emp.prenom} ${emp.nom}`
      })));
    }
  }, [dateRange, employeesData, pagination.page]);

  // Filtrer les enregistrements chaque fois que les filtres changent
  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, statusFilter, typeFilter, employeeFilter, departmentFilter]);

  // Fonction pour charger les données de pointage
  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      // Appel à l'API pour récupérer les pointages de tous les employés
      const response = await api.get('/admin/attendance', {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end,
          page: pagination.page,
          per_page: pagination.per_page,
          employee_id: employeeFilter !== 'all' ? employeeFilter : undefined,
          department_id: departmentFilter !== 'all' ? departmentFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }
      });
      
      setRecords(response.data.records || []);
      setPagination(response.data.pagination || {
        page: 1,
        per_page: 20,
        total_pages: 1,
        total_items: 0
      });
      
      // Récupérer les statistiques 
      const statsResponse = await api.get('/admin/attendance/stats', {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end
        }
      });
      
      setStats(statsResponse.data.stats || null);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des données de pointage');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour filtrer les enregistrements
  const filterRecords = () => {
    let filtered = [...records];
    
    // Filtre par recherche texte (nom d'employé, date, numéro de mission)
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.date_pointage.includes(searchTerm) ||
        record.mission_order_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.statut === statusFilter);
    }
    
    // Filtre par type de pointage
    if (typeFilter !== 'all') {
      filtered = filtered.filter(record => record.type === typeFilter);
    }
    
    // Filtre par employé
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(record => record.user_id === employeeFilter);
    }
    
    // Filtre par département
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(record => record.department === departmentFilter);
    }
    
    setFilteredRecords(filtered);
  };

  // Fonction pour exporter les données en CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Employé', 'Département', 'Service', 'Type', 'Arrivée', 'Départ', 'Statut', 'Mission'];
    const csvData = filteredRecords.map(record => [
      record.date_pointage,
      record.user_name || '',
      record.department || '',
      record.service || '',
      record.type === 'office' ? 'Bureau' : 'Mission',
      record.heure_arrivee,
      record.heure_depart || '',
      record.statut,
      record.mission_order_number || ''
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pointages_entreprise_${dateRange.start}_${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export CSV généré avec succès');
  };

  // Fonction pour générer et afficher le rapport complet
  const generateFullReport = async () => {
    setLoading(true);
    try {
      // Récupération des données complètes pour le rapport
      const response = await api.get('/admin/attendance/comprehensive-report', {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end
        }
      });
      
      // Navigation vers la page de rapport avec les données
      navigate('/admin/attendance-report', { 
        state: { 
          reportData: response.data,
          period: {
            start: dateRange.start,
            end: dateRange.end
          }
        } 
      });
      
      toast.success('Rapport complet généré avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      toast.error('Erreur lors de la génération du rapport complet');
    } finally {
      setLoading(false);
    }
  };

  // Définir rapidement une période
  const setQuickDateRange = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    
    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  // Appliquer les filtres
  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 })); // Réinitialiser à la première page
    loadAttendanceData();
  };

  // Gérer les changements de page
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.total_pages) return;
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Style CSS pour les badges de statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'retard':
        return 'bg-yellow-100 text-yellow-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et boutons d'action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des pointages</h1>
          <p className="text-gray-600">Consultez et analysez les pointages de votre entreprise</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={generateFullReport}
            className="btn-primary"
            disabled={loading}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Rapport Complet
          </button>
          <button
            onClick={exportToCSV}
            className="btn-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-md bg-green-100 mr-3">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Présences</p>
                  <p className="text-xl font-bold">{stats.present_count}</p>
                </div>
              </div>
              <div className="text-sm text-green-600">
                {Math.round((stats.present_count / stats.total_employees) * 100)}%
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-md bg-yellow-100 mr-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Retards</p>
                  <p className="text-xl font-bold">{stats.late_count}</p>
                </div>
              </div>
              <div className="text-sm text-yellow-600">
                {Math.round((stats.late_count / stats.total_employees) * 100)}%
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-md bg-blue-100 mr-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Heure moyenne d'arrivée</p>
                  <p className="text-xl font-bold">{stats.average_arrival_time}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-md bg-purple-100 mr-3">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Heures travaillées (moy.)</p>
                  <p className="text-xl font-bold">
                    {stats.average_work_hours ? `${Math.floor(stats.average_work_hours)}h${Math.round((stats.average_work_hours % 1) * 60).toString().padStart(2, '0')}` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Filtres</h3>
          <Filter className="h-5 w-5 text-gray-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nom, mission, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Filtre par employé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employé
            </label>
            <select
              value={employeeFilter === 'all' ? 'all' : employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="input-field"
            >
              <option value="all">Tous les employés</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {/* Filtre par statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">Tous les statuts</option>
              <option value="present">Présent</option>
              <option value="retard">Retard</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          {/* Filtre par type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">Tous les types</option>
              <option value="office">Bureau</option>
              <option value="mission">Mission</option>
            </select>
          </div>

          {/* Période rapide */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Période rapide
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setQuickDateRange(1)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                1 mois
              </button>
              <button
                onClick={() => setQuickDateRange(3)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                3 mois
              </button>
              <button
                onClick={() => setQuickDateRange(6)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                6 mois
              </button>
            </div>
          </div>
        </div>

        {/* Sélection de dates personnalisée */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="input-field"
            />
          </div>
        </div>

        {/* Bouton pour appliquer les filtres */}
        <div className="mt-4 flex justify-end">
          <button 
            onClick={applyFilters}
            className="btn-primary"
          >
            Appliquer les filtres
          </button>
        </div>
      </div>

      {/* Résultats */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Résultats ({filteredRecords.length})
          </h3>
          <Filter className="h-5 w-5 text-gray-400" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun pointage trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aucun pointage ne correspond aux critères sélectionnés
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Département/Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horaires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Localisation
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(record.date_pointage), 'd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.user_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{record.user_email || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.department || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{record.service || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {record.type === 'office' ? (
                          <MapPin className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-purple-500" />
                        )}
                        <span className="text-sm text-gray-900 capitalize">
                          {record.type === 'office' ? 'Bureau' : 'Mission'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{record.heure_arrivee}</span>
                        {record.heure_depart && (
                          <>
                            <span className="text-gray-400">-</span>
                            <span>{record.heure_depart}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(record.statut)}`}>
                        {record.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.mission_order_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {record.latitude && record.longitude ? (
                        <a
                          href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Voir sur la carte
                        </a>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                  pagination.page === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Précédent
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.total_pages}
                className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                  pagination.page === pagination.total_pages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de <span className="font-medium">{(pagination.page - 1) * pagination.per_page + 1}</span> à{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.per_page, pagination.total_items)}
                  </span>{' '}
                  sur <span className="font-medium">{pagination.total_items}</span> résultats
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                      pagination.page === 1
                        ? 'text-gray-300'
                        : 'text-gray-500 hover:bg-gray-50 focus:z-20'
                    } border border-gray-300 bg-white`}
                  >
                    <span className="sr-only">Précédent</span>
                    <ChevronDown className="h-5 w-5 rotate-90" />
                  </button>
                  
                  {/* Pages numériques - afficher max 5 pages */}
                  {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                    // Calculer quelle page afficher dans le cas où il y a plus de 5 pages
                    let pageNumber;
                    if (pagination.total_pages <= 5) {
                      pageNumber = i + 1;
                    } else {
                      // Cas où il y a plus de 5 pages
                      if (pagination.page <= 3) {
                        pageNumber = i + 1;
                      } else if (pagination.page >= pagination.total_pages - 2) {
                        pageNumber = pagination.total_pages - 4 + i;
                      } else {
                        pageNumber = pagination.page - 2 + i;
                      }
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border ${
                          pageNumber === pagination.page
                            ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.total_pages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                      pagination.page === pagination.total_pages
                        ? 'text-gray-300'
                        : 'text-gray-500 hover:bg-gray-50 focus:z-20'
                    } border border-gray-300 bg-white`}
                  >
                    <span className="sr-only">Suivant</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistoryAdmin;
