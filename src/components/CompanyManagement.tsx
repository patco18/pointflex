import React, { useState, useEffect } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import { useApi, useAsyncAction } from '../hooks/useApi'
import { superAdminService, api } from '../services/api'
import { 
  Building, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  X,
  Search,
  Download,
  Briefcase,
  User,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

// Liste des pays pour le formulaire
const COUNTRIES = [
  // Pays africains
  { code: 'CI', name: 'Côte d\'Ivoire' },
  { code: 'BJ', name: 'Bénin' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'CM', name: 'Cameroun' },
  { code: 'CF', name: 'République centrafricaine' },
  { code: 'TD', name: 'Tchad' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'République démocratique du Congo' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'GQ', name: 'Guinée équatoriale' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GN', name: 'Guinée' },
  { code: 'GW', name: 'Guinée-Bissau' },
  { code: 'LR', name: 'Libéria' },
  { code: 'ML', name: 'Mali' },
  { code: 'MR', name: 'Mauritanie' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigéria' },
  { code: 'SN', name: 'Sénégal' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'TG', name: 'Togo' },
  { code: 'DZ', name: 'Algérie' },
  { code: 'EG', name: 'Égypte' },
  { code: 'LY', name: 'Libye' },
  { code: 'MA', name: 'Maroc' },
  { code: 'TN', name: 'Tunisie' },
  { code: 'AO', name: 'Angola' },
  { code: 'BW', name: 'Botswana' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NA', name: 'Namibie' },
  { code: 'ZA', name: 'Afrique du Sud' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ZM', name: 'Zambie' },
  { code: 'ZW', name: 'Zimbabwe' },
  { code: 'BI', name: 'Burundi' },
  { code: 'KM', name: 'Comores' },
  { code: 'ER', name: 'Érythrée' },
  { code: 'ET', name: 'Éthiopie' },
  { code: 'KE', name: 'Kenya' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MU', name: 'Maurice' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SO', name: 'Somalie' },
  { code: 'SS', name: 'Soudan du Sud' },
  { code: 'SD', name: 'Soudan' },
  { code: 'TZ', name: 'Tanzanie' },
  { code: 'UG', name: 'Ouganda' },
  { code: 'CV', name: 'Cap-Vert' },
  { code: 'GM', name: 'Gambie' },
  { code: 'ST', name: 'São Tomé-et-Príncipe' },
  
  // Europe
  { code: 'FR', name: 'France' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'ES', name: 'Espagne' },
  { code: 'IT', name: 'Italie' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Pays-Bas' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'IE', name: 'Irlande' },
  { code: 'DK', name: 'Danemark' },
  { code: 'NO', name: 'Norvège' },
  { code: 'SE', name: 'Suède' },
  { code: 'FI', name: 'Finlande' },
  { code: 'IS', name: 'Islande' },
  { code: 'AT', name: 'Autriche' },
  { code: 'GR', name: 'Grèce' },
  { code: 'PL', name: 'Pologne' },
  { code: 'CZ', name: 'République tchèque' },
  { code: 'SK', name: 'Slovaquie' },
  { code: 'HU', name: 'Hongrie' },
  { code: 'RO', name: 'Roumanie' },
  { code: 'BG', name: 'Bulgarie' },
  { code: 'HR', name: 'Croatie' },
  { code: 'SI', name: 'Slovénie' },
  { code: 'EE', name: 'Estonie' },
  { code: 'LV', name: 'Lettonie' },
  { code: 'LT', name: 'Lituanie' },
  { code: 'MT', name: 'Malte' },
  { code: 'CY', name: 'Chypre' },
  
  // Amériques
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'États-Unis' },
  { code: 'MX', name: 'Mexique' },
  { code: 'BR', name: 'Brésil' },
  { code: 'AR', name: 'Argentine' },
  { code: 'CL', name: 'Chili' },
  { code: 'CO', name: 'Colombie' },
  { code: 'PE', name: 'Pérou' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Équateur' },
  { code: 'BO', name: 'Bolivie' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PA', name: 'Panama' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'SV', name: 'Salvador' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DO', name: 'République dominicaine' },
  { code: 'HT', name: 'Haïti' },
  { code: 'JM', name: 'Jamaïque' },
  { code: 'TT', name: 'Trinité-et-Tobago' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BB', name: 'Barbade' },
  
  // Asie
  { code: 'CN', name: 'Chine' },
  { code: 'JP', name: 'Japon' },
  { code: 'KR', name: 'Corée du Sud' },
  { code: 'IN', name: 'Inde' },
  { code: 'ID', name: 'Indonésie' },
  { code: 'MY', name: 'Malaisie' },
  { code: 'PH', name: 'Philippines' },
  { code: 'SG', name: 'Singapour' },
  { code: 'TH', name: 'Thaïlande' },
  { code: 'VN', name: 'Viêt Nam' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'KH', name: 'Cambodge' },
  { code: 'LA', name: 'Laos' },
  { code: 'SA', name: 'Arabie saoudite' },
  { code: 'AE', name: 'Émirats arabes unis' },
  { code: 'QA', name: 'Qatar' },
  { code: 'KW', name: 'Koweït' },
  { code: 'BH', name: 'Bahreïn' },
  { code: 'OM', name: 'Oman' },
  { code: 'IL', name: 'Israël' },
  { code: 'TR', name: 'Turquie' },
  { code: 'LB', name: 'Liban' },
  { code: 'JO', name: 'Jordanie' },
  { code: 'IQ', name: 'Irak' },
  { code: 'IR', name: 'Iran' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'NP', name: 'Népal' },
  
  // Océanie
  { code: 'AU', name: 'Australie' },
  { code: 'NZ', name: 'Nouvelle-Zélande' },
  { code: 'FJ', name: 'Fidji' },
  { code: 'PG', name: 'Papouasie-Nouvelle-Guinée' },
  { code: 'SB', name: 'Îles Salomon' }
]

// Liste des secteurs d'activité
const INDUSTRIES = [
  { id: 'tech', name: 'Technologie' },
  { id: 'finance', name: 'Finance' },
  { id: 'healthcare', name: 'Santé' },
  { id: 'education', name: 'Éducation' },
  { id: 'retail', name: 'Commerce de détail' },
  { id: 'manufacturing', name: 'Industrie manufacturière' },
  { id: 'construction', name: 'Construction' },
  { id: 'hospitality', name: 'Hôtellerie et restauration' },
  { id: 'transportation', name: 'Transport et logistique' },
  { id: 'media', name: 'Médias et communication' },
  { id: 'energy', name: 'Énergie' },
  { id: 'agriculture', name: 'Agriculture' },
  { id: 'consulting', name: 'Conseil' },
  { id: 'legal', name: 'Services juridiques' },
  { id: 'nonprofit', name: 'Organisations à but non lucratif' },
  { id: 'government', name: 'Administration publique' },
  { id: 'other', name: 'Autre' }
]

// Types pour les entreprises
interface Company {
  id: number
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  country?: string
  industry?: string
  website?: string
  tax_id?: string
  notes?: string
  subscription_plan: string
  subscription_plan_id?: number
  subscription_status: string
  subscription_start?: string
  subscription_end?: string
  max_employees: number
  is_active: boolean
  is_suspended: boolean
  suspension_reason?: string
  logo_url?: string
  theme_color?: string
  created_at: string
  updated_at: string
  admin_id?: number
  admin_email?: string
  admin_name?: string
  admin_phone?: string
  current_employee_count?: number
  subscription_days_remaining?: number
  is_subscription_expired?: boolean
  is_subscription_expiring_soon?: boolean
}

// Interface pour le formulaire d'entreprise
interface CompanyForm {
  name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  industry: string
  website: string
  tax_id: string
  notes: string
  subscription_plan_id: number
  max_employees: number
  admin_email: string
  admin_prenom: string
  admin_nom: string
  admin_phone: string
  admin_password: string
  logo_url?: string
  theme_color?: string
}

export default function CompanyManagement() {
  const { permissions } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'expired'>('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  
  // Chargement des plans d'abonnement disponibles
  const { data: plansResp } = useApi(() => api.get('/subscription/plans'))
  const subscriptionPlans = (plansResp as any)?.plans || []
  
  // Formulaire d'entreprise
  const [companyForm, setCompanyForm] = useState<CompanyForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'CI',
    industry: '',
    website: '',
    tax_id: '',
    notes: '',
    subscription_plan_id: subscriptionPlans.length > 0 ? subscriptionPlans[0].id : 1,
    max_employees: 10,
    admin_email: '',
    admin_prenom: '',
    admin_nom: '',
    admin_phone: '',
    admin_password: ''
  })

  // Utiliser useEffect pour mettre à jour l'ID du plan lorsque les plans sont chargés
  useEffect(() => {
    if (subscriptionPlans.length > 0) {
      setCompanyForm(prev => ({
        ...prev,
        subscription_plan_id: subscriptionPlans[0].id,
        max_employees: subscriptionPlans[0].max_employees || 10
      }))
    }
  }, [subscriptionPlans])

  // Chargement des entreprises depuis l'API
  const { data: companyResp, loading, refetch } = useApi(() => superAdminService.getCompanies())
  const companies: Company[] = companyResp?.companies || []
  const { loading: saving, execute } = useAsyncAction()

  // Filtrer les entreprises
  const filteredCompanies = companies.filter((company: Company) => {
    const matchesSearch = !searchTerm || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.city && company.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.admin_name && company.admin_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && company.is_active && !company.is_suspended) ||
      (statusFilter === 'suspended' && company.is_suspended) ||
      (statusFilter === 'expired' && company.is_subscription_expired)
    
    const matchesPlan = planFilter === 'all' || company.subscription_plan === planFilter
    
    return matchesSearch && matchesStatus && matchesPlan
  })

  // Réinitialiser le formulaire
  const resetForm = () => {
    setCompanyForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'CI',
      industry: '',
      website: '',
      tax_id: '',
      notes: '',
      subscription_plan_id: 1,
      max_employees: 10,
      admin_email: '',
      admin_prenom: '',
      admin_nom: '',
      admin_phone: '',
      admin_password: ''
    })
  }

  // Créer une entreprise
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    
    await execute(async () => {
      // Simuler la création d'une entreprise
      // Trouver le plan sélectionné
      const selectedPlan = subscriptionPlans.find(p => p.id === companyForm.subscription_plan_id);
      
      const newCompany: Company = {
        id: companies.length + 1,
        name: companyForm.name,
        email: companyForm.email,
        phone: companyForm.phone,
        address: companyForm.address,
        city: companyForm.city,
        country: companyForm.country,
        industry: companyForm.industry,
        website: companyForm.website,
        tax_id: companyForm.tax_id,
        notes: companyForm.notes,
        subscription_plan: selectedPlan ? selectedPlan.name : 'basic',
        subscription_plan_id: companyForm.subscription_plan_id,
        subscription_status: 'active',
        max_employees: companyForm.max_employees,
        is_active: true,
        is_suspended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        admin_email: companyForm.admin_email,
        admin_name: `${companyForm.admin_prenom} ${companyForm.admin_nom}`,
        admin_phone: companyForm.admin_phone,
        current_employee_count: 0,
        subscription_days_remaining: 30,
        is_subscription_expired: false,
        is_subscription_expiring_soon: false
      }
      
      await superAdminService.createCompany(companyForm)
      setShowModal(false)
      resetForm()
      refetch()
    }, 'Entreprise créée avec succès')
  }

  // Mettre à jour une entreprise
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCompany) return
    
    await execute(async () => {
      await superAdminService.updateCompany(editingCompany.id, companyForm)
      setEditingCompany(null)
      setShowModal(false)
      resetForm()
      refetch()
    }, 'Entreprise mise à jour avec succès')
  }

  // Supprimer une entreprise
  const handleDeleteCompany = async (companyId: number, companyName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'entreprise "${companyName}" ?`)) {
      return
    }

    await execute(async () => {
      await superAdminService.deleteCompany(companyId)
      refetch()
    }, 'Entreprise supprimée avec succès')
  }

  // Suspendre/réactiver une entreprise
  const handleToggleStatus = async (company: Company) => {
    const action = company.is_suspended ? 'réactiver' : 'suspendre'
    const reason = company.is_suspended ? '' : prompt(`Raison pour ${action} l'entreprise "${company.name}" :`)
    
    if (company.is_suspended || reason) {
      await execute(async () => {
        await superAdminService.toggleCompanyStatus(company.id, {
          suspend: !company.is_suspended,
          reason: reason || '',
          notify_admin: true
        })
        refetch()
      }, `Entreprise ${company.is_suspended ? 'réactivée' : 'suspendue'} avec succès`)
    }
  }

  // États pour le modal de prolongement d'abonnement
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [extensionForm, setExtensionForm] = useState({
    months: 1,
    subscription_plan_id: 0,
    reason: '',
  })

  // Prolonger l'abonnement
  const handleExtendSubscription = async (company: Company) => {
    // Initialiser le formulaire avec les valeurs actuelles de l'entreprise
    setCurrentCompany(company)
    setExtensionForm({
      months: 1,
      subscription_plan_id: company.subscription_plan_id || (subscriptionPlans.length > 0 ? subscriptionPlans[0].id : 1),
      reason: '',
    })
    setShowExtendModal(true)
  }
  
  // Soumettre le formulaire de prolongement
  const submitExtendSubscription = async () => {
    if (currentCompany && extensionForm.months > 0) {
      await execute(async () => {
        // Préparer les données à envoyer
        const requestData: any = { 
          months: extensionForm.months,
        };
        
        // N'ajouter la raison que si elle est définie
        if (extensionForm.reason) {
          requestData.reason = extensionForm.reason;
        }
        
        // N'ajouter le plan que s'il est différent du plan actuel
        if (extensionForm.subscription_plan_id !== currentCompany.subscription_plan_id) {
          requestData.subscription_plan_id = extensionForm.subscription_plan_id;
        }
        
        await superAdminService.extendSubscription(currentCompany.id, requestData);
        toast.success(`Abonnement prolongé de ${extensionForm.months} mois.`);
        setShowExtendModal(false);
        refetch();
      }, `Prolongation de l'abonnement en cours...`);
    }
  }

  // Éditer une entreprise
  const startEdit = (company: Company) => {
    setEditingCompany(company)
    
    // Extraire le prénom et le nom de l'administrateur
    let adminPrenom = ''
    let adminNom = ''
    
    if (company.admin_name) {
      const nameParts = company.admin_name.split(' ')
      if (nameParts.length > 1) {
        adminPrenom = nameParts[0]
        adminNom = nameParts.slice(1).join(' ')
      } else {
        adminPrenom = company.admin_name
        adminNom = ''
      }
    }
    
    setCompanyForm({
      name: company.name,
      email: company.email,
      phone: company.phone || '',
      address: company.address || '',
      city: company.city || '',
      country: company.country || 'FR',
      industry: company.industry || '',
      website: company.website || '',
      tax_id: company.tax_id || '',
      notes: company.notes || '',
      subscription_plan_id: company.subscription_plan_id || 1,
      max_employees: company.max_employees,
      admin_email: company.admin_email || '',
      admin_prenom: adminPrenom,
      admin_nom: adminNom,
      admin_phone: company.admin_phone || '',
      admin_password: ''
    })
    
    setShowModal(true)
  }

  // Exporter les entreprises en CSV
  const exportCompanies = () => {
    const headers = [
      'ID', 'Nom', 'Email', 'Téléphone', 'Adresse', 'Ville', 'Pays', 
      'Secteur', 'Site Web', 'ID Fiscal', 'Plan', 'Statut', 
      'Employés Max', 'Employés Actuels', 'Admin', 'Email Admin', 
      'Date Création', 'Actif'
    ]
    
    const csvData = filteredCompanies.map((company: Company) => [
      company.id,
      company.name,
      company.email,
      company.phone || '',
      company.address || '',
      company.city || '',
      company.country || '',
      company.industry || '',
      company.website || '',
      company.tax_id || '',
      company.subscription_plan,
      company.subscription_status,
      company.max_employees,
      company.current_employee_count || 0,
      company.admin_name || '',
      company.admin_email || '',
      new Date(company.created_at).toLocaleDateString('fr-FR'),
      company.is_active ? 'Oui' : 'Non'
    ])
    
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
  }

  // Vérifier les permissions
  if (!permissions.canGlobalManagement) {
    return (
      <div className="card text-center">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-600">Seuls les SuperAdmins peuvent gérer les entreprises.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Entreprises</h1>
          <p className="text-gray-600">Gérez toutes les entreprises de la plateforme</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportCompanies}
            className="btn-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Entreprise
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nom, email, ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
              <option value="expired">Expiré</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">Tous les plans</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {filteredCompanies.length} entreprise{filteredCompanies.length > 1 ? 's' : ''} trouvée{filteredCompanies.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Liste des entreprises */}
      <div className="space-y-6">
        {filteredCompanies.length === 0 ? (
          <div className="card text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune entreprise trouvée</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || planFilter !== 'all'
                ? 'Aucune entreprise ne correspond aux critères de recherche'
                : 'Commencez par créer votre première entreprise'
              }
            </p>
            {searchTerm || statusFilter !== 'all' || planFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setPlanFilter('all')
                }}
                className="mt-4 btn-secondary"
              >
                Réinitialiser les filtres
              </button>
            ) : (
              <button
                onClick={() => {
                  resetForm()
                  setShowModal(true)
                }}
                className="mt-4 btn-primary"
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                Créer une entreprise
              </button>
            )}
          </div>
        ) : (
          filteredCompanies.map((company: Company) => (
            <div key={company.id} className="card hover:shadow-lg transition-shadow">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Informations générales */}
                <div className="lg:col-span-2">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          {company.is_suspended ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : company.is_subscription_expired ? (
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          <span className={`text-sm ${
                            company.is_suspended ? 'text-red-600' : 
                            company.is_subscription_expired ? 'text-orange-600' : 
                            'text-green-600'
                          }`}>
                            {company.is_suspended ? 'Suspendu' : 
                             company.is_subscription_expired ? 'Abonnement expiré' : 
                             'Actif'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEdit(company)}
                        className="btn-secondary"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company.id, company.name)}
                        className="btn-danger"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{company.email}</span>
                      </div>
                      
                      {company.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">{company.phone}</span>
                        </div>
                      )}
                      
                      {company.address && (
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <span className="text-gray-900">
                            {company.address}
                            {company.city && `, ${company.city}`}
                            {company.country && ` (${company.country})`}
                          </span>
                        </div>
                      )}
                      
                      {company.website && (
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <a href={`https://${company.website.replace(/^https?:\/\//, '')}`} target="_blank\" rel="noopener noreferrer\" className="text-blue-600 hover:underline">
                            {company.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {company.industry && (
                        <div className="flex items-center space-x-2">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">
                            {INDUSTRIES.find(i => i.id === company.industry)?.name || company.industry}
                          </span>
                        </div>
                      )}
                      
                      {company.tax_id && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">ID Fiscal: {company.tax_id}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">
                          Créée le {new Date(company.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">
                          {company.current_employee_count || 0} / {company.max_employees} employés
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informations d'abonnement et administrateur */}
                <div className="border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-6">
                  <div className="space-y-4">
                    {/* Abonnement */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Abonnement</h4>
                      <div className="p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{company.subscription_plan}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            company.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                            company.subscription_status === 'suspended' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {company.subscription_status}
                          </span>
                        </div>
                        
                        {company.subscription_days_remaining !== undefined && (
                          <div className={`text-sm ${
                            company.is_subscription_expired ? 'text-red-600' :
                            company.is_subscription_expiring_soon ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            {company.is_subscription_expired ? 'Expiré' :
                             `${company.subscription_days_remaining} jours restants`}
                          </div>
                        )}
                        
                        <div className="flex space-x-2 mt-3">
                          <button
                            onClick={() => handleExtendSubscription(company)}
                            className="btn-secondary text-xs py-1 px-2"
                          >
                            Prolonger
                          </button>
                          <button
                            onClick={() => handleToggleStatus(company)}
                            className={`text-xs py-1 px-2 rounded-lg ${
                              company.is_suspended 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            {company.is_suspended ? 'Réactiver' : 'Suspendre'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Administrateur */}
                    {company.admin_email && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Administrateur</h4>
                        <div className="p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-medium">{company.admin_name}</div>
                              <div className="text-xs text-gray-500">Administrateur</div>
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span>{company.admin_email}</span>
                            </div>
                            {company.admin_phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span>{company.admin_phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Notes */}
                    {company.notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                        <div className="p-3 rounded-lg bg-gray-50 text-sm text-gray-700">
                          {company.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de création/édition */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => {
              if (!saving) {
                setShowModal(false)
                setEditingCompany(null)
                resetForm()
              }
            }} />
            <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCompany ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
                </h2>
                <button
                  onClick={() => {
                    if (!saving) {
                      setShowModal(false)
                      setEditingCompany(null)
                      resetForm()
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={saving}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Informations de l'entreprise */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                      Informations de l'entreprise
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom de l'entreprise *
                      </label>
                      <input
                        type="text"
                        required
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                        className="input-field"
                        placeholder="Entreprise SAS"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email de l'entreprise *
                      </label>
                      <input
                        type="email"
                        required
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                        className="input-field"                          placeholder="contact@entreprise.ci"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={companyForm.phone}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="input-field"
                          placeholder="+225 27 20 30 40 50"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Secteur d'activité
                        </label>
                        <select
                          value={companyForm.industry}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, industry: e.target.value }))}
                          className="input-field"
                        >
                          <option value="">Sélectionner un secteur</option>
                          {INDUSTRIES.map(industry => (
                            <option key={industry.id} value={industry.id}>{industry.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adresse
                      </label>
                      <textarea
                        rows={2}
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                        className="input-field"
                        placeholder="Rue des Jardins, Cocody"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ville
                        </label>
                        <input
                          type="text"
                          value={companyForm.city}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, city: e.target.value }))}
                          className="input-field"
                          placeholder="Abidjan"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pays
                        </label>
                        <select
                          value={companyForm.country}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, country: e.target.value }))}
                          className="input-field"
                        >
                          <option value="">Sélectionner un pays</option>
                          
                          <optgroup label="Afrique">
                            {COUNTRIES.filter(c => [
                              'CI', 'BJ', 'BF', 'CM', 'CF', 'TD', 'CG', 'CD', 'DJ', 'GQ', 'GA', 'GH', 'GN', 'GW', 'LR', 'ML', 
                              'MR', 'NE', 'NG', 'SN', 'SL', 'TG', 'DZ', 'EG', 'LY', 'MA', 'TN', 'AO', 'BW', 'LS', 'MW', 'MZ', 
                              'NA', 'ZA', 'SZ', 'ZM', 'ZW', 'BI', 'KM', 'ER', 'ET', 'KE', 'MG', 'MU', 'RW', 'SC', 'SO', 'SS', 
                              'SD', 'TZ', 'UG', 'CV', 'GM', 'ST'
                            ].includes(c.code)).map(country => (
                              <option key={country.code} value={country.code}>{country.name}</option>
                            ))}
                          </optgroup>
                          
                          <optgroup label="Europe">
                            {COUNTRIES.filter(c => [
                              'FR', 'BE', 'CH', 'DE', 'ES', 'IT', 'PT', 'NL', 'LU', 'GB', 'IE', 'DK', 'NO', 'SE', 'FI', 'IS',
                              'AT', 'GR', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY'
                            ].includes(c.code)).map(country => (
                              <option key={country.code} value={country.code}>{country.name}</option>
                            ))}
                          </optgroup>
                          
                          <optgroup label="Amériques">
                            {COUNTRIES.filter(c => [
                              'CA', 'US', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'PA', 'CR',
                              'GT', 'HN', 'SV', 'NI', 'CU', 'DO', 'HT', 'JM', 'TT', 'BS', 'BB'
                            ].includes(c.code)).map(country => (
                              <option key={country.code} value={country.code}>{country.name}</option>
                            ))}
                          </optgroup>
                          
                          <optgroup label="Asie">
                            {COUNTRIES.filter(c => [
                              'CN', 'JP', 'KR', 'IN', 'ID', 'MY', 'PH', 'SG', 'TH', 'VN', 'MM', 'KH', 'LA', 'SA', 'AE',
                              'QA', 'KW', 'BH', 'OM', 'IL', 'TR', 'LB', 'JO', 'IQ', 'IR', 'PK', 'BD', 'LK', 'NP'
                            ].includes(c.code)).map(country => (
                              <option key={country.code} value={country.code}>{country.name}</option>
                            ))}
                          </optgroup>
                          
                          <optgroup label="Océanie">
                            {COUNTRIES.filter(c => ['AU', 'NZ', 'FJ', 'PG', 'SB'].includes(c.code)).map(country => (
                              <option key={country.code} value={country.code}>{country.name}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Site web
                        </label>
                        <input
                          type="text"
                          value={companyForm.website}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                          className="input-field"
                          placeholder="www.entreprise.ci"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ID Fiscal (SIRET, TVA...)
                        </label>
                        <input
                          type="text"
                          value={companyForm.tax_id}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, tax_id: e.target.value }))}
                          className="input-field"
                          placeholder="12345678900012"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        value={companyForm.notes}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="input-field"
                        placeholder="Informations complémentaires..."
                      />
                    </div>
                  </div>

                  {/* Abonnement et administrateur */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                      Abonnement et administrateur
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plan d'abonnement
                      </label>
                      <select
                        value={companyForm.subscription_plan_id}
                        onChange={(e) => {
                          const planId = Number(e.target.value);
                          const selectedPlan = subscriptionPlans.find(plan => plan.id === planId);
                          setCompanyForm(prev => ({ 
                            ...prev, 
                            subscription_plan_id: planId,
                            max_employees: selectedPlan?.max_employees || prev.max_employees
                          }));
                        }}
                        className="input-field"
                      >
                        {subscriptionPlans.map(plan => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} ({plan.max_employees > 999 ? 'Illimité' : `${plan.max_employees} employés max`}) 
                            - {plan.duration_months} mois - {plan.price}€/mois
                          </option>
                        ))}
                        {subscriptionPlans.length === 0 && (
                          <option value="">Chargement des plans...</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre maximum d'employés
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={companyForm.max_employees}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, max_employees: parseInt(e.target.value) }))}
                        className="input-field"
                      />
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Administrateur de l'entreprise
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email de l'administrateur
                        </label>
                        <input
                          type="email"
                          value={companyForm.admin_email}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, admin_email: e.target.value }))}
                          className="input-field"
                          placeholder="admin@entreprise.ci"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Prénom
                          </label>
                          <input
                            type="text"
                            value={companyForm.admin_prenom}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, admin_prenom: e.target.value }))}
                            className="input-field"
                            placeholder="Kouamé"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nom
                          </label>
                          <input
                            type="text"
                            value={companyForm.admin_nom}
                            onChange={(e) => setCompanyForm(prev => ({ ...prev, admin_nom: e.target.value }))}
                            className="input-field"
                            placeholder="Konan"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={companyForm.admin_phone}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, admin_phone: e.target.value }))}
                          className="input-field"
                          placeholder="+225 05 45 67 89 10"
                        />
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mot de passe {!editingCompany && '*'}
                        </label>
                        <input
                          type="password"
                          value={companyForm.admin_password}
                          onChange={(e) => setCompanyForm(prev => ({ ...prev, admin_password: e.target.value }))}
                          className="input-field"
                          placeholder={editingCompany ? "Laisser vide pour ne pas changer" : "Mot de passe administrateur"}
                          required={!editingCompany}
                        />
                        {editingCompany && (
                          <p className="text-xs text-gray-500 mt-1">
                            Laissez vide pour conserver le mot de passe actuel
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingCompany(null)
                      resetForm()
                    }}
                    className="btn-secondary"
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={saving}
                  >
                    {saving ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingCompany ? 'Mise à jour...' : 'Création...'}
                      </div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingCompany ? 'Mettre à jour' : 'Créer l\'entreprise'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de prolongement d'abonnement */}
      {showExtendModal && currentCompany && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Prolonger l'abonnement
                    </h3>
                    
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        Entreprise : <strong>{currentCompany.name}</strong><br />
                        Plan actuel : <strong>{currentCompany.subscription_plan}</strong><br />
                        Statut : <strong>{currentCompany.is_subscription_expired ? 'Expiré' : `${currentCompany.subscription_days_remaining} jours restants`}</strong>
                      </p>
                      
                      <div className="space-y-3">
                        {/* Nombre de mois */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre de mois à ajouter
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="24"
                            className="input-field"
                            value={extensionForm.months}
                            onChange={(e) => setExtensionForm({
                              ...extensionForm,
                              months: parseInt(e.target.value) || 1
                            })}
                          />
                        </div>
                        
                        {/* Changement de plan */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Plan d'abonnement (optionnel)
                          </label>
                          <select
                            value={extensionForm.subscription_plan_id}
                            onChange={(e) => setExtensionForm({
                              ...extensionForm,
                              subscription_plan_id: parseInt(e.target.value)
                            })}
                            className="input-field"
                          >
                            {subscriptionPlans.map(plan => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name} ({plan.max_employees > 999 ? 'Illimité' : `${plan.max_employees} employés max`}) 
                                - {plan.price}€/mois
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Laissez ce champ inchangé pour conserver le plan actuel.
                          </p>
                        </div>
                        
                        {/* Raison / Note */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Raison de la prolongation (optionnel)
                          </label>
                          <textarea
                            className="input-field min-h-[80px]"
                            placeholder="Ajoutez une note ou raison pour cette prolongation..."
                            value={extensionForm.reason}
                            onChange={(e) => setExtensionForm({
                              ...extensionForm,
                              reason: e.target.value
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={submitExtendSubscription}
                  className="btn-primary w-full sm:w-auto"
                >
                  Prolonger l'abonnement
                </button>
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="btn-secondary mt-3 sm:mt-0 sm:mr-3 w-full sm:w-auto"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}