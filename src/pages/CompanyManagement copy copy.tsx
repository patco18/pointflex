import React, { useState, useEffect } from 'react'
import { superAdminService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useApi, useAsyncAction } from '../hooks/useApi'
import Modal from './shared/Modal'
import LoadingSpinner from './shared/LoadingSpinner'
import StatusBadge from './shared/StatusBadge'
import { 
  Building, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Users, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  X,
  DollarSign,
  Clock,
  Globe,
  Shield,
  Eye,
  EyeOff,
  User,
  Lock,
  FileText,
  Download,
  Upload,
  Filter,
  Search,
  RefreshCw,
  Info,
  CreditCard,
  Briefcase,
  MapPin,
  Settings as SettingsIcon,
  HelpCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Company {
  id: number
  name: string
  email: string
  phone: string
  address: string
  subscription_plan: string
  subscription_status: string
  subscription_start: string
  subscription_end: string
  subscription_days_remaining: number
  is_subscription_expired: boolean
  is_subscription_expiring_soon: boolean
  max_employees: number
  current_employee_count: number
  is_active: boolean
  is_suspended: boolean
  suspension_reason: string
  created_at: string
  updated_at: string
  industry?: string
  website?: string
  tax_id?: string
  notes?: string
  admin_id?: number
  admin_email?: string
  admin_name?: string
  admin_phone?: string
}

interface CompanyForm {
  name: string
  email: string
  phone: string
  address: string
  subscription_plan: string
  max_employees: number
  admin_email: string
  admin_name: string
  admin_password: string
  industry: string
  website: string
  tax_id: string
  notes: string
}

const INDUSTRIES = [
  { id: 'tech', name: 'Technologie' },
  { id: 'finance', name: 'Finance' },
  { id: 'healthcare', name: 'Santé' },
  { id: 'education', name: 'Éducation' },
  { id: 'retail', name: 'Commerce de détail' },
  { id: 'manufacturing', name: 'Industrie' },
  { id: 'services', name: 'Services' },
  { id: 'construction', name: 'Construction' },
  { id: 'hospitality', name: 'Hôtellerie' },
  { id: 'other', name: 'Autre' }
]

export default function CompanyManagement() {
  const { isSuperAdmin } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [industryFilter, setIndustryFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [extendMonths, setExtendMonths] = useState(1)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [showCompanyDetails, setShowCompanyDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'admin' | 'advanced'>('general')
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [showBulkActionMenu, setShowBulkActionMenu] = useState(false)
  
  const [form, setForm] = useState<CompanyForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    subscription_plan: 'basic',
    max_employees: 10,
    admin_email: '',
    admin_name: '',
    admin_password: 'admin123',
    industry: '',
    website: '',
    tax_id: '',
    notes: ''
  })

  const { data: companiesData, loading, refetch } = useApi(() => superAdminService.getCompanies())
  const { loading: saving, execute } = useAsyncAction()

  // Safely extract companies from the response
  const companies = Array.isArray(companiesData?.companies) 
    ? companiesData.companies 
    : Array.isArray(companiesData) 
      ? companiesData 
      : [];

  // Reset selected companies when companies change
  useEffect(() => {
    setSelectedCompanies([])
    setSelectAll(false)
  }, [companies])

  const filteredCompanies = companies.filter((company: Company) => {
    const matchesSearch = !searchTerm || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.phone && company.phone.includes(searchTerm)) ||
      (company.address && company.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.admin_email && company.admin_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.admin_name && company.admin_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesPlan = planFilter === 'all' || company.subscription_plan === planFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && company.is_active) ||
      (statusFilter === 'suspended' && company.is_suspended) ||
      (statusFilter === 'expired' && company.is_subscription_expired) ||
      (statusFilter === 'expiring' && company.is_subscription_expiring_soon)
    
    const matchesIndustry = industryFilter === 'all' || company.industry === industryFilter
    
    return matchesSearch && matchesPlan && matchesStatus && matchesIndustry
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!form.name || !form.email) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    
    // Validation pour le nouvel administrateur
    if (!editingCompany && (!form.admin_name || !form.admin_email)) {
      toast.error('Veuillez remplir les informations de l\'administrateur')
      return
    }
    
    // Vérifier que les emails sont différents
    if (!editingCompany && form.email === form.admin_email) {
      toast.error('L\'email de l\'entreprise et de l\'administrateur doivent être différents')
      return
    }
    
    await execute(async () => {
      try {
        if (editingCompany) {
          // Préparer les données pour la mise à jour
          const updateData = {
            ...form,
            admin_email: form.admin_email || editingCompany.admin_email,
            admin_name: form.admin_name || editingCompany.admin_name
          }
          await superAdminService.updateCompany(editingCompany.id, updateData)
        } else {
          // Préparer les données pour la création
          const companyData = {
            ...form,
            admin_email: form.admin_email,
            admin_name: form.admin_name,
            admin_password: form.admin_password || 'admin123'
          }
          await superAdminService.createCompany(companyData)
        }
        setShowModal(false)
        resetForm()
        refetch()
      } catch (error: any) {
        // Gérer les erreurs spécifiques
        if (error.response?.status === 409) {
          const message = error.response.data?.message || 'Un conflit est survenu';
          if (message.includes('email existe déjà')) {
            toast.error('Un utilisateur ou une entreprise avec cet email existe déjà');
          } else {
            toast.error(message);
          }
          throw error; // Relancer pour que useAsyncAction puisse gérer l'état
        }
        throw error;
      }
    }, editingCompany ? 'Entreprise mise à jour' : 'Entreprise créée')
  }

  const handleDelete = async (company: Company) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'entreprise "${company.name}" ?\n\nCette action est irréversible et supprimera également tous les utilisateurs associés.`)) return
    await execute(async () => {
      await superAdminService.deleteCompany(company.id)
      refetch()
    }, 'Entreprise supprimée')
  }

  const handleExtendSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return
    
    if (extendMonths < 1 || extendMonths > 24) {
      toast.error('Veuillez sélectionner entre 1 et 24 mois')
      return
    }
    
    await execute(async () => {
      await superAdminService.extendSubscription(selectedCompany.id, { months: extendMonths })
      setShowExtendModal(false)
      refetch()
    }, `Abonnement prolongé de ${extendMonths} mois`)
  }

  const handleToggleStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return
    
    const isSuspending = !selectedCompany.is_suspended
    
    if (isSuspending && !suspendReason.trim()) {
      toast.error('Veuillez indiquer une raison pour la suspension')
      return
    }
    
    await execute(async () => {
      await superAdminService.toggleCompanyStatus(selectedCompany.id, { 
        suspend: isSuspending, 
        reason: suspendReason || 'Suspension administrative', 
        notify_admin: true 
      })
      setShowSuspendModal(false)
      setSuspendReason('')
      refetch()
    }, isSuspending ? 'Entreprise suspendue' : 'Entreprise réactivée')
  }

  const handleBulkAction = async (action: 'extend' | 'suspend' | 'activate' | 'delete') => {
    if (selectedCompanies.length === 0) {
      toast.error('Veuillez sélectionner au moins une entreprise')
      return
    }
    
    const selectedCount = selectedCompanies.length
    
    switch (action) {
      case 'extend':
        const months = prompt(`Prolonger l'abonnement de ${selectedCount} entreprise(s) de combien de mois? (1-24)`)
        if (!months) return
        
        const monthsNum = parseInt(months)
        if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 24) {
          toast.error('Veuillez entrer un nombre entre 1 et 24')
          return
        }
        
        await execute(async () => {
          for (const companyId of selectedCompanies) {
            await superAdminService.extendSubscription(companyId, { months: monthsNum })
          }
          setSelectedCompanies([])
          setSelectAll(false)
          refetch()
        }, `Abonnement prolongé pour ${selectedCount} entreprise(s)`)
        break
        
      case 'suspend':
        const reason = prompt(`Raison de la suspension pour ${selectedCount} entreprise(s):`)
        if (!reason) return
        
        await execute(async () => {
          for (const companyId of selectedCompanies) {
            await superAdminService.toggleCompanyStatus(companyId, { 
              suspend: true, 
              reason: reason, 
              notify_admin: true 
            })
          }
          setSelectedCompanies([])
          setSelectAll(false)
          refetch()
        }, `${selectedCount} entreprise(s) suspendue(s)`)
        break
        
      case 'activate':
        await execute(async () => {
          for (const companyId of selectedCompanies) {
            await superAdminService.toggleCompanyStatus(companyId, { 
              suspend: false, 
              reason: '', 
              notify_admin: true 
            })
          }
          setSelectedCompanies([])
          setSelectAll(false)
          refetch()
        }, `${selectedCount} entreprise(s) réactivée(s)`)
        break
        
      case 'delete':
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedCount} entreprise(s)?\n\nCette action est irréversible et supprimera également tous les utilisateurs associés.`)) return
        
        await execute(async () => {
          for (const companyId of selectedCompanies) {
            await superAdminService.deleteCompany(companyId)
          }
          setSelectedCompanies([])
          setSelectAll(false)
          refetch()
        }, `${selectedCount} entreprise(s) supprimée(s)`)
        break
    }
    
    setShowBulkActionMenu(false)
  }

  const startEdit = (company: Company) => {
    setEditingCompany(company)
    
    // Préparer le formulaire avec les données existantes
    setForm({
      name: company.name,
      email: company.email,
      phone: company.phone || '',
      address: company.address || '',
      subscription_plan: company.subscription_plan,
      max_employees: company.max_employees,
      admin_email: company.admin_email || '',
      admin_name: company.admin_name || '',
      admin_password: '',
      industry: company.industry || '',
      website: company.website || '',
      tax_id: company.tax_id || '',
      notes: company.notes || ''
    })
    
    setShowModal(true)
  }

  const openExtendModal = (company: Company) => {
    setSelectedCompany(company)
    setExtendMonths(1)
    setShowExtendModal(true)
  }

  const openSuspendModal = (company: Company) => {
    setSelectedCompany(company)
    setSuspendReason(company.suspension_reason || '')
    setShowSuspendModal(true)
  }

  const openCompanyDetails = (company: Company) => {
    setSelectedCompany(company)
    setShowCompanyDetails(true)
  }

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      subscription_plan: 'basic',
      max_employees: 10,
      admin_email: '',
      admin_name: '',
      admin_password: 'admin123',
      industry: '',
      website: '',
      tax_id: '',
      notes: ''
    })
    setEditingCompany(null)
    setActiveTab('general')
  }

  const toggleSelectCompany = (companyId: number) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    )
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedCompanies([])
    } else {
      setSelectedCompanies(filteredCompanies.map(company => company.id))
    }
    setSelectAll(!selectAll)
  }

  const exportCompanies = () => {
    const csvData = filteredCompanies.map(company => [
      company.id,
      company.name,
      company.email,
      company.phone || '',
      company.subscription_plan,
      company.subscription_status,
      company.subscription_days_remaining,
      company.current_employee_count,
      company.max_employees,
      company.is_active ? 'Actif' : 'Inactif',
      company.is_suspended ? 'Oui' : 'Non',
      company.industry || '',
      company.website || '',
      company.admin_name || '',
      company.admin_email || '',
      new Date(company.created_at).toLocaleDateString('fr-FR')
    ])
    
    const headers = [
      'ID', 'Nom', 'Email', 'Téléphone', 'Plan', 'Statut Abonnement', 
      'Jours Restants', 'Employés', 'Max Employés', 'Actif', 'Suspendu', 
      'Secteur', 'Site Web', 'Admin Nom', 'Admin Email', 'Date Création'
    ]
    
    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `entreprises_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Export CSV réussi')
  }

  const getStatusBadge = (company: Company) => {
    let statusConfig = {
      color: 'bg-gray-100 text-gray-800',
      icon: CheckCircle,
      text: 'Inconnu'
    }
    
    if (company.is_suspended) {
      statusConfig = { color: 'bg-red-100 text-red-800', icon: AlertTriangle, text: 'Suspendu' }
    } else if (company.is_subscription_expired) {
      statusConfig = { color: 'bg-orange-100 text-orange-800', icon: XCircle, text: 'Expiré' }
    } else if (company.is_subscription_expiring_soon) {
      statusConfig = { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Expire bientôt' }
    } else if (company.is_active) {
      statusConfig = { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Actif' }
    } else {
      statusConfig = { color: 'bg-gray-100 text-gray-800', icon: XCircle, text: 'Inactif' }
    }
    
    const StatusIcon = statusConfig.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {statusConfig.text}
      </span>
    )
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'basic':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Basic</span>
      case 'premium':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Premium</span>
      case 'enterprise':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Enterprise</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{plan}</span>
    }
  }

  const getPlanPrice = (plan: string) => {
    switch (plan) {
      case 'basic': return 29
      case 'premium': return 99
      case 'enterprise': return 299
      default: return 0
    }
  }

  const getPlanFeatures = (plan: string) => {
    const features = {
      basic: [
        '10 employés maximum',
        'Pointage bureau',
        'Historique des pointages',
        'Rapports basiques'
      ],
      premium: [
        '50 employés maximum',
        'Pointage bureau et mission',
        'Géofencing avancé',
        'Rapports détaillés',
        'Exports CSV/PDF'
      ],
      enterprise: [
        'Employés illimités',
        'Toutes les fonctionnalités Premium',
        'API dédiée',
        'Support prioritaire',
        'Personnalisation avancée'
      ]
    }
    
    return features[plan as keyof typeof features] || []
  }

  if (!isSuperAdmin) {
    return (
      <div className="card text-center">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-600">Seuls les super-administrateurs peuvent gérer les entreprises.</p>
      </div>
    )
  }

  if (loading) return <LoadingSpinner size="lg" text="Chargement des entreprises..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Entreprises</h1>
          <p className="text-gray-600">
            Gérez les entreprises de la plateforme
          </p>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setShowHelpModal(true)} className="btn-secondary">
            <HelpCircle className="h-4 w-4 mr-2" />
            Aide
          </button>
          <button onClick={exportCompanies} className="btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </button>
          <button onClick={() => { resetForm(); setShowModal(true) }} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Entreprise
          </button>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Nom, email, admin..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="input-field">
              <option value="all">Tous les plans</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
              <option value="expired">Expiré</option>
              <option value="expiring">Expire bientôt</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
            <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className="input-field">
              <option value="all">Tous les secteurs</option>
              {INDUSTRIES.map(industry => (
                <option key={industry.id} value={industry.id}>{industry.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {filteredCompanies.length} entreprise{filteredCompanies.length > 1 ? 's' : ''} trouvée{filteredCompanies.length > 1 ? 's' : ''}
          </div>
          <div className="flex items-center space-x-2">
            {selectedCompanies.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setShowBulkActionMenu(!showBulkActionMenu)}
                  className="btn-primary"
                >
                  Actions groupées ({selectedCompanies.length})
                </button>
                
                {showBulkActionMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <div className="py-1">
                      <button 
                        onClick={() => handleBulkAction('extend')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Calendar className="h-4 w-4 mr-2 text-green-600" />
                        Prolonger abonnement
                      </button>
                      <button 
                        onClick={() => handleBulkAction('suspend')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                        Suspendre
                      </button>
                      <button 
                        onClick={() => handleBulkAction('activate')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Réactiver
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button 
                        onClick={() => handleBulkAction('delete')}
                        className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button 
              onClick={refetch} 
              className="flex items-center text-sm text-primary-600 hover:text-primary-800"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entreprise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Administrateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abonnement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateurs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCompanies.map((company: Company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(company.id)}
                        onChange={() => toggleSelectCompany(company.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-primary-600" onClick={() => openCompanyDetails(company)}>
                          {company.name}
                        </div>
                        <div className="text-sm text-gray-500">ID: {company.id}</div>
                        {company.industry && (
                          <div className="text-xs text-gray-500">
                            {INDUSTRIES.find(i => i.id === company.industry)?.name || company.industry}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {company.email}
                      </div>
                      {company.phone && (
                        <div className="flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {company.phone}
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center mt-1">
                          <Globe className="h-4 w-4 mr-2 text-gray-400" />
                          <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-primary-600 hover:underline">
                            Site web
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {company.admin_name ? (
                        <>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            {company.admin_name}
                          </div>
                          {company.admin_email && (
                            <div className="flex items-center mt-1">
                              <Mail className="h-4 w-4 mr-2 text-gray-400" />
                              {company.admin_email}
                            </div>
                          )}
                          {company.admin_phone && (
                            <div className="flex items-center mt-1">
                              <Phone className="h-4 w-4 mr-2 text-gray-400" />
                              {company.admin_phone}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-yellow-600 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Non défini
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center">
                        {getPlanBadge(company.subscription_plan)}
                        <span className="ml-2 text-xs text-gray-500">{getPlanPrice(company.subscription_plan)}€/mois</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {company.subscription_days_remaining > 0 
                            ? `${company.subscription_days_remaining} jours restants`
                            : 'Expiré'
                          }
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      <div className="flex items-center">
                        <span className={`font-medium ${
                          company.current_employee_count >= company.max_employees ? 'text-red-600' :
                          company.current_employee_count >= company.max_employees * 0.8 ? 'text-yellow-600' :
                          'text-gray-900'
                        }`}>
                          {company.current_employee_count}
                        </span>
                        <span className="mx-1">/</span>
                        <span>{company.max_employees}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(company)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => openCompanyDetails(company)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Voir détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => startEdit(company)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => openExtendModal(company)}
                        className="text-green-600 hover:text-green-900"
                        title="Prolonger l'abonnement"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      {company.is_suspended ? (
                        <button 
                          onClick={() => {
                            setSelectedCompany(company);
                            setShowSuspendModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Réactiver"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedCompany(company);
                            setShowSuspendModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-900"
                          title="Suspendre"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(company)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune entreprise trouvée</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || planFilter !== 'all' || statusFilter !== 'all' || industryFilter !== 'all'
                ? 'Aucune entreprise ne correspond aux critères de recherche'
                : 'Commencez par créer votre première entreprise'
              }
            </p>
            {(searchTerm || planFilter !== 'all' || statusFilter !== 'all' || industryFilter !== 'all') && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setPlanFilter('all');
                  setStatusFilter('all');
                  setIndustryFilter('all');
                }}
                className="mt-4 btn-secondary"
              >
                <Filter className="h-4 w-4 mr-2" />
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Création/Édition */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCompany ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          {/* Tabs de navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'general'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building className="inline-block w-4 h-4 mr-2" />
                Informations générales
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'admin'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="inline-block w-4 h-4 mr-2" />
                Administrateur
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('advanced')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'advanced'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <SettingsIcon className="inline-block w-4 h-4 mr-2" />
                Paramètres avancés
              </button>
            </nav>
          </div>

          {/* Contenu des tabs */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'entreprise *
                </label>
                <input
                  type="text" 
                  required 
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Entreprise SAS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de contact *
                </label>
                <input
                  type="email" 
                  required 
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                  placeholder="contact@entreprise.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel" 
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="input-field"
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site web
                </label>
                <input
                  type="url" 
                  value={form.website}
                  onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
                  className="input-field"
                  placeholder="https://www.entreprise.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secteur d'activité
                </label>
                <select
                  value={form.industry}
                  onChange={(e) => setForm(prev => ({ ...prev, industry: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Sélectionner un secteur</option>
                  {INDUSTRIES.map(industry => (
                    <option key={industry.id} value={industry.id}>{industry.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de TVA / SIRET
                </label>
                <input
                  type="text" 
                  value={form.tax_id}
                  onChange={(e) => setForm(prev => ({ ...prev, tax_id: e.target.value }))}
                  className="input-field"
                  placeholder="FR12345678900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <textarea
                  rows={2} 
                  value={form.address}
                  onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  className="input-field"
                  placeholder="123 Rue de la Paix, 75001 Paris"
                />
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg md:col-span-2">
                <h3 className="text-md font-medium text-blue-900 mb-2">Plan d'abonnement</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      form.subscription_plan === 'basic' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setForm(prev => ({ 
                      ...prev, 
                      subscription_plan: 'basic',
                      max_employees: 10
                    }))}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900">Basic</h4>
                      <span className="text-sm font-bold text-blue-600">29€/mois</span>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {getPlanFeatures('basic').map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      form.subscription_plan === 'premium' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setForm(prev => ({ 
                      ...prev, 
                      subscription_plan: 'premium',
                      max_employees: prev.max_employees > 50 ? 50 : prev.max_employees
                    }))}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900">Premium</h4>
                      <span className="text-sm font-bold text-blue-600">99€/mois</span>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {getPlanFeatures('premium').map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      form.subscription_plan === 'enterprise' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setForm(prev => ({ 
                      ...prev, 
                      subscription_plan: 'enterprise',
                      max_employees: 999
                    }))}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900">Enterprise</h4>
                      <span className="text-sm font-bold text-blue-600">299€/mois</span>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {getPlanFeatures('enterprise').map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre maximum d'employés
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={form.subscription_plan === 'basic' ? 10 : form.subscription_plan === 'premium' ? 50 : 999}
                    value={form.max_employees}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      const max = form.subscription_plan === 'basic' ? 10 : form.subscription_plan === 'premium' ? 50 : 999;
                      setForm(prev => ({ 
                        ...prev, 
                        max_employees: value > max ? max : value 
                      }))
                    }}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum autorisé pour le plan {form.subscription_plan}: {form.subscription_plan === 'basic' ? 10 : form.subscription_plan === 'premium' ? 50 : 999}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg mb-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Informations importantes</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      {editingCompany 
                        ? "Vous pouvez modifier les informations de l'administrateur de l'entreprise."
                        : "Un compte administrateur sera automatiquement créé pour cette entreprise. Cet utilisateur aura tous les droits d'administration sur l'entreprise."
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet de l'administrateur *
                  </label>
                  <input
                    type="text" 
                    required 
                    value={form.admin_name}
                    onChange={(e) => setForm(prev => ({ ...prev, admin_name: e.target.value }))}
                    className="input-field"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email de l'administrateur *
                  </label>
                  <input
                    type="email" 
                    required 
                    value={form.admin_email}
                    onChange={(e) => setForm(prev => ({ ...prev, admin_email: e.target.value }))}
                    className="input-field"
                    placeholder="admin@entreprise.com"
                  />
                  {!editingCompany && (
                    <p className="text-xs text-gray-500 mt-1">
                      Doit être différent de l'email de l'entreprise
                    </p>
                  )}
                </div>
                {!editingCompany && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mot de passe de l'administrateur
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.admin_password}
                        onChange={(e) => setForm(prev => ({ ...prev, admin_password: e.target.value }))}
                        className="input-field pr-10"
                        placeholder="Mot de passe"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Laissez vide pour utiliser le mot de passe par défaut: admin123
                    </p>
                  </div>
                )}
              </div>
              
              {editingCompany && editingCompany.admin_id && (
                <div className="p-4 bg-blue-50 rounded-lg mt-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Informations actuelles</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-800">Nom:</p>
                      <p className="font-medium">{editingCompany.admin_name || 'Non défini'}</p>
                    </div>
                    <div>
                      <p className="text-blue-800">Email:</p>
                      <p className="font-medium">{editingCompany.admin_email || 'Non défini'}</p>
                    </div>
                    <div>
                      <p className="text-blue-800">ID:</p>
                      <p className="font-medium">{editingCompany.admin_id}</p>
                    </div>
                    <div>
                      <p className="text-blue-800">Téléphone:</p>
                      <p className="font-medium">{editingCompany.admin_phone || 'Non défini'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes internes
                </label>
                <textarea
                  rows={4} 
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-field"
                  placeholder="Notes internes sur cette entreprise (non visibles par l'entreprise)"
                />
              </div>
              
              {editingCompany && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Informations système</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">ID:</p>
                      <p className="font-mono">{editingCompany.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Créée le:</p>
                      <p>{new Date(editingCompany.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Dernière mise à jour:</p>
                      <p>{new Date(editingCompany.updated_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Statut:</p>
                      <p>{editingCompany.is_active ? 'Actif' : 'Inactif'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-between space-x-3 mt-6 pt-6 border-t">
            <div className="flex space-x-2">
              {activeTab !== 'general' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  className="btn-secondary"
                >
                  <X className="h-4 w-4 mr-2" />
                  Précédent
                </button>
              )}
              
              {activeTab === 'general' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className="btn-secondary"
                >
                  <User className="h-4 w-4 mr-2" />
                  Suivant: Administrateur
                </button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingCompany ? 'Mettre à jour' : 'Créer l\'entreprise'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Prolongation Abonnement */}
      <Modal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        title="Prolonger l'abonnement"
        size="md"
      >
        {selectedCompany && (
          <form onSubmit={handleExtendSubscription}>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">{selectedCompany.name}</h3>
                </div>
                <div className="text-sm text-blue-800">
                  <p>Plan actuel: <span className="font-medium">{selectedCompany.subscription_plan}</span></p>
                  <p>Expire dans: <span className="font-medium">{selectedCompany.subscription_days_remaining} jours</span></p>
                  <p>Date d'expiration: <span className="font-medium">{new Date(selectedCompany.subscription_end).toLocaleDateString('fr-FR')}</span></p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de mois à ajouter
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={extendMonths}
                    onChange={(e) => setExtendMonths(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-lg font-medium text-gray-900 min-w-[2rem] text-center">{extendMonths}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 mois</span>
                  <span>24 mois</span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Résumé</h4>
                <div className="flex justify-between text-sm">
                  <span>Prix mensuel:</span>
                  <span className="font-medium">{getPlanPrice(selectedCompany.subscription_plan)}€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Durée:</span>
                  <span className="font-medium">{extendMonths} mois</span>
                </div>
                <div className="flex justify-between text-sm font-medium mt-2 pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span className="text-green-600">{getPlanPrice(selectedCompany.subscription_plan) * extendMonths}€</span>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800">
                      La prolongation prendra effet à partir de la date d'expiration actuelle.
                      Si l'abonnement est déjà expiré, il sera réactivé immédiatement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowExtendModal(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Prolonger l'abonnement
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Suspension/Réactivation */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title={selectedCompany?.is_suspended ? "Réactiver l'entreprise" : "Suspendre l'entreprise"}
        size="md"
      >
        {selectedCompany && (
          <form onSubmit={handleToggleStatus}>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${selectedCompany.is_suspended ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <div className="flex items-center space-x-3 mb-2">
                  <Building className={`h-5 w-5 ${selectedCompany.is_suspended ? 'text-green-600' : 'text-yellow-600'}`} />
                  <h3 className={`font-medium ${selectedCompany.is_suspended ? 'text-green-900' : 'text-yellow-900'}`}>
                    {selectedCompany.name}
                  </h3>
                </div>
                <p className={`text-sm ${selectedCompany.is_suspended ? 'text-green-800' : 'text-yellow-800'}`}>
                  {selectedCompany.is_suspended 
                    ? "Vous êtes sur le point de réactiver cette entreprise. Tous les services seront rétablis."
                    : "Vous êtes sur le point de suspendre cette entreprise. Tous les services seront temporairement désactivés."
                  }
                </p>
              </div>
              
              {!selectedCompany.is_suspended && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raison de la suspension *
                  </label>
                  <textarea
                    rows={3}
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    className="input-field"
                    placeholder="Expliquez la raison de la suspension..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cette raison sera visible par l'administrateur de l'entreprise
                  </p>
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Conséquences</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {selectedCompany.is_suspended ? (
                    <>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                        <span>L'accès à la plateforme sera rétabli pour tous les utilisateurs</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                        <span>Les fonctionnalités de pointage seront réactivées</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                        <span>L'administrateur sera notifié par email</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5" />
                        <span>L'accès à la plateforme sera bloqué pour tous les utilisateurs</span>
                      </li>
                      <li className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5" />
                        <span>Les fonctionnalités de pointage seront désactivées</span>
                      </li>
                      <li className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5" />
                        <span>L'abonnement continuera d'être décompté</span>
                      </li>
                      <li className="flex items-start">
                        <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                        <span>L'administrateur sera notifié par email</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className={`${selectedCompany.is_suspended ? 'btn-success' : 'btn-warning'}`}
                disabled={saving || (!selectedCompany.is_suspended && !suspendReason.trim())}
              >
                {saving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    {selectedCompany.is_suspended ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Réactiver
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Suspendre
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Détails Entreprise */}
      <Modal
        isOpen={showCompanyDetails}
        onClose={() => setShowCompanyDetails(false)}
        title="Détails de l'entreprise"
        size="lg"
      >
        {selectedCompany && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Building className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedCompany.name}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusBadge(selectedCompany)}
                  <span className="text-sm text-gray-500">ID: {selectedCompany.id}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Informations générales</h3>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Contact</h4>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{selectedCompany.email}</span>
                    </div>
                    {selectedCompany.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{selectedCompany.phone}</span>
                      </div>
                    )}
                    {selectedCompany.website && (
                      <div className="flex items-center text-sm">
                        <Globe className="h-4 w-4 mr-2 text-gray-400" />
                        <a 
                          href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          {selectedCompany.website}
                        </a>
                      </div>
                    )}
                    {selectedCompany.address && (
                      <div className="flex items-start text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                        <span>{selectedCompany.address}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Administrateur</h4>
                  <div className="mt-1 space-y-1">
                    {selectedCompany.admin_name ? (
                      <>
                        <div className="flex items-center text-sm">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{selectedCompany.admin_name}</span>
                        </div>
                        {selectedCompany.admin_email && (
                          <div className="flex items-center text-sm">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{selectedCompany.admin_email}</span>
                          </div>
                        )}
                        {selectedCompany.admin_phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{selectedCompany.admin_phone}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center text-sm text-yellow-600">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <span>Aucun administrateur défini</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Informations complémentaires</h4>
                  <div className="mt-1 space-y-1">
                    {selectedCompany.industry && (
                      <div className="flex items-center text-sm">
                        <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Secteur: {INDUSTRIES.find(i => i.id === selectedCompany.industry)?.name || selectedCompany.industry}</span>
                      </div>
                    )}
                    {selectedCompany.tax_id && (
                      <div className="flex items-center text-sm">
                        <FileText className="h-4 w-4 mr-2 text-gray-400" />
                        <span>TVA/SIRET: {selectedCompany.tax_id}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Utilisateurs</h4>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{selectedCompany.current_employee_count} employé(s) sur {selectedCompany.max_employees} autorisés</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full ${
                          selectedCompany.current_employee_count >= selectedCompany.max_employees ? 'bg-red-500' :
                          selectedCompany.current_employee_count >= selectedCompany.max_employees * 0.8 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, (selectedCompany.current_employee_count / selectedCompany.max_employees) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Dates</h4>
                  <div className="mt-1 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Création:</span>
                      <span>{new Date(selectedCompany.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dernière mise à jour:</span>
                      <span>{new Date(selectedCompany.updated_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
                
                {selectedCompany.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                      {selectedCompany.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Informations d'abonnement */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Abonnement</h3>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      {getPlanBadge(selectedCompany.subscription_plan)}
                      <span className="ml-2 text-sm font-medium">{getPlanPrice(selectedCompany.subscription_plan)}€/mois</span>
                    </div>
                    <span className={`text-sm ${
                      selectedCompany.is_subscription_expired ? 'text-red-600' :
                      selectedCompany.is_subscription_expiring_soon ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {selectedCompany.subscription_status}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Début:</span>
                      <span>{selectedCompany.subscription_start ? new Date(selectedCompany.subscription_start).toLocaleDateString('fr-FR') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fin:</span>
                      <span>{selectedCompany.subscription_end ? new Date(selectedCompany.subscription_end).toLocaleDateString('fr-FR') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-500">Jours restants:</span>
                      <span className={
                        selectedCompany.subscription_days_remaining <= 0 ? 'text-red-600' :
                        selectedCompany.subscription_days_remaining <= 7 ? 'text-yellow-600' : 'text-green-600'
                      }>
                        {selectedCompany.subscription_days_remaining}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Fonctionnalités incluses</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {getPlanFeatures(selectedCompany.subscription_plan).map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {selectedCompany.is_suspended && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h4 className="font-medium text-red-900">Entreprise suspendue</h4>
                    </div>
                    {selectedCompany.suspension_reason && (
                      <p className="text-sm text-red-800">
                        Raison: {selectedCompany.suspension_reason}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => openExtendModal(selectedCompany)}
                    className="btn-primary flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Prolonger
                  </button>
                  <button 
                    onClick={() => openSuspendModal(selectedCompany)}
                    className={`flex-1 ${selectedCompany.is_suspended ? 'btn-success' : 'btn-warning'}`}
                  >
                    {selectedCompany.is_suspended ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Réactiver
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Suspendre
                      </>
                    )}
                  </button>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Actions rapides</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => startEdit(selectedCompany)}
                      className="btn-secondary text-sm py-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Modifier
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedCompany)}
                      className="btn-danger text-sm py-1"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Supprimer
                    </button>
                    <button 
                      onClick={() => window.open(`/superadmin/companies/${selectedCompany.id}/employees`, '_blank')}
                      className="btn-secondary text-sm py-1"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Employés
                    </button>
                    <button 
                      onClick={() => window.open(`/superadmin/companies/${selectedCompany.id}/reports`, '_blank')}
                      className="btn-secondary text-sm py-1"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Rapports
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowCompanyDetails(false)}
                className="btn-primary"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Modal d'aide */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Aide - Gestion des entreprises"
        size="lg"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-md font-medium text-blue-900">À propos de la gestion des entreprises</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Cette section vous permet de gérer toutes les entreprises de la plateforme PointFlex.
                  En tant que SuperAdmin, vous pouvez créer, modifier, suspendre et supprimer des entreprises.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Fonctionnalités principales</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-gray-900">Créer une entreprise</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Créez une nouvelle entreprise en remplissant le formulaire. Un compte administrateur
                  sera automatiquement créé pour cette entreprise.
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Edit className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-gray-900">Modifier une entreprise</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Modifiez les informations d'une entreprise existante, y compris son plan d'abonnement
                  et le nombre maximum d'employés autorisés.
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-gray-900">Prolonger un abonnement</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Prolongez l'abonnement d'une entreprise pour une durée de 1 à 24 mois.
                  La prolongation prend effet à partir de la date d'expiration actuelle.
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <h4 className="font-medium text-gray-900">Suspendre/Réactiver</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Suspendez temporairement l'accès d'une entreprise à la plateforme ou réactivez
                  une entreprise suspendue. L'abonnement continue d'être décompté pendant la suspension.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Statuts des entreprises</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-gray-900">Actif</h4>
                </div>
                <p className="text-sm text-gray-700">
                  L'entreprise est active et son abonnement est valide. Tous les services sont disponibles.
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <h4 className="font-medium text-gray-900">Expire bientôt</h4>
                </div>
                <p className="text-sm text-gray-700">
                  L'abonnement de l'entreprise expire dans moins de 7 jours. Une notification
                  a été envoyée à l'administrateur.
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="h-4 w-4 text-orange-600" />
                  <h4 className="font-medium text-gray-900">Expiré</h4>
                </div>
                <p className="text-sm text-gray-700">
                  L'abonnement de l'entreprise a expiré. L'accès à la plateforme est limité
                  jusqu'au renouvellement de l'abonnement.
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <h4 className="font-medium text-gray-900">Suspendu</h4>
                </div>
                <p className="text-sm text-gray-700">
                  L'entreprise a été suspendue manuellement. L'accès à la plateforme est bloqué
                  jusqu'à la réactivation par un SuperAdmin.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="btn-primary"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}