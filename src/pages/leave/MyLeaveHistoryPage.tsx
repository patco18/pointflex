import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, AlertTriangle, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { LeaveRequest, LeaveRequestStatus } from '../../types/leaveTypes';

/**
 * Page d'historique des demandes de congés personnelles
 * Accessible pour les utilisateurs ayant la permission 'leave.view_personal'
 */
export default function MyLeaveHistoryPage() {
  const navigate = useNavigate();
  const { checkPermission } = usePermissions();
  
  // Vérifier si l'utilisateur a la permission de voir ses congés
  const canViewPersonalLeave = checkPermission('leave.view_personal');
  
  // État pour les demandes de congés
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtres
  const [filters, setFilters] = useState({
    status: 'all',
    year: new Date().getFullYear().toString(),
    leaveType: 'all'
  });
  
  // Types de congés uniques extraits des demandes
  const uniqueLeaveTypes = Array.from(
    new Set(leaveRequests.map(request => request.leave_type.id))
  ).map(id => {
    const leaveType = leaveRequests.find(request => request.leave_type.id === id)?.leave_type;
    return leaveType ? { id: leaveType.id, name: leaveType.name } : null;
  }).filter(Boolean);
  
  // Récupérer les demandes de congés (simulé)
  useEffect(() => {
    if (!canViewPersonalLeave) return;
    
    const fetchLeaveRequests = async () => {
      try {
        setLoading(true);
        
        // Simulation de l'appel API avec un délai
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Exemple de données
        const mockData: LeaveRequest[] = [
          {
            id: 1,
            user: {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              avatar: '/avatars/john.jpg'
            },
            leave_type: {
              id: 1,
              name: 'Congés payés',
              color: '#4CAF50',
              is_paid: true
            },
            start_date: '2023-12-20',
            end_date: '2023-12-25',
            start_day_period: 'full_day',
            end_day_period: 'full_day',
            requested_days: 6,
            reason: 'Vacances de Noël',
            status: 'approved',
            created_at: '2023-11-15T10:30:00Z',
            updated_at: '2023-11-16T14:20:00Z',
            approved_at: '2023-11-16T14:20:00Z',
            approved_by: {
              id: 5,
              name: 'Manager Smith'
            },
            team_notified: true
          },
          {
            id: 2,
            user: {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              avatar: '/avatars/john.jpg'
            },
            leave_type: {
              id: 2,
              name: 'RTT',
              color: '#2196F3',
              is_paid: true
            },
            start_date: '2024-01-15',
            end_date: '2024-01-15',
            start_day_period: 'full_day',
            end_day_period: 'full_day',
            requested_days: 1,
            status: 'pending',
            created_at: '2024-01-02T09:15:00Z',
            team_notified: true
          },
          {
            id: 3,
            user: {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              avatar: '/avatars/john.jpg'
            },
            leave_type: {
              id: 3,
              name: 'Congé maladie',
              color: '#F44336',
              is_paid: true
            },
            start_date: '2023-10-05',
            end_date: '2023-10-07',
            start_day_period: 'full_day',
            end_day_period: 'full_day',
            requested_days: 3,
            reason: 'Grippe',
            status: 'approved',
            created_at: '2023-10-05T08:00:00Z',
            updated_at: '2023-10-05T10:15:00Z',
            approved_at: '2023-10-05T10:15:00Z',
            approved_by: {
              id: 5,
              name: 'Manager Smith'
            },
            team_notified: true
          }
        ];
        
        setLeaveRequests(mockData);
        setError(null);
      } catch (err) {
        setError('Erreur lors de la récupération des demandes de congés');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaveRequests();
  }, [canViewPersonalLeave]);
  
  // Filtrer les demandes de congés
  const filteredLeaveRequests = leaveRequests.filter(request => {
    const matchStatus = filters.status === 'all' || request.status === filters.status;
    const requestYear = new Date(request.start_date).getFullYear().toString();
    const matchYear = filters.year === 'all' || requestYear === filters.year;
    const matchType = filters.leaveType === 'all' || request.leave_type.id === Number(filters.leaveType);
    
    return matchStatus && matchYear && matchType;
  });
  
  // Fonction pour formatter la date
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };
  
  // Obtenir les années uniques pour le filtre
  const uniqueYears = Array.from(
    new Set(leaveRequests.map(request => new Date(request.start_date).getFullYear()))
  ).sort((a, b) => b - a);
  
  // Si l'utilisateur n'a pas la permission, afficher un message d'erreur
  if (!canViewPersonalLeave) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Accès non autorisé</h2>
        <p className="text-gray-600">Vous n'avez pas la permission de voir vos congés.</p>
      </div>
    );
  }
  
  // Afficher un indicateur de chargement
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Afficher un message d'erreur si nécessaire
  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">{error}</h3>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Historique de mes congés</h2>
      
      {/* Bouton pour créer une nouvelle demande */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/leave/request')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Nouvelle demande
        </button>
      </div>
      
      {/* Filtres */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtre par statut */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
              Statut
            </label>
            <select
              id="status-filter"
              name="status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Refusé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          
          {/* Filtre par année */}
          <div>
            <label htmlFor="year-filter" className="block text-sm font-medium text-gray-700">
              Année
            </label>
            <select
              id="year-filter"
              name="year"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">Toutes les années</option>
              {uniqueYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filtre par type de congé */}
          <div>
            <label htmlFor="leave-type-filter" className="block text-sm font-medium text-gray-700">
              Type de congé
            </label>
            <select
              id="leave-type-filter"
              name="leaveType"
              value={filters.leaveType}
              onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">Tous les types</option>
              {uniqueLeaveTypes.map(type => type && (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Liste des demandes de congés */}
      {filteredLeaveRequests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md p-6 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune demande de congé</h3>
          <p className="mt-1 text-sm text-gray-500">
            Vous n'avez pas encore fait de demande de congé correspondant aux filtres.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Période
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Type
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Jours
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Statut
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Date demande
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredLeaveRequests.map(request => (
                <tr key={request.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                      style={{ 
                        backgroundColor: `${request.leave_type.color}20`,
                        color: request.leave_type.color 
                      }}
                    >
                      {request.leave_type.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {request.requested_days} jour(s)
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    {request.status === 'pending' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="mr-1 h-3 w-3" />
                        En attente
                      </span>
                    )}
                    {request.status === 'approved' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Approuvé
                      </span>
                    )}
                    {request.status === 'rejected' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="mr-1 h-3 w-3" />
                        Refusé
                      </span>
                    )}
                    {request.status === 'cancelled' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <XCircle className="mr-1 h-3 w-3" />
                        Annulé
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {formatDate(request.created_at)}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={() => navigate(`/leave/details/${request.id}`)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Détails
                    </button>
                    
                    {/* Bouton d'annulation pour les demandes en attente */}
                    {request.status === 'pending' && (
                      <button
                        onClick={() => {
                          // Logique d'annulation à implémenter
                          alert(`Annulation de la demande ${request.id}`);
                        }}
                        className="ml-4 text-red-600 hover:text-red-900"
                      >
                        Annuler
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
