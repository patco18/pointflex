import React, { useState, useEffect } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import { useApi, useAsyncAction } from '../hooks/useApi'
import { superAdminService } from '../services/api'
import LoadingSpinner from './shared/LoadingSpinner'
import { Check, X, Eye, Calendar, AlertCircle, CheckCircle, Clock, RefreshCcw } from 'lucide-react'
import { format, parseISO, isAfter, formatDistance } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ExtensionRequest {
  id: number
  company_id: number
  company_name?: string
  months: number
  reason?: string
  status: string
  created_at: string
  processed_at?: string
  processed_by?: number
}

interface Company {
  id: number
  name: string
  subscription_plan: string
  subscription_end?: string
}

export default function SubscriptionExtensionRequests() {
  const { permissions } = usePermissions()
  const { data, loading, refetch } = useApi(() => superAdminService.listSubscriptionExtensionRequests(), [])
  const { loading: actionLoading, execute } = useAsyncAction()
  const [selectedRequest, setSelectedRequest] = useState<ExtensionRequest | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null)
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [filter, setFilter] = useState('all') // all, pending, approved, rejected

  if (!permissions.canGlobalManagement) {
    return (
      <div className="card text-center">
        <p className="text-gray-600">Accès SuperAdmin requis</p>
      </div>
    )
  }

  const requests: ExtensionRequest[] = data?.requests || []
  
  // Filtrer les demandes
  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true
    return req.status === filter
  })
  
  // Statistiques
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  }

  const approve = (id: number) =>
    execute(async () => {
      await superAdminService.approveSubscriptionExtensionRequest(id)
      refetch()
      setShowDetailsModal(false)
    }, 'Demande approuvée')

  const reject = (id: number) =>
    execute(async () => {
      await superAdminService.rejectSubscriptionExtensionRequest(id)
      refetch()
      setShowDetailsModal(false)
    }, 'Demande rejetée')
    
  const viewDetails = async (request: ExtensionRequest) => {
    setSelectedRequest(request)
    setShowDetailsModal(true)
    
    // Récupérer les détails de l'entreprise
    try {
      setLoadingCompany(true)
      const response = await superAdminService.getCompany(request.company_id)
      setCompanyDetails(response.data)
    } catch (error) {
      console.error('Error fetching company details:', error)
    } finally {
      setLoadingCompany(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Demandes de prolongation d'abonnement</h1>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setFilter('all')}
            className={`btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          >
            Toutes ({stats.total})
          </button>
          <button 
            onClick={() => setFilter('pending')}
            className={`btn-sm ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'btn-outline'}`}
          >
            En attente ({stats.pending})
          </button>
          <button 
            onClick={() => setFilter('approved')}
            className={`btn-sm ${filter === 'approved' ? 'bg-green-500 text-white' : 'btn-outline'}`}
          >
            Approuvées ({stats.approved})
          </button>
          <button 
            onClick={() => setFilter('rejected')}
            className={`btn-sm ${filter === 'rejected' ? 'bg-red-500 text-white' : 'btn-outline'}`}
          >
            Rejetées ({stats.rejected})
          </button>
        </div>
      </div>
      
      {loading ? (
        <LoadingSpinner text="Chargement des demandes..." />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entreprise</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de demande</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mois</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <tr key={req.id} className={`
                    ${req.status === 'approved' ? 'bg-green-50' : ''}
                    ${req.status === 'rejected' ? 'bg-red-50' : ''}
                    hover:bg-gray-100 transition-colors
                  `}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{req.company_name || `ID ${req.company_id}`}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {req.created_at ? format(parseISO(req.created_at), 'Pp', { locale: fr }) : 'N/A'}
                      <div className="text-xs text-gray-400">
                        {req.created_at ? formatDistance(parseISO(req.created_at), new Date(), { 
                          addSuffix: true,
                          locale: fr 
                        }) : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        +{req.months} mois
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${req.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${req.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {req.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {req.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {req.status === 'rejected' && <X className="h-3 w-3 mr-1" />}
                        {req.status === 'pending' ? 'En attente' : 
                         req.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => viewDetails(req)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" /> Détails
                      </button>
                      
                      {req.status === 'pending' && (
                        <div className="flex space-x-2 mt-1">
                          <button
                            onClick={() => approve(req.id)}
                            disabled={actionLoading}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <Check className="h-4 w-4 mr-1" /> Approuver
                          </button>
                          <button
                            onClick={() => reject(req.id)}
                            disabled={actionLoading}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <X className="h-4 w-4 mr-1" /> Rejeter
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Aucune demande {filter !== 'all' ? `avec le statut "${filter}"` : ''} trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal de détails */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 m-4 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Détails de la demande #{selectedRequest.id}
              </h2>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Entreprise</h3>
                  <p className="font-medium">{selectedRequest.company_name || `ID ${selectedRequest.company_id}`}</p>
                  
                  {loadingCompany ? (
                    <div className="text-sm text-gray-500 mt-2">Chargement...</div>
                  ) : companyDetails ? (
                    <div className="mt-2 space-y-1 text-sm">
                      <div><span className="text-gray-500">Plan actuel:</span> {companyDetails.subscription_plan}</div>
                      {companyDetails.subscription_end && (
                        <div className="flex items-center">
                          <span className="text-gray-500 mr-1">Expiration:</span> 
                          <span className={isAfter(new Date(), parseISO(companyDetails.subscription_end)) ? 'text-red-600 font-medium' : ''}>
                            {format(parseISO(companyDetails.subscription_end), 'dd/MM/yyyy', { locale: fr })}
                            {isAfter(new Date(), parseISO(companyDetails.subscription_end)) && (
                              <span className="ml-1 text-xs bg-red-100 text-red-800 px-1 rounded">
                                Expiré
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Détails de la demande</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-500">Date:</span> {format(parseISO(selectedRequest.created_at), 'Pp', { locale: fr })}</div>
                    <div><span className="text-gray-500">Durée:</span> +{selectedRequest.months} mois</div>
                    <div><span className="text-gray-500">Statut:</span> 
                      <span className={`ml-1 px-2 py-0.5 text-xs font-medium rounded-full
                        ${selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${selectedRequest.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${selectedRequest.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {selectedRequest.status === 'pending' ? 'En attente' : 
                         selectedRequest.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                      </span>
                    </div>
                    {selectedRequest.processed_at && (
                      <div><span className="text-gray-500">Traité le:</span> {format(parseISO(selectedRequest.processed_at), 'Pp', { locale: fr })}</div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedRequest.reason && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Motif de la demande</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.reason}</p>
                </div>
              )}
              
              {selectedRequest.status === 'pending' && (
                <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                  <button
                    onClick={() => reject(selectedRequest.id)}
                    disabled={actionLoading}
                    className="btn-outline flex items-center"
                  >
                    <X className="h-4 w-4 mr-1" /> Rejeter
                  </button>
                  <button
                    onClick={() => approve(selectedRequest.id)}
                    disabled={actionLoading}
                    className="btn-primary flex items-center"
                  >
                    <Check className="h-4 w-4 mr-1" /> Approuver
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
