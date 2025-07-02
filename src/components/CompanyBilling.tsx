import React, { useState, useEffect } from 'react'
import { superAdminService } from '../services/api'
import LoadingSpinner from './shared/LoadingSpinner'
import { usePermissions } from '../hooks/usePermissions'
import toast from 'react-hot-toast'
import { DollarSign } from 'lucide-react'

interface Company {
  id: number
  name: string
}

interface Invoice {
  id: number
  amount: number
  months: number
  status: string
  due_date?: string
  paid_date?: string
}

export default function CompanyBilling() {
  const { permissions } = usePermissions()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (permissions.canGlobalManagement) {
      loadCompanies()
    }
  }, [permissions.canGlobalManagement])

  useEffect(() => {
    if (selectedCompany) {
      loadInvoices(selectedCompany)
    }
  }, [selectedCompany])

  const loadCompanies = async () => {
    try {
      const response = await superAdminService.getCompanies()
      const list = response.data.companies || response.data
      setCompanies(list)
    } catch (error) {
      console.error('Erreur chargement entreprises:', error)
    }
  }

  const loadInvoices = async (companyId: number) => {
    try {
      setLoading(true)
      const response = await superAdminService.getCompanyInvoices(companyId)
      setInvoices(response.data.invoices)
    } catch (error) {
      console.error('Erreur chargement factures:', error)
      toast.error('Erreur lors du chargement des factures')
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async (invoiceId: number) => {
    try {
      const response = await superAdminService.payInvoice(invoiceId, {})
      setInvoices(
        invoices.map((inv) => (inv.id === invoiceId ? response.data.invoice : inv))
      )
      toast.success('Facture payée')
    } catch (error) {
      console.error('Erreur paiement facture:', error)
      toast.error('Erreur lors du paiement')
    }
  }

  if (!permissions.canGlobalManagement) {
    return (
      <div className="card text-center">
        <p className="text-gray-600">Accès SuperAdmin requis</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sélectionner une entreprise
        </label>
        <select
          value={selectedCompany || ''}
          onChange={(e) => setSelectedCompany(Number(e.target.value))}
          className="input-field"
        >
          <option value="">-- Choisir --</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner text="Chargement des factures..." />
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Montant</th>
              <th className="px-4 py-2 text-left">Mois</th>
              <th className="px-4 py-2 text-left">Statut</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="px-4 py-2">{inv.id}</td>
                <td className="px-4 py-2">{inv.amount}€</td>
                <td className="px-4 py-2">{inv.months}</td>
                <td className="px-4 py-2">{inv.status}</td>
                <td className="px-4 py-2">
                  {inv.status !== 'paid' && (
                    <button
                      onClick={() => handlePay(inv.id)}
                      className="btn-primary flex items-center"
                    >
                      <DollarSign className="h-4 w-4 mr-1" /> Payer
                    </button>
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
