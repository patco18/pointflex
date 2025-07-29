import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  Bell, 
  Search, 
  Filter, 
  ChevronDown, 
  Calendar, 
  Clock,
  Mail,
  AlertCircle,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: number;
  user_id: number;
  user_email?: string;
  user_name?: string;
  company_name?: string;
  company_id?: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationFilter {
  userId: string;
  isRead: string;
  searchQuery: string;
  dateRange: {
    start: string | null;
    end: string | null;
  };
}

const AdminNotificationsHistory: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [perPage, setPerPage] = useState<number>(10);
  const [filters, setFilters] = useState<NotificationFilter>({
    userId: '',
    isRead: '',
    searchQuery: '',
    dateRange: {
      start: null,
      end: null
    }
  });
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  
  useEffect(() => {
    fetchNotifications();
  }, [page, perPage]);
  
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = {
        page: page,
        perPage: perPage,
        isSuperAdmin: isSuperAdmin
      } as any;
      
      if (filters.userId) params.userId = parseInt(filters.userId);
      if (filters.isRead) params.isRead = filters.isRead === 'read';
      if (filters.searchQuery) params.searchQuery = filters.searchQuery;
      if (filters.dateRange.start) params.startDate = filters.dateRange.start;
      if (filters.dateRange.end) params.endDate = filters.dateRange.end;

      const response = await adminService.getNotificationsHistory(params);
      
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setTotalPages(response.data.pagination.pages || 1);
        setTotalCount(response.data.pagination.total || 0);
      } else {
        toast.error("Erreur lors du chargement des notifications");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique des notifications:", error);
      toast.error("Erreur lors du chargement des notifications");
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (name: keyof NotificationFilter, value: any) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Réinitialiser à la première page lors d'un changement de filtre
  };
  
  const handleDateRangeChange = (key: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [key]: value
      }
    }));
    setPage(1);
  };
  
  const resetFilters = () => {
    setFilters({
      userId: '',
      isRead: '',
      searchQuery: '',
      dateRange: {
        start: null,
        end: null
      }
    });
    setPage(1);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotifications();
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd MMM yyyy, HH:mm', { locale: fr });
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Bell className="h-6 w-6 mr-2 text-blue-600" />
          <h1 className="text-2xl font-bold">Historique des notifications</h1>
        </div>
        <button
          className="text-sm bg-blue-50 text-blue-600 px-3 py-2 rounded-md flex items-center hover:bg-blue-100"
          onClick={fetchNotifications}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Actualiser
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <form onSubmit={handleSearch} className="w-full sm:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher dans les messages..."
                  className="pl-10 pr-4 py-2 border rounded-md w-full sm:w-64"
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </form>
            
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                className="flex items-center text-sm bg-white border px-3 py-2 rounded-md hover:bg-gray-50"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtrer
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
              
              {Object.values(filters).some(v => 
                v !== '' && v !== null && 
                (typeof v !== 'object' || 
                 (v.start !== null || v.end !== null))
              ) && (
                <button
                  className="text-sm text-red-600 hover:text-red-800"
                  onClick={resetFilters}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>
        
        {isFilterOpen && (
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Utilisateur</label>
                <input
                  type="number"
                  placeholder="Filtrer par ID utilisateur"
                  className="w-full border rounded-md p-2"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut de lecture</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={filters.isRead}
                  onChange={(e) => handleFilterChange('isRead', e.target.value)}
                >
                  <option value="">Tous</option>
                  <option value="read">Lu</option>
                  <option value="unread">Non lu</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    className="w-full pl-10 border rounded-md p-2"
                    value={filters.dateRange.start || ''}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    className="w-full pl-10 border rounded-md p-2"
                    value={filters.dateRange.end || ''}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b px-4 py-2">
          <p className="text-gray-700">
            Affichage de <span className="font-semibold">{notifications.length}</span> notification(s) sur un total de <span className="font-semibold">{totalCount}</span>
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Aucune notification trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entreprise
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notifications.map(notification => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{notification.user_name || 'Utilisateur #' + notification.user_id}</p>
                        <p className="text-gray-500">{notification.user_email || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="text-gray-900">{notification.company_name || 'N/A'}</p>
                        <p className="text-gray-500">ID: {notification.company_id || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">
                        {notification.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {notification.is_read ? (
                        <div className="flex items-center text-green-600">
                          <Check className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">Lu</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">Non lu</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          {formatDate(notification.created_at).split(',')[0]}
                        </div>
                        <div className="flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1 text-gray-400" />
                          {formatDate(notification.created_at).split(',')[1]}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(prevPage => Math.max(prevPage - 1, 1))}
                disabled={page === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${page === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(prevPage => Math.min(prevPage + 1, totalPages))}
                disabled={page === totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${page === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de la page <span className="font-medium">{page}</span> sur <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(prevPage => Math.max(prevPage - 1, 1))}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${page === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <span className="sr-only">Précédent</span>
                    <ChevronDown className="h-5 w-5 rotate-90" />
                  </button>
                  
                  {/* Pages numériques - afficher max 5 pages */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    
                    if (totalPages <= 5) {
                      // Moins de 5 pages, afficher 1 à totalPages
                      pageNumber = i + 1;
                    } else if (page <= 3) {
                      // Près du début, afficher 1-5
                      pageNumber = i + 1;
                    } else if (page >= totalPages - 2) {
                      // Près de la fin, afficher les 5 dernières pages
                      pageNumber = totalPages - 4 + i;
                    } else {
                      // Au milieu, afficher page-2 à page+2
                      pageNumber = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border ${
                          page === pageNumber 
                            ? 'bg-blue-50 border-blue-500 text-blue-600' 
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        } text-sm font-medium`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setPage(prevPage => Math.min(prevPage + 1, totalPages))}
                    disabled={page === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${page === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <span className="sr-only">Suivant</span>
                    <ChevronDown className="h-5 w-5 -rotate-90" />
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

export default AdminNotificationsHistory;
