import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { CheckCircle, XCircle, AlertCircle, Clock, Eye, Download, MessageCircle } from 'lucide-react';
import { LeaveRequest, LeaveRequestStatus, DayPeriod, SupportingDocument } from '../../types/leaveTypes';

/**
 * Composant pour l'approbation des demandes de congés
 * Accessible pour les managers, chefs de service et administrateurs RH
 */
export default function LeaveApprovalPage() {
  const { checkPermission } = usePermissions();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  
  // Vérifier les permissions d'approbation
  const canApproveTeam = checkPermission('leave.approve_team');
  const canApproveDepartment = checkPermission('leave.approve_department');
  const canApproveAll = checkPermission('leave.approve_all');
  
  // Définir le niveau d'accès en fonction des permissions
  const accessLevel = canApproveAll ? 'all' : canApproveDepartment ? 'department' : canApproveTeam ? 'team' : 'none';
  
  // Filtres pour les demandes
  const [filters, setFilters] = useState({
    status: 'pending' as 'all' | 'pending' | 'approved' | 'rejected',
    department: 'all',
    leaveType: 'all',
    dateRange: 'upcoming' as 'upcoming' | 'past' | 'all'
  });
  
  // Fonction pour charger les demandes de congés
  useEffect(() => {
    // Vérifier que l'utilisateur a les permissions nécessaires
    if (!canApproveTeam && !canApproveDepartment && !canApproveAll) {
      setLoading(false);
      return;
    }
    
    const fetchLeaveRequests = async () => {
      setLoading(true);
      try {
        // Simuler l'appel API avec des données de test
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Générer des données de test
        const mockLeaveRequests = generateMockLeaveRequests();
        setLeaveRequests(mockLeaveRequests);
        setError(null);
      } catch (error) {
        setError('Erreur lors du chargement des demandes de congés');
        console.error('Erreur lors du chargement des demandes de congés:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaveRequests();
  }, [canApproveTeam, canApproveDepartment, canApproveAll]);
  
  // Générer des données de test
  const generateMockLeaveRequests = (): LeaveRequest[] => {
    const statuses: LeaveRequestStatus[] = ['pending', 'approved', 'rejected'];
    const dayPeriods: DayPeriod[] = ['full_day', 'half_day_morning', 'half_day_afternoon'];
    const leaveTypes = [
      { id: 1, name: 'Congés payés', color: '#4CAF50', is_paid: true },
      { id: 2, name: 'RTT', color: '#2196F3', is_paid: true },
      { id: 3, name: 'Congé maladie', color: '#F44336', is_paid: true },
      { id: 4, name: 'Congé sans solde', color: '#FF9800', is_paid: false }
    ];
    
    const departments = [
      { id: 1, name: 'IT' },
      { id: 2, name: 'Marketing' },
      { id: 3, name: 'Finance' },
      { id: 4, name: 'RH' }
    ];
    
    const users = [
      {
        id: 1, name: 'Jean Dupont', email: 'jean.dupont@example.com',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
        department: departments[0].name, department_id: departments[0].id,
        position: 'Développeur'
      },
      {
        id: 2, name: 'Marie Martin', email: 'marie.martin@example.com',
        avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
        department: departments[1].name, department_id: departments[1].id,
        position: 'Chef de projet'
      },
      {
        id: 3, name: 'Pierre Durand', email: 'pierre.durand@example.com',
        avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
        department: departments[2].name, department_id: departments[2].id,
        position: 'Comptable'
      },
      {
        id: 4, name: 'Sophie Petit', email: 'sophie.petit@example.com',
        avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
        department: departments[3].name, department_id: departments[3].id,
        position: 'Assistante RH'
      }
    ];
    
    // Générer 15 demandes de congés
    return Array.from({ length: 15 }, (_, i) => {
      const user = users[Math.floor(Math.random() * users.length)];
      const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      const status = statuses[Math.floor(Math.random() * (i < 8 ? 1 : statuses.length))]; // Plus de demandes en attente
      
      // Dates aléatoires
      const today = new Date();
      const startOffset = Math.floor(Math.random() * 60) - 20; // Entre -20 et +40 jours
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + startOffset);
      
      const duration = Math.floor(Math.random() * 8) + 1; // Entre 1 et 8 jours
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + duration - 1);
      
      const startDayPeriod = dayPeriods[Math.floor(Math.random() * dayPeriods.length)];
      const endDayPeriod = dayPeriods[Math.floor(Math.random() * dayPeriods.length)];
      
      return {
        id: i + 1,
        user: user,
        leave_type: leaveType,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        start_day_period: startDayPeriod,
        end_day_period: endDayPeriod,
        requested_days: duration,
        reason: `Demande de ${leaveType.name} pour ${duration} jour(s)`,
        status: status,
        created_at: new Date(startDate.getTime() - 1000 * 60 * 60 * 24 * Math.floor(Math.random() * 7)).toISOString(),
        updated_at: status !== 'pending' ? new Date(startDate.getTime() - 1000 * 60 * 60 * 24 * Math.floor(Math.random() * 3)).toISOString() : undefined,
        approved_at: status === 'approved' ? new Date(startDate.getTime() - 1000 * 60 * 60 * 24 * Math.floor(Math.random() * 2)).toISOString() : undefined,
        approved_by: status === 'approved' ? { id: 5, name: 'Admin Test' } : undefined,
        approval_comment: status !== 'pending' ? `Commentaire pour la demande #${i + 1}` : undefined,
        supporting_documents: Math.random() > 0.7 ? [
          {
            id: i + 100,
            leave_request_id: i + 1,
            filename: `document_${i + 1}.pdf`,
            original_filename: `document_original_${i + 1}.pdf`,
            file_size: Math.floor(Math.random() * 1000000),
            mime_type: 'application/pdf',
            url: '#',
            uploaded_at: startDate.toISOString()
          }
        ] : [],
        team_notified: Math.random() > 0.5
      };
    });
  };
  
  // Filtrer les demandes selon les critères
  const filteredRequests = leaveRequests.filter(request => {
    // Filtre par statut
    const matchStatus = filters.status === 'all' || request.status === filters.status;
    
    // Filtre par département
    const matchDepartment = filters.department === 'all' || 
      (request.user.department_id && request.user.department_id.toString() === filters.department);
    
    // Filtre par type de congé
    const matchType = filters.leaveType === 'all' || 
      request.leave_type.id.toString() === filters.leaveType;
    
    // Filtre par date
    const today = new Date();
    const startDate = new Date(request.start_date);
    
    let matchDate = true;
    if (filters.dateRange === 'upcoming') {
      matchDate = startDate >= today;
    } else if (filters.dateRange === 'past') {
      matchDate = startDate < today;
    }
    
    return matchStatus && matchDepartment && matchType && matchDate;
  });
  
  // Traiter l'approbation ou le rejet d'une demande
  const handleApproval = async (requestId: number, approved: boolean) => {
    // Ici, vous appelleriez votre API pour approuver ou rejeter la demande
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulation de l'appel API
      
      // Mettre à jour l'état localement
      setLeaveRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId 
            ? {
                ...request,
                status: approved ? 'approved' : 'rejected',
                updated_at: new Date().toISOString(),
                approved_at: approved ? new Date().toISOString() : undefined,
                approved_by: { id: 999, name: 'Vous' }, // Normalement l'ID de l'utilisateur connecté
                approval_comment: approvalComment
              }
            : request
        )
      );
      
      // Fermer le modal et réinitialiser les champs
      setModalOpen(false);
      setSelectedRequest(null);
      setApprovalComment('');
      
    } catch (error) {
      console.error("Erreur lors de l'approbation/rejet:", error);
      setError(`Erreur lors de l'${approved ? 'approbation' : 'rejet'} de la demande`);
    } finally {
      setLoading(false);
    }
  };
  
  // Ouvrir le modal de confirmation
  const openApprovalModal = (request: LeaveRequest, approved: boolean) => {
    setSelectedRequest({ ...request, status: approved ? 'approved' : 'rejected' });
    setModalOpen(true);
  };
  
  // Formatter une période de congé (matin/après-midi)
  const formatDayPeriod = (period: DayPeriod) => {
    switch (period) {
      case 'half_day_morning':
        return 'Matin';
      case 'half_day_afternoon':
        return 'Après-midi';
      default:
        return 'Journée complète';
    }
  };
  
  // Formatter la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Si l'utilisateur n'a pas les permissions nécessaires
  if (accessLevel === 'none') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Accès non autorisé</h2>
        <p className="text-gray-600">
          Vous n'avez pas les permissions nécessaires pour approuver des demandes de congés.
        </p>
      </div>
    );
  }
  
  // Afficher un indicateur de chargement
  if (loading && leaveRequests.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Approbation des demandes de congés
        </h2>
        
        {/* Compteurs */}
        <div className="flex flex-wrap gap-4">
          <div className="bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {leaveRequests.filter(r => r.status === 'pending').length} en attente
          </div>
          <div className="bg-green-50 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <CheckCircle className="h-4 w-4 mr-1" />
            {leaveRequests.filter(r => r.status === 'approved').length} approuvées
          </div>
          <div className="bg-red-50 text-red-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <XCircle className="h-4 w-4 mr-1" />
            {leaveRequests.filter(r => r.status === 'rejected').length} rejetées
          </div>
        </div>
      </div>
      
      {/* Filtres */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filtres</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtre par statut */}
          <div>
            <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              id="status-filter"
              name="status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="input-field"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvées</option>
              <option value="rejected">Rejetées</option>
            </select>
          </div>
          
          {/* Filtre par département */}
          <div>
            <label htmlFor="department-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Département
            </label>
            <select
              id="department-filter"
              name="department"
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="input-field"
            >
              <option value="all">Tous les départements</option>
              {Array.from(new Set(leaveRequests.map(r => r.user.department_id)))
                .map(id => {
                  const dept = leaveRequests.find(r => r.user.department_id === id);
                  return dept ? (
                    <option key={id} value={id}>
                      {dept.user.department}
                    </option>
                  ) : null;
                })
              }
            </select>
          </div>
          
          {/* Filtre par type de congé */}
          <div>
            <label htmlFor="leave-type-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Type de congé
            </label>
            <select
              id="leave-type-filter"
              name="leaveType"
              value={filters.leaveType}
              onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
              className="input-field"
            >
              <option value="all">Tous les types</option>
              {Array.from(new Set(leaveRequests.map(r => r.leave_type.id)))
                .map(id => {
                  const type = leaveRequests.find(r => r.leave_type.id === id);
                  return type ? (
                    <option key={id} value={id}>
                      {type.leave_type.name}
                    </option>
                  ) : null;
                })
              }
            </select>
          </div>
          
          {/* Filtre par période */}
          <div>
            <label htmlFor="date-range-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Période
            </label>
            <select
              id="date-range-filter"
              name="dateRange"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
              className="input-field"
            >
              <option value="upcoming">À venir</option>
              <option value="past">Passées</option>
              <option value="all">Toutes les périodes</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Liste des demandes */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}
      
      {filteredRequests.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucune demande ne correspond à vos critères</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durée
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={request.user.avatar || 'https://via.placeholder.com/40'}
                          alt={request.user.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {request.user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.user.department || 'N/A'} • {request.user.position || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      style={{
                        backgroundColor: `${request.leave_type.color}20`,
                        color: request.leave_type.color
                      }}
                    >
                      {request.leave_type.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>Du {formatDate(request.start_date)}</div>
                    <div>({formatDayPeriod(request.start_day_period)})</div>
                    <div>Au {formatDate(request.end_date)}</div>
                    <div>({formatDayPeriod(request.end_day_period)})</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.requested_days} jour{request.requested_days > 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.status === 'pending' ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        En attente
                      </span>
                    ) : request.status === 'approved' ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Approuvé
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Rejeté
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {request.supporting_documents && request.supporting_documents.length > 0 ? (
                      <button
                        className="text-primary-600 hover:text-primary-800"
                        onClick={() => alert(`Téléchargement du document: ${request.supporting_documents![0].original_filename}`)}
                      >
                        <Download className="h-5 w-5" />
                      </button>
                    ) : (
                      <span>Aucun</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        className="text-primary-600 hover:text-primary-800"
                        onClick={() => alert(`Voir détails de la demande #${request.id}`)}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      
                      {request.status === 'pending' && (
                        <>
                          <button
                            className="text-green-600 hover:text-green-800"
                            onClick={() => openApprovalModal(request, true)}
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800"
                            onClick={() => openApprovalModal(request, false)}
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal de confirmation */}
      {modalOpen && selectedRequest && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white rounded-lg max-w-lg w-full m-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {selectedRequest.status === 'approved' ? 'Approuver' : 'Rejeter'} la demande
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Vous êtes sur le point de {selectedRequest.status === 'approved' ? 'approuver' : 'rejeter'} la demande de congé de{' '}
                <span className="font-medium">{selectedRequest.user.name}</span> pour la période du{' '}
                {formatDate(selectedRequest.start_date)} au {formatDate(selectedRequest.end_date)}.
              </p>
            </div>
            
            <div className="mb-6">
              <label htmlFor="approval-comment" className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire (optionnel)
              </label>
              <textarea
                id="approval-comment"
                name="approvalComment"
                rows={3}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder={`Raison ${selectedRequest.status === 'approved' ? 'd\'approbation' : 'du rejet'}...`}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setSelectedRequest(null);
                  setApprovalComment('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleApproval(selectedRequest.id, selectedRequest.status === 'approved')}
                className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  selectedRequest.status === 'approved'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                {selectedRequest.status === 'approved' ? 'Approuver' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
