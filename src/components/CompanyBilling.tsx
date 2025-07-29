import React, { useState, useEffect } from 'react'
import { superAdminService } from '../services/api'
import LoadingSpinner from './shared/LoadingSpinner'
import { usePermissions } from '../hooks/usePermissions'
import toast from 'react-hot-toast'
import { DollarSign, Plus, Send, FileText, Filter, X, AlertCircle, CheckCircle, Calendar, Download } from 'lucide-react'
import { format, parseISO, isAfter } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Company {
  id: number
  name: string
  subscription_plan?: string
  stripe_customer_id?: string
}

interface Invoice {
  id: number
  company_id: number
  amount: number
  months: number
  description: string
  status: string
  due_date?: string
  paid_date?: string
  created_at: string
  updated_at: string
}

interface InvoiceStats {
  total: number
  paid: number
  pending: number
  overdue: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
}

interface InvoiceFilters {
  status: string | null
  fromDate: string | null
  toDate: string | null
  minAmount: number | null
  maxAmount: number | null
}

export default function CompanyBilling() {
  const { permissions } = usePermissions()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showNewInvoiceForm, setShowNewInvoiceForm] = useState(false)
  const [newInvoice, setNewInvoice] = useState({
    amount: 0,
    months: 1,
    description: '',
    due_date: ''
  })
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0
  })
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: null,
    fromDate: null,
    toDate: null,
    minAmount: null,
    maxAmount: null
  })

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

  // Appliquer les filtres quand les factures ou les filtres changent
  useEffect(() => {
    applyFilters()
  }, [invoices, filters])

  // Calculer les statistiques quand les factures changent
  useEffect(() => {
    calculateStats(filteredInvoices)
  }, [filteredInvoices])

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
  
  const calculateStats = (invoiceList: Invoice[]) => {
    const today = new Date()
    
    const newStats: InvoiceStats = {
      total: invoiceList.length,
      paid: 0,
      pending: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0
    }
    
    invoiceList.forEach(inv => {
      newStats.totalAmount += inv.amount
      
      if (inv.status === 'paid') {
        newStats.paid += 1
        newStats.paidAmount += inv.amount
      } else {
        newStats.pending += 1
        newStats.pendingAmount += inv.amount
        
        // Vérifier si la facture est en retard
        if (inv.due_date && isAfter(today, parseISO(inv.due_date))) {
          newStats.overdue += 1
        }
      }
    })
    
    setStats(newStats)
  }
  
  const applyFilters = () => {
    let filtered = [...invoices]
    
    if (filters.status) {
      filtered = filtered.filter(inv => inv.status === filters.status)
    }
    
    if (filters.fromDate) {
      filtered = filtered.filter(inv => 
        inv.created_at && isAfter(parseISO(inv.created_at), parseISO(filters.fromDate!))
      )
    }
    
    if (filters.toDate) {
      filtered = filtered.filter(inv => 
        inv.created_at && !isAfter(parseISO(inv.created_at), parseISO(filters.toDate!))
      )
    }
    
    if (filters.minAmount !== null) {
      filtered = filtered.filter(inv => inv.amount >= filters.minAmount!)
    }
    
    if (filters.maxAmount !== null) {
      filtered = filtered.filter(inv => inv.amount <= filters.maxAmount!)
    }
    
    setFilteredInvoices(filtered)
  }
  
  const resetFilters = () => {
    setFilters({
      status: null,
      fromDate: null,
      toDate: null,
      minAmount: null,
      maxAmount: null
    })
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
  
  const handleCreateInvoice = async () => {
    if (!selectedCompany) {
      toast.error('Veuillez sélectionner une entreprise')
      return
    }
    
    if (newInvoice.amount <= 0) {
      toast.error('Le montant doit être supérieur à 0')
      return
    }
    
    try {
      // Supposons que nous avons ce service API
      const response = await superAdminService.createInvoice(selectedCompany, newInvoice)
      setInvoices([...invoices, response.data.invoice])
      
      // Réinitialiser le formulaire
      setNewInvoice({
        amount: 0,
        months: 1,
        description: '',
        due_date: ''
      })
      
      setShowNewInvoiceForm(false)
      toast.success('Facture créée avec succès')
    } catch (error) {
      console.error('Erreur création facture:', error)
      toast.error('Erreur lors de la création de la facture')
    }
  }
  
  const handleSendReminder = async (invoiceId: number) => {
    try {
      // Supposons que nous avons ce service API
      await superAdminService.sendInvoiceReminder(invoiceId)
      toast.success('Rappel envoyé avec succès')
    } catch (error) {
      console.error('Erreur envoi rappel:', error)
      toast.error('Erreur lors de l\'envoi du rappel')
    }
  }
  
  const handleDownloadInvoice = async (invoiceId: number) => {
    try {
      // Supposons que nous avons ce service API
      const response = await superAdminService.downloadInvoicePdf(invoiceId)
      
      // Créer un lien pour télécharger le PDF
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `facture-${invoiceId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
    } catch (error) {
      console.error('Erreur téléchargement facture:', error)
      toast.error('Erreur lors du téléchargement de la facture')
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
      <h1 className="text-2xl font-bold text-gray-900">Gestion de la facturation</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sélectionner une entreprise
            </label>
            <select
              value={selectedCompany || ''}
              onChange={(e) => setSelectedCompany(Number(e.target.value))}
              className="input-field w-full"
            >
              <option value="">-- Choisir une entreprise --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCompany && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewInvoiceForm(!showNewInvoiceForm)}
                className="btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" /> Nouvelle facture
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn flex items-center ${showFilters ? 'btn-secondary' : 'btn-outline'}`}
              >
                <Filter className="h-4 w-4 mr-1" /> Filtres
              </button>
            </div>
          )}
        </div>

        {showNewInvoiceForm && (
          <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
            <h3 className="text-lg font-medium mb-4">Créer une nouvelle facture</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
                <input
                  type="number"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: parseFloat(e.target.value) })}
                  className="input-field w-full"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                <input
                  type="number"
                  value={newInvoice.months}
                  onChange={(e) => setNewInvoice({ ...newInvoice, months: parseInt(e.target.value) })}
                  className="input-field w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
                <input
                  type="date"
                  value={newInvoice.due_date}
                  onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newInvoice.description}
                  onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                  className="input-field w-full"
                  placeholder="Ex: Abonnement mensuel"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowNewInvoiceForm(false)}
                className="btn-outline mr-2"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateInvoice}
                className="btn-primary"
              >
                Créer la facture
              </button>
            </div>
          </div>
        )}

        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Filtres</h3>
              <button
                onClick={resetFilters}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <X className="h-3 w-3 mr-1" /> Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value || null })}
                  className="input-field w-full"
                >
                  <option value="">Tous</option>
                  <option value="pending">En attente</option>
                  <option value="paid">Payé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                <input
                  type="date"
                  value={filters.fromDate || ''}
                  onChange={(e) => setFilters({ ...filters, fromDate: e.target.value || null })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                <input
                  type="date"
                  value={filters.toDate || ''}
                  onChange={(e) => setFilters({ ...filters, toDate: e.target.value || null })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant min (€)</label>
                <input
                  type="number"
                  value={filters.minAmount || ''}
                  onChange={(e) => setFilters({ ...filters, minAmount: e.target.value ? parseFloat(e.target.value) : null })}
                  className="input-field w-full"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant max (€)</label>
                <input
                  type="number"
                  value={filters.maxAmount || ''}
                  onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value ? parseFloat(e.target.value) : null })}
                  className="input-field w-full"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        )}

        {selectedCompany && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-blue-500">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Factures</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-500">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Payées</p>
                  <p className="text-2xl font-bold">{stats.paid}</p>
                  <p className="text-sm text-gray-500">{stats.paidAmount.toFixed(2)} €</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-yellow-500">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">En attente</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-gray-500">{stats.pendingAmount.toFixed(2)} €</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-red-500">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">En retard</p>
                  <p className="text-2xl font-bold">{stats.overdue}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingSpinner text="Chargement des factures..." />
        ) : (
          <>
            {selectedCompany && filteredInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date d'émission</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Échéance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className={inv.status === 'paid' ? 'bg-green-50' : inv.due_date && isAfter(new Date(), parseISO(inv.due_date)) ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap">{inv.id}</td>
                        <td className="px-4 py-3">{inv.description || `Abonnement ${inv.months} mois`}</td>
                        <td className="px-4 py-3 font-medium">{inv.amount.toFixed(2)} €</td>
                        <td className="px-4 py-3">{format(parseISO(inv.created_at), 'dd/MM/yyyy', { locale: fr })}</td>
                        <td className="px-4 py-3">
                          {inv.due_date ? format(parseISO(inv.due_date), 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 
                              inv.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 
                              inv.due_date && isAfter(new Date(), parseISO(inv.due_date)) ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'}`}
                          >
                            {inv.status === 'paid' ? 'Payée' : 
                             inv.status === 'cancelled' ? 'Annulée' : 
                             inv.due_date && isAfter(new Date(), parseISO(inv.due_date)) ? 'En retard' : 'En attente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <button
                                onClick={() => handlePay(inv.id)}
                                className="btn-sm btn-primary flex items-center"
                                title="Marquer comme payée"
                              >
                                <DollarSign className="h-3 w-3 mr-1" /> Payer
                              </button>
                            )}
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <button
                                onClick={() => handleSendReminder(inv.id)}
                                className="btn-sm btn-outline flex items-center"
                                title="Envoyer un rappel par email"
                              >
                                <Send className="h-3 w-3 mr-1" /> Rappel
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadInvoice(inv.id)}
                              className="btn-sm btn-outline flex items-center"
                              title="Télécharger au format PDF"
                            >
                              <Download className="h-3 w-3 mr-1" /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : selectedCompany ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune facture trouvée</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Veuillez sélectionner une entreprise pour afficher ses factures</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
