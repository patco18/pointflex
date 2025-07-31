import React, { useState, useEffect } from 'react';
import { leaveService } from '../../services/api';
import toast from 'react-hot-toast';
import { Check, X, MessageCircle, Clock, Calendar, User, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

interface LeaveRequest {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    department?: string;
    position?: string;
  };
  leave_type: {
    id: number;
    name: string;
    color?: string;
    is_paid: boolean;
  };
  start_date: string;
  end_date: string;
  start_day_period: 'full_day' | 'half_day_morning' | 'half_day_afternoon';
  end_day_period: 'full_day' | 'half_day_morning' | 'half_day_afternoon';
  requested_days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  substitute_user?: {
    id: number;
    name: string;
  };
  supporting_documents?: {
    id: number;
    filename: string;
    url: string;
  }[];
}

interface LeaveApprovalSystemProps {
  onlyPending?: boolean;
  userId?: number;
  maxItems?: number;
  showPagination?: boolean;
  showFilters?: boolean;
}

export default function LeaveApprovalSystem({
  onlyPending = true,
  userId,
  maxItems = 10,
  showPagination = true,
  showFilters = true
}: LeaveApprovalSystemProps) {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [approverComment, setApproverComment] = useState('');
  const [processing, setProcessing] = useState<'approve' | 'reject' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    status: onlyPending ? 'pending' : '',
    startDate: '',
    endDate: '',
    departmentId: '',
    leaveTypeId: ''
  });

  // Charger les demandes de congés à approuver
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      setIsLoading(true);
      try {
        // const response = await leaveService.getLeaveRequestsToApprove({
        //   page,
        //   per_page: maxItems,
        //   status: filters.status || undefined,
        //   start_date: filters.startDate || undefined,
        //   end_date: filters.endDate || undefined,
        //   department_id: filters.departmentId || undefined,
        //   leave_type_id: filters.leaveTypeId || undefined,
        //   user_id: userId || undefined
        // });
        
        // setLeaveRequests(response.data.requests || []);
        // setTotalPages(response.data.pagination?.total_pages || 1);
        
        // MOCK DATA en attendant l'API
        setLeaveRequests(generateMockLeaveRequests());
        setTotalPages(3);
      } catch (error) {
        console.error("Erreur lors du chargement des demandes de congés:", error);
        toast.error("Impossible de charger les demandes de congés.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLeaveRequests();
  }, [page, filters, userId, maxItems, onlyPending]);
  
  // Fonction pour générer des données fictives pour le développement
  const generateMockLeaveRequests = (): LeaveRequest[] => {
    const users = [
      { id: 1, name: 'Jean Dupont', email: 'jean.dupont@example.com', department: 'IT', position: 'Développeur' },
      { id: 2, name: 'Marie Martin', email: 'marie.martin@example.com', department: 'Marketing', position: 'Chef de projet' },
      { id: 3, name: 'Pierre Durand', email: 'pierre.durand@example.com', department: 'Finance', position: 'Comptable' }
    ];
    
    const leaveTypes = [
      { id: 1, name: 'Congés payés', color: '#3B82F6', is_paid: true },
      { id: 2, name: 'RTT', color: '#10B981', is_paid: true },
      { id: 3, name: 'Maladie', color: '#F59E0B', is_paid: true },
      { id: 4, name: 'Congé sans solde', color: '#EF4444', is_paid: false }
    ];
    
    const dayPeriods = ['full_day', 'half_day_morning', 'half_day_afternoon'];
    const statuses = onlyPending ? ['pending'] : ['pending', 'approved', 'rejected'];
    
    return Array.from({ length: 5 }, (_, i) => {
      const user = users[Math.floor(Math.random() * users.length)];
      const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Dates aléatoires pour les congés
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 30));
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + Math.floor(Math.random() * 5) + 1);
      
      // Périodes aléatoires
      const startDayPeriod = dayPeriods[Math.floor(Math.random() * dayPeriods.length)] as any;
      const endDayPeriod = dayPeriods[Math.floor(Math.random() * dayPeriods.length)] as any;
      
      // Nombre de jours demandés
      const requestedDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Documents justificatifs (optionnels)
      const hasDocs = Math.random() > 0.7;
      const docs = hasDocs ? [
        { id: i * 10 + 1, filename: 'justificatif.pdf', url: '#' },
        { id: i * 10 + 2, filename: 'certificat.jpg', url: '#' }
      ] : undefined;
      
      // Remplaçant (optionnel)
      const hasSubstitute = Math.random() > 0.5;
      const substituteUser = hasSubstitute ? {
        id: 10 + Math.floor(Math.random() * 3),
        name: ['Alex Martin', 'Sophie Bernard', 'Thomas Petit'][Math.floor(Math.random() * 3)]
      } : undefined;
      
      return {
        id: i + 1,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          department: user.department,
          position: user.position
        },
        leave_type: leaveType,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        start_day_period: startDayPeriod,
        end_day_period: endDayPeriod,
        requested_days: requestedDays,
        reason: Math.random() > 0.3 ? 'Congé familial' : undefined,
        status: status as any,
        created_at: new Date(currentDate.setDate(currentDate.getDate() - Math.floor(Math.random() * 10))).toISOString(),
        substitute_user: substituteUser,
        supporting_documents: docs
      };
    });
  };
  
  // Formater l'affichage des périodes de congé
  const formatPeriod = (period: string) => {
    if (period === 'half_day_morning') return 'Matin';
    if (period === 'half_day_afternoon') return 'Après-midi';
    return 'Journée entière';
  };
  
  // Approuver une demande de congé
  const approveLeaveRequest = async (id: number) => {
    setProcessing('approve');
    try {
      // Appeler l'API pour approuver la demande
      // await leaveService.approveLeaveRequest(id, { comment: approverComment });
      
      // MOCK pour simulation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Demande de congé approuvée avec succès");
      
      // Mettre à jour la liste des demandes
      setLeaveRequests(prevRequests => prevRequests.map(req => 
        req.id === id ? { ...req, status: 'approved' } : req
      ));
      
      setShowModal(false);
      setApproverComment('');
    } catch (error) {
      console.error("Erreur lors de l'approbation de la demande:", error);
      toast.error("Impossible d'approuver la demande de congé.");
    } finally {
      setProcessing(null);
    }
  };
  
  // Rejeter une demande de congé
  const rejectLeaveRequest = async (id: number) => {
    if (!approverComment) {
      toast.error("Veuillez fournir un commentaire expliquant la raison du refus.");
      return;
    }
    
    setProcessing('reject');
    try {
      // Appeler l'API pour rejeter la demande
      // await leaveService.rejectLeaveRequest(id, { comment: approverComment });
      
      // MOCK pour simulation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Demande de congé rejetée");
      
      // Mettre à jour la liste des demandes
      setLeaveRequests(prevRequests => prevRequests.map(req => 
        req.id === id ? { ...req, status: 'rejected' } : req
      ));
      
      setShowModal(false);
      setApproverComment('');
    } catch (error) {
      console.error("Erreur lors du rejet de la demande:", error);
      toast.error("Impossible de rejeter la demande de congé.");
    } finally {
      setProcessing(null);
    }
  };
  
  // Ouvrir le modal de détails
  const openRequestDetails = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowModal(true);
    setApproverComment('');
  };
  
  // Fermer le modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setApproverComment('');
    setProcessing(null);
  };
  
  // Télécharger un document justificatif
  const downloadDocument = (url: string, filename: string) => {
    // Dans une implémentation réelle, utilisez l'API pour télécharger le fichier
    toast.success(`Téléchargement de ${filename}`);
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-primary-600 text-white px-6 py-4">
        <h2 className="text-xl font-medium flex items-center">
          <Check className="h-6 w-6 mr-2" />
          Approbation des Demandes de Congés
        </h2>
        <p className="mt-1 text-sm text-primary-100">
          Gérez et approuvez les demandes de congés de votre équipe.
        </p>
      </div>
      
      {/* Filtres */}
      {showFilters && (
        <div className="px-6 py-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!onlyPending && (
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  id="status"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="input-field"
                >
                  <option value="">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvé</option>
                  <option value="rejected">Rejeté</option>
                </select>
              </div>
            )}
            
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                id="startDate"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="input-field"
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                id="endDate"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setFilters({
                  status: onlyPending ? 'pending' : '',
                  startDate: '',
                  endDate: '',
                  departmentId: '',
                  leaveTypeId: ''
                });
                setPage(1);
              }}
              className="btn-secondary mr-2"
            >
              Réinitialiser
            </button>
            <button
              onClick={() => setPage(1)}
              className="btn-primary"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
      
      {/* Liste des demandes */}
      {isLoading ? (
        <div className="p-6 flex justify-center">
          <LoadingSpinner text="Chargement des demandes..." />
        </div>
      ) : leaveRequests.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <p className="font-medium">Aucune demande de congé à afficher</p>
          <p className="text-sm mt-1">
            {filters.status === 'pending' ? 
              "Il n'y a actuellement aucune demande en attente d'approbation." : 
              "Aucune demande ne correspond aux critères sélectionnés."
            }
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type de congé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Demandé le
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {request.user.avatar ? (
                          <img className="h-10 w-10 rounded-full" src={request.user.avatar} alt="" />
                        ) : (
                          <User className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{request.user.name}</div>
                        <div className="text-sm text-gray-500">
                          {request.user.department}{request.user.position ? ` - ${request.user.position}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                      style={{ 
                        backgroundColor: `${request.leave_type.color}20`, 
                        color: request.leave_type.color 
                      }}
                    >
                      {request.leave_type.name}
                    </span>
                    <span className="text-xs text-gray-500 block mt-1">
                      {request.leave_type.is_paid ? 'Payé' : 'Non payé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPeriod(request.start_day_period)} - {formatPeriod(request.end_day_period)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {request.requested_days} jour{request.requested_days > 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full 
                      ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        request.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        'bg-red-100 text-red-800'}`}
                    >
                      {request.status === 'pending' ? 'En attente' : 
                       request.status === 'approved' ? 'Approuvé' : 'Refusé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => openRequestDetails(request)} 
                      className="text-primary-600 hover:text-primary-800 mr-3"
                    >
                      Détails
                    </button>
                    {request.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => {
                            setSelectedRequest(request);
                            approveLeaveRequest(request.id);
                          }} 
                          className="text-green-600 hover:text-green-800 mr-3"
                        >
                          Approuver
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal(true);
                          }} 
                          className="text-red-600 hover:text-red-800"
                        >
                          Refuser
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="px-6 py-3 flex justify-center border-t">
          <nav className="pagination">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`pagination-item ${page === i + 1 ? 'active' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </nav>
        </div>
      )}
      
      {/* Modal de détails et confirmation */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Détails de la Demande de Congé
              </h3>
              <button 
                onClick={closeModal} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              {/* Informations sur la demande */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Employé</p>
                  <p className="font-medium">{selectedRequest.user.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedRequest.user.department} {selectedRequest.user.position ? ` - ${selectedRequest.user.position}` : ''}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Type de congé</p>
                  <p className="font-medium">{selectedRequest.leave_type.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedRequest.leave_type.is_paid ? 'Congé payé' : 'Congé non payé'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Période</p>
                  <p className="font-medium">
                    {new Date(selectedRequest.start_date).toLocaleDateString()} au {new Date(selectedRequest.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatPeriod(selectedRequest.start_day_period)} - {formatPeriod(selectedRequest.end_day_period)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Durée</p>
                  <p className="font-medium">
                    {selectedRequest.requested_days} jour{selectedRequest.requested_days > 1 ? 's' : ''}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Date de la demande</p>
                  <p className="font-medium">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full 
                    ${selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      selectedRequest.status === 'approved' ? 'bg-green-100 text-green-800' : 
                      'bg-red-100 text-red-800'}`}
                  >
                    {selectedRequest.status === 'pending' ? 'En attente' : 
                     selectedRequest.status === 'approved' ? 'Approuvé' : 'Refusé'}
                  </span>
                </div>
              </div>
              
              {/* Informations supplémentaires */}
              <div className="space-y-4 mb-6">
                {/* Motif */}
                {selectedRequest.reason && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Motif</p>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      {selectedRequest.reason}
                    </div>
                  </div>
                )}
                
                {/* Remplaçant */}
                {selectedRequest.substitute_user && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Remplaçant pendant l'absence</p>
                    <div className="bg-gray-50 p-3 rounded-md text-sm flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {selectedRequest.substitute_user.name}
                    </div>
                  </div>
                )}
                
                {/* Documents justificatifs */}
                {selectedRequest.supporting_documents && selectedRequest.supporting_documents.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Documents justificatifs</p>
                    <div className="space-y-2">
                      {selectedRequest.supporting_documents.map(doc => (
                        <div key={doc.id} className="bg-gray-50 p-3 rounded-md text-sm flex items-center justify-between">
                          <span>{doc.filename}</span>
                          <button 
                            onClick={() => downloadDocument(doc.url, doc.filename)} 
                            className="text-primary-600 hover:text-primary-800"
                          >
                            Télécharger
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Commentaire de l'approbateur */}
              {selectedRequest.status === 'pending' && (
                <div className="mb-6">
                  <label htmlFor="approverComment" className="block text-sm font-medium text-gray-700 mb-1">
                    <div className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Votre commentaire (requis pour un refus)
                    </div>
                  </label>
                  <textarea 
                    id="approverComment"
                    value={approverComment}
                    onChange={(e) => setApproverComment(e.target.value)}
                    rows={3}
                    className="input-field"
                    placeholder="Expliquez votre décision ici..."
                  ></textarea>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="px-6 py-4 border-t flex justify-end space-x-4">
              <button 
                onClick={closeModal} 
                className="btn-secondary"
              >
                Fermer
              </button>
              
              {selectedRequest.status === 'pending' && (
                <>
                  <button 
                    onClick={() => approveLeaveRequest(selectedRequest.id)} 
                    className="btn-success flex items-center"
                    disabled={processing !== null}
                  >
                    {processing === 'approve' ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Approuver
                  </button>
                  
                  <button 
                    onClick={() => rejectLeaveRequest(selectedRequest.id)} 
                    className="btn-danger flex items-center"
                    disabled={processing !== null}
                  >
                    {processing === 'reject' ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Refuser
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
