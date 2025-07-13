import React from 'react'
import { usePermissions } from '../hooks/usePermissions'
import { useApi, useAsyncAction } from '../hooks/useApi'
import { superAdminService } from '../services/api'
import LoadingSpinner from './shared/LoadingSpinner'
import { Check, X } from 'lucide-react'

interface ExtensionRequest {
  id: number
  company_id: number
  company_name?: string
  months: number
  reason?: string
  status: string
  created_at: string
}

export default function SubscriptionExtensionRequests() {
  const { permissions } = usePermissions()
  const { data, loading, refetch } = useApi(() => superAdminService.listSubscriptionExtensionRequests(), [])
  const { loading: actionLoading, execute } = useAsyncAction()

  if (!permissions.canGlobalManagement) {
    return (
      <div className="card text-center">
        <p className="text-gray-600">Accès SuperAdmin requis</p>
      </div>
    )
  }

  const requests: ExtensionRequest[] = data?.requests || []

  const approve = (id: number) =>
    execute(async () => {
      await superAdminService.approveSubscriptionExtensionRequest(id)
      refetch()
    }, 'Demande approuvée')

  const reject = (id: number) =>
    execute(async () => {
      await superAdminService.rejectSubscriptionExtensionRequest(id)
      refetch()
    }, 'Demande rejetée')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Demandes de prolongation d\'abonnement</h1>
      {loading ? (
        <LoadingSpinner text="Chargement des demandes..." />
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Entreprise</th>
              <th className="px-4 py-2 text-left">Mois</th>
              <th className="px-4 py-2 text-left">Raison</th>
              <th className="px-4 py-2 text-left">Statut</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className="border-t">
                <td className="px-4 py-2">{req.company_name || `ID ${req.company_id}`}</td>
                <td className="px-4 py-2">{req.months}</td>
                <td className="px-4 py-2">{req.reason || '-'}</td>
                <td className="px-4 py-2 capitalize">{req.status}</td>
                <td className="px-4 py-2 space-x-2">
                  {req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => approve(req.id)}
                        disabled={actionLoading}
                        className="btn-primary btn-xs"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => reject(req.id)}
                        disabled={actionLoading}
                        className="btn-danger btn-xs"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
