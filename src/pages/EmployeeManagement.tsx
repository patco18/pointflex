import React, { useState, useEffect } from 'react'
import { adminService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Mail,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  X,
  Save,
  Phone,
  MapPin,
  Building,
  Briefcase,
  UserCheck,
  Eye,
  EyeOff,
  Search,
  Filter,
  Download,
  Upload,
  Layers
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Employee {
  id: number
  email: string
  nom: string
  prenom: string
  role: string
  is_active: boolean
  employee_number: string
  phone: string
  department_name?: string
  service_name?: string
  position_name?: string
  manager_name?: string
  company_name?: string
  created_at: string
}

interface OrganizationData {
  departments: Array<{id: number, name: string}>
  services: Array<{id: number, name: string, department_id: number}>
  positions: Array<{id: number, name: string, level: string}>
  managers: Array<{id: number, name: string, role: string}>
}

interface EmployeeForm {
  email: string
  nom: string
  prenom: string
  role: string
  password: string
  phone: string
  address: string
  country: string
  date_birth: string
  date_hire: string
  emergency_contact_name: string
  emergency_contact_phone: string
  bio: string
  skills: string
  department_id: string
  service_id: string
  position_id: string
  manager_id: string
}

// Liste complète des pays
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albanie' },
  { code: 'DZ', name: 'Algérie' },
  { code: 'AD', name: 'Andorre' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua-et-Barbuda' },
  { code: 'AR', name: 'Argentine' },
  { code: 'AM', name: 'Arménie' },
  { code: 'AU', name: 'Australie' },
  { code: 'AT', name: 'Autriche' },
  { code: 'AZ', name: 'Azerbaïdjan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahreïn' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbade' },
  { code: 'BY', name: 'Biélorussie' },
  { code: 'BE', name: 'Belgique' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Bénin' },
  { code: 'BT', name: 'Bhoutan' },
  { code: 'BO', name: 'Bolivie' },
  { code: 'BA', name: 'Bosnie-Herzégovine' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brésil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgarie' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cap-Vert' },
  { code: 'KH', name: 'Cambodge' },
  { code: 'CM', name: 'Cameroun' },
  { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'République centrafricaine' },
  { code: 'TD', name: 'Tchad' },
  { code: 'CL', name: 'Chili' },
  { code: 'CN', name: 'Chine' },
  { code: 'CO', name: 'Colombie' },
  { code: 'KM', name: 'Comores' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'République démocratique du Congo' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: 'Côte d\'Ivoire' },
  { code: 'HR', name: 'Croatie' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Chypre' },
  { code: 'CZ', name: 'République tchèque' },
  { code: 'DK', name: 'Danemark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominique' },
  { code: 'DO', name: 'République dominicaine' },
  { code: 'EC', name: 'Équateur' },
  { code: 'EG', name: 'Égypte' },
  { code: 'SV', name: 'Salvador' },
  { code: 'GQ', name: 'Guinée équatoriale' },
  { code: 'ER', name: 'Érythrée' },
  { code: 'EE', name: 'Estonie' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Éthiopie' },
  { code: 'FJ', name: 'Fidji' },
  { code: 'FI', name: 'Finlande' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambie' },
  { code: 'GE', name: 'Géorgie' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Grèce' },
  { code: 'GD', name: 'Grenade' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinée' },
  { code: 'GW', name: 'Guinée-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haïti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hongrie' },
  { code: 'IS', name: 'Islande' },
  { code: 'IN', name: 'Inde' },
  { code: 'ID', name: 'Indonésie' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Irak' },
  { code: 'IE', name: 'Irlande' },
  { code: 'IL', name: 'Israël' },
  { code: 'IT', name: 'Italie' },
  { code: 'JM', name: 'Jamaïque' },
  { code: 'JP', name: 'Japon' },
  { code: 'JO', name: 'Jordanie' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'Corée du Nord' },
  { code: 'KR', name: 'Corée du Sud' },
  { code: 'KW', name: 'Koweït' },
  { code: 'KG', name: 'Kirghizistan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Lettonie' },
  { code: 'LB', name: 'Liban' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libye' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lituanie' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaisie' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malte' },
  { code: 'MH', name: 'Îles Marshall' },
  { code: 'MR', name: 'Mauritanie' },
  { code: 'MU', name: 'Maurice' },
  { code: 'MX', name: 'Mexique' },
  { code: 'FM', name: 'Micronésie' },
  { code: 'MD', name: 'Moldavie' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolie' },
  { code: 'ME', name: 'Monténégro' },
  { code: 'MA', name: 'Maroc' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibie' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Népal' },
  { code: 'NL', name: 'Pays-Bas' },
  { code: 'NZ', name: 'Nouvelle-Zélande' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'Macédoine du Nord' },
  { code: 'NO', name: 'Norvège' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palaos' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papouasie-Nouvelle-Guinée' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Pérou' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Pologne' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Roumanie' },
  { code: 'RU', name: 'Russie' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint-Kitts-et-Nevis' },
  { code: 'LC', name: 'Sainte-Lucie' },
  { code: 'VC', name: 'Saint-Vincent-et-les-Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'Saint-Marin' },
  { code: 'ST', name: 'Sao Tomé-et-Principe' },
  { code: 'SA', name: 'Arabie saoudite' },
  { code: 'SN', name: 'Sénégal' },
  { code: 'RS', name: 'Serbie' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapour' },
  { code: 'SK', name: 'Slovaquie' },
  { code: 'SI', name: 'Slovénie' },
  { code: 'SB', name: 'Îles Salomon' },
  { code: 'SO', name: 'Somalie' },
  { code: 'ZA', name: 'Afrique du Sud' },
  { code: 'SS', name: 'Soudan du Sud' },
  { code: 'ES', name: 'Espagne' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Soudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Suède' },
  { code: 'CH', name: 'Suisse' },
  { code: 'SY', name: 'Syrie' },
  { code: 'TJ', name: 'Tadjikistan' },
  { code: 'TZ', name: 'Tanzanie' },
  { code: 'TH', name: 'Thaïlande' },
  { code: 'TL', name: 'Timor oriental' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinité-et-Tobago' },
  { code: 'TN', name: 'Tunisie' },
  { code: 'TR', name: 'Turquie' },
  { code: 'TM', name: 'Turkménistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Ouganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'Émirats arabes unis' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'US', name: 'États-Unis' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Ouzbékistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yémen' },
  { code: 'ZM', name: 'Zambie' },
  { code: 'ZW', name: 'Zimbabwe' }
]

export default function EmployeeManagement() {
  const { isSuperAdmin } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showPassword, setShowPassword] = useState(false)
  
  // Données organisationnelles
  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    departments: [],
    services: [],
    positions: [],
    managers: []
  })

  // Formulaire d'employé enrichi
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>({
    email: '',
    nom: '',
    prenom: '',
    role: 'employee',
    password: '',
    phone: '',
    address: '',
    country: 'FR', // France par défaut
    date_birth: '',
    date_hire: new Date().toISOString().split('T')[0], // Aujourd'hui par défaut
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bio: '',
    skills: '',
    department_id: '',
    service_id: '',
    position_id: '',
    manager_id: ''
  })

  useEffect(() => {
    loadEmployees()
    loadOrganizationData()
  }, [])

  const loadEmployees = async () => {
    try {
      const response = await adminService.getEmployees()
      setEmployees(response.data.employees)
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error)
      toast.error('Erreur lors du chargement des employés')
    } finally {
      setLoading(false)
    }
  }

  const loadOrganizationData = async () => {
    try {
      const response = await adminService.getOrganizationData()
      // Ensure all keys exist to avoid undefined access
      setOrganizationData({
        departments: response.data.departments || [],
        services: response.data.services || [],
        positions: response.data.positions || [],
        managers: response.data.managers || []
      })
    } catch (error) {
      console.error('Erreur lors du chargement des données organisationnelles:', error)
    }
  }

  const resetEmployeeForm = () => {
    setEmployeeForm({
      email: '',
      nom: '',
      prenom: '',
      role: 'employee',
      password: '',
      phone: '',
      address: '',
      country: 'FR',
      date_birth: '',
      date_hire: new Date().toISOString().split('T')[0],
      emergency_contact_name: '',
      emergency_contact_phone: '',
      bio: '',
      skills: '',
      department_id: '',
      service_id: '',
      position_id: '',
      manager_id: ''
    })
  }

  const handleInputChange = (field: keyof EmployeeForm, value: string) => {
    setEmployeeForm(prev => ({
      ...prev,
      [field]: value
    }))

    // Si le département change, réinitialiser le service
    if (field === 'department_id') {
      setEmployeeForm(prev => ({
        ...prev,
        service_id: ''
      }))
    }
  }

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation des champs requis
    if (!employeeForm.email || !employeeForm.nom || !employeeForm.prenom) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setCreating(true)
    try {
      const employeeData = {
        ...employeeForm,
        // Convertir les IDs en nombres ou null
        department_id: employeeForm.department_id ? parseInt(employeeForm.department_id) : null,
        service_id: employeeForm.service_id ? parseInt(employeeForm.service_id) : null,
        position_id: employeeForm.position_id ? parseInt(employeeForm.position_id) : null,
        manager_id: employeeForm.manager_id ? parseInt(employeeForm.manager_id) : null,
        // Générer un mot de passe par défaut si vide
        password: employeeForm.password || 'employee123'
      }

      await adminService.createEmployee(employeeData)
      toast.success('Employé créé avec succès!')
      setShowCreateModal(false)
      resetEmployeeForm()
      loadEmployees()
    } catch (error: any) {
      console.error('Erreur lors de la création:', error)
      const message = error.response?.data?.message || 'Erreur lors de la création de l\'employé'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmployee) return

    setUpdating(true)
    try {
      const employeeData = {
        ...employeeForm,
        department_id: employeeForm.department_id ? parseInt(employeeForm.department_id) : null,
        service_id: employeeForm.service_id ? parseInt(employeeForm.service_id) : null,
        position_id: employeeForm.position_id ? parseInt(employeeForm.position_id) : null,
        manager_id: employeeForm.manager_id ? parseInt(employeeForm.manager_id) : null
      }

      await adminService.updateEmployee(editingEmployee.id, employeeData)
      toast.success('Employé mis à jour avec succès!')
      setEditingEmployee(null)
      resetEmployeeForm()
      loadEmployees()
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error)
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour'
      toast.error(message)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteEmployee = async (employeeId: number, employeeName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'employé "${employeeName}" ?`)) {
      return
    }

    try {
      await adminService.deleteEmployee(employeeId)
      toast.success('Employé supprimé avec succès!')
      loadEmployees()
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error)
      const message = error.response?.data?.message || 'Erreur lors de la suppression'
      toast.error(message)
    }
  }

  const startEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    // Charger les données de l'employé dans le formulaire
    setEmployeeForm({
      email: employee.email,
      nom: employee.nom,
      prenom: employee.prenom,
      role: employee.role,
      password: '',
      phone: employee.phone || '',
      address: '',
      country: 'FR',
      date_birth: '',
      date_hire: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      bio: '',
      skills: '',
      department_id: '',
      service_id: '',
      position_id: '',
      manager_id: ''
    })
  }

  const cancelEdit = () => {
    setEditingEmployee(null)
    resetEmployeeForm()
  }

  // Filtrer les services par département sélectionné
  const getFilteredServices = () => {
    if (!employeeForm.department_id) return []
    return organizationData.services.filter(
      service => service.department_id === parseInt(employeeForm.department_id)
    )
  }

  // Filtrer les employés
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const exportEmployees = () => {
    const csvData = filteredEmployees.map(emp => [
      emp.employee_number,
      emp.prenom,
      emp.nom,
      emp.email,
      emp.phone,
      emp.role,
      emp.department_name || '',
      emp.service_name || '',
      emp.position_name || '',
      emp.manager_name || '',
      emp.is_active ? 'Actif' : 'Inactif',
      new Date(emp.created_at).toLocaleDateString('fr-FR')
    ])
    
    const headers = [
      'Numéro employé', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Rôle',
      'Département', 'Service', 'Poste', 'Manager', 'Statut', 'Date création'
    ]
    
    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `employes_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion des {isSuperAdmin ? 'Utilisateurs' : 'Employés'}
          </h1>
          <p className="text-gray-600">
            {isSuperAdmin 
              ? 'Gérez tous les utilisateurs de la plateforme'
              : 'Gérez les employés de votre entreprise'
            }
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportEmployees}
            className="btn-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </button>
          <button
            onClick={() => {
              resetEmployeeForm()
              setShowCreateModal(true)
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvel Employé
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nom, email, numéro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">Tous les rôles</option>
              <option value="superadmin">SuperAdmin</option>
              <option value="admin_rh">Administrateur</option>
              <option value="chef_service">Chef de Service</option>
              <option value="chef_projet">Chef de Projet</option>
              <option value="manager">Manager</option>
              <option value="employee">Employé</option>
              <option value="auditeur">Auditeur</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {filteredEmployees.length} employé{filteredEmployees.length > 1 ? 's' : ''} trouvé{filteredEmployees.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                {isSuperAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entreprise
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          <Link
                            to={`/admin/employees/${employee.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {employee.prenom} {employee.nom}
                          </Link>
                        </div>
                        <div className="text-sm text-gray-500">
                          #{employee.employee_number}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {employee.email}
                      </div>
                      {employee.phone && (
                        <div className="flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {employee.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {employee.department_name && (
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-2 text-gray-400" />
                          {employee.department_name}
                        </div>
                      )}
                      {employee.service_name && (
                        <div className="flex items-center mt-1">
                          <Layers className="h-4 w-4 mr-2 text-gray-400" />
                          {employee.service_name}
                        </div>
                      )}
                      {employee.position_name && (
                        <div className="flex items-center mt-1">
                          <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                          {employee.position_name}
                        </div>
                      )}
                      {employee.manager_name && (
                        <div className="flex items-center mt-1">
                          <UserCheck className="h-4 w-4 mr-2 text-gray-400" />
                          {employee.manager_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.role === 'superadmin'
                        ? 'bg-red-100 text-red-800'
                        : employee.role === 'admin_rh'
                        ? 'bg-purple-100 text-purple-800'
                        : employee.role === 'chef_service'
                        ? 'bg-indigo-100 text-indigo-800'
                        : employee.role === 'chef_projet'
                        ? 'bg-green-100 text-green-800'
                        : employee.role === 'manager'
                        ? 'bg-yellow-100 text-yellow-800'
                        : employee.role === 'auditeur'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {employee.role}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.company_name || 'N/A'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.is_active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Actif
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactif
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => startEdit(employee)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteEmployee(employee.id, `${employee.prenom} ${employee.nom}`)}
                        className="text-red-600 hover:text-red-900"
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

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun employé trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || roleFilter !== 'all' 
                ? 'Aucun employé ne correspond aux critères de recherche'
                : 'Commencez par créer votre premier employé'
              }
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Employee Modal */}
      {(showCreateModal || editingEmployee) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => {
              setShowCreateModal(false)
              cancelEdit()
            }} />
            <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEmployee ? 'Modifier l\'employé' : 'Créer un nouvel employé'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    cancelEdit()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={editingEmployee ? handleUpdateEmployee : handleCreateEmployee}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Informations personnelles */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                      Informations personnelles
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prénom *
                        </label>
                        <input
                          type="text"
                          required
                          value={employeeForm.prenom}
                          onChange={(e) => handleInputChange('prenom', e.target.value)}
                          className="input-field"
                          placeholder="Jean"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom *
                        </label>
                        <input
                          type="text"
                          required
                          value={employeeForm.nom}
                          onChange={(e) => handleInputChange('nom', e.target.value)}
                          className="input-field"
                          placeholder="Dupont"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={employeeForm.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="input-field"
                        placeholder="jean.dupont@entreprise.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mot de passe {!editingEmployee && '*'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={!editingEmployee}
                          value={employeeForm.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          className="input-field pr-10"
                          placeholder={editingEmployee ? 'Laisser vide pour ne pas changer' : 'employee123'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={employeeForm.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="input-field"
                          placeholder="01 23 45 67 89"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pays
                        </label>
                        <select
                          value={employeeForm.country}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                          className="input-field"
                        >
                          {COUNTRIES.map(country => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
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
                        value={employeeForm.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="input-field"
                        placeholder="123 Rue de la Paix, 75001 Paris"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de naissance
                        </label>
                        <input
                          type="date"
                          value={employeeForm.date_birth}
                          onChange={(e) => handleInputChange('date_birth', e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date d'embauche
                        </label>
                        <input
                          type="date"
                          value={employeeForm.date_hire}
                          onChange={(e) => handleInputChange('date_hire', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact d'urgence
                        </label>
                        <input
                          type="text"
                          value={employeeForm.emergency_contact_name}
                          onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                          className="input-field"
                          placeholder="Nom du contact"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Téléphone d'urgence
                        </label>
                        <input
                          type="tel"
                          value={employeeForm.emergency_contact_phone}
                          onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                          className="input-field"
                          placeholder="01 23 45 67 89"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informations professionnelles */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                      Informations professionnelles
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rôle
                      </label>
                      <select
                        value={employeeForm.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="input-field"
                      >
                        <option value="superadmin">SuperAdmin</option>
                        <option value="admin_rh">Administrateur</option>
                        <option value="chef_service">Chef de Service</option>
                        <option value="chef_projet">Chef de Projet</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Employé</option>
                        <option value="auditeur">Auditeur</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Département
                      </label>
                      <select
                        value={employeeForm.department_id}
                        onChange={(e) => handleInputChange('department_id', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Aucun département</option>
                        {organizationData.departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service
                      </label>
                      <select
                        value={employeeForm.service_id}
                        onChange={(e) => handleInputChange('service_id', e.target.value)}
                        className="input-field"
                        disabled={!employeeForm.department_id}
                      >
                        <option value="">Aucun service</option>
                        {getFilteredServices().map(service => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                      {!employeeForm.department_id && (
                        <p className="text-xs text-gray-500 mt-1">
                          Sélectionnez d'abord un département
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Poste
                      </label>
                      <select
                        value={employeeForm.position_id}
                        onChange={(e) => handleInputChange('position_id', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Aucun poste</option>
                        {organizationData.positions.map(position => (
                          <option key={position.id} value={position.id}>
                            {position.name} {position.level && `(${position.level})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Manager
                      </label>
                      <select
                        value={employeeForm.manager_id}
                        onChange={(e) => handleInputChange('manager_id', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Aucun manager</option>
                        {organizationData.managers.map(manager => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} ({manager.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Biographie
                      </label>
                      <textarea
                        rows={3}
                        value={employeeForm.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        className="input-field"
                        placeholder="Présentation de l'employé..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Compétences
                      </label>
                      <textarea
                        rows={3}
                        value={employeeForm.skills}
                        onChange={(e) => handleInputChange('skills', e.target.value)}
                        className="input-field"
                        placeholder="React, TypeScript, Python, etc."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Séparez les compétences par des virgules
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      cancelEdit()
                    }}
                    className="btn-secondary"
                    disabled={creating || updating}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={creating || updating}
                  >
                    {(creating || updating) ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingEmployee ? 'Mise à jour...' : 'Création...'}
                      </div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingEmployee ? 'Mettre à jour' : 'Créer l\'employé'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}