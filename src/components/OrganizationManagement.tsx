import React, { useState } from 'react'
import { adminService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { 
  Building, 
  Plus, 
  Edit, 
  Trash2, 
  Users,
  DollarSign,
  Briefcase,
  Settings,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Layers
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Department {
  id: number
  name: string
  description: string
  manager_id?: number
  manager_name?: string
  budget?: number
  is_active: boolean
  employee_count: number
  service_count: number
  company_name?: string
  created_at: string
  updated_at: string
}

interface Service {
  id: number
  name: string
  description: string
  department_id: number
  department_name: string
  manager_id?: number
  manager_name?: string
  is_active: boolean
  employee_count: number
  company_name?: string
  created_at: string
  updated_at: string
}

interface Position {
  id: number
  name: string
  description: string
  level: string
  salary_min?: number
  salary_max?: number
  requirements: string
  is_active: boolean
  employee_count: number
  company_name?: string
  created_at: string
  updated_at: string
}

export default function OrganizationManagement() {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<'departments' | 'services' | 'positions'>('departments')
  const [loading, setLoading] = useState(true)
  
  // États pour les départements
  const [departments, setDepartments] = useState<Department[]>([])
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
    manager_id: '',
    budget: ''
  })
  
  // États pour les services
  const [services, setServices] = useState<Service[]>([])
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    department_id: '',
    manager_id: ''
  })
  
  // États pour les postes
  const [positions, setPositions] = useState<Position[]>([])
  const [showPositionModal, setShowPositionModal] = useState(false)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [positionForm, setPositionForm] = useState({
    name: '',
    description: '',
    level: '',
    salary_min: '',
    salary_max: '',
    requirements: ''
  })
  
  // États communs
  const [organizationData, setOrganizationData] = useState({
    departments: [],
    services: [],
    positions: [],
    managers: []
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (isAdmin) {
      loadAllData()
    }
  }, [isAdmin, activeTab])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [orgDataResponse] = await Promise.all([
        adminService.getOrganizationData()
      ])
      
      setOrganizationData(orgDataResponse.data)
      
      if (activeTab === 'departments') {
        const deptResponse = await adminService.getDepartments()
        setDepartments(deptResponse.data.departments)
      } else if (activeTab === 'services') {
        const serviceResponse = await adminService.getServices()
        setServices(serviceResponse.data.services)
      } else if (activeTab === 'positions') {
        const positionResponse = await adminService.getPositions()
        setPositions(positionResponse.data.positions)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  // Fonctions pour les départements
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deptForm.name.trim()) {
      toast.error('Le nom du département est requis')
      return
    }

    setSaving(true)
    try {
      await adminService.createDepartment({
        name: deptForm.name,
        description: deptForm.description,
        manager_id: deptForm.manager_id || null,
        budget: deptForm.budget ? parseFloat(deptForm.budget) : null
      })
      toast.success('Département créé avec succès!')
      setShowDeptModal(false)
      resetDeptForm()
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDept) return

    setSaving(true)
    try {
      await adminService.updateDepartment(editingDept.id, {
        name: deptForm.name,
        description: deptForm.description,
        manager_id: deptForm.manager_id || null,
        budget: deptForm.budget ? parseFloat(deptForm.budget) : null,
        is_active: editingDept.is_active
      })
      toast.success('Département mis à jour avec succès!')
      setEditingDept(null)
      resetDeptForm()
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDepartment = async (deptId: number, deptName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le département "${deptName}" ?`)) {
      return
    }

    try {
      await adminService.deleteDepartment(deptId)
      toast.success('Département supprimé avec succès!')
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression'
      toast.error(errorMessage)
    }
  }

  const resetDeptForm = () => {
    setDeptForm({
      name: '',
      description: '',
      manager_id: '',
      budget: ''
    })
  }

  const startEditDept = (dept: Department) => {
    setEditingDept(dept)
    setDeptForm({
      name: dept.name,
      description: dept.description,
      manager_id: dept.manager_id?.toString() || '',
      budget: dept.budget?.toString() || ''
    })
  }

  // Fonctions pour les services
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceForm.name.trim() || !serviceForm.department_id) {
      toast.error('Le nom du service et le département sont requis')
      return
    }

    setSaving(true)
    try {
      await adminService.createService({
        name: serviceForm.name,
        description: serviceForm.description,
        department_id: parseInt(serviceForm.department_id),
        manager_id: serviceForm.manager_id || null
      })
      toast.success('Service créé avec succès!')
      setShowServiceModal(false)
      resetServiceForm()
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingService) return

    setSaving(true)
    try {
      await adminService.updateService(editingService.id, {
        name: serviceForm.name,
        description: serviceForm.description,
        department_id: parseInt(serviceForm.department_id),
        manager_id: serviceForm.manager_id || null,
        is_active: editingService.is_active
      })
      toast.success('Service mis à jour avec succès!')
      setEditingService(null)
      resetServiceForm()
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteService = async (serviceId: number, serviceName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le service "${serviceName}" ?`)) {
      return
    }

    try {
      await adminService.deleteService(serviceId)
      toast.success('Service supprimé avec succès!')
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression'
      toast.error(errorMessage)
    }
  }

  const resetServiceForm = () => {
    setServiceForm({
      name: '',
      description: '',
      department_id: '',
      manager_id: ''
    })
  }

  const startEditService = (service: Service) => {
    setEditingService(service)
    setServiceForm({
      name: service.name,
      description: service.description,
      department_id: service.department_id.toString(),
      manager_id: service.manager_id?.toString() || ''
    })
  }

  // Fonctions pour les postes
  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!positionForm.name.trim()) {
      toast.error('Le nom du poste est requis')
      return
    }

    setSaving(true)
    try {
      await adminService.createPosition({
        name: positionForm.name,
        description: positionForm.description,
        level: positionForm.level,
        salary_min: positionForm.salary_min ? parseFloat(positionForm.salary_min) : null,
        salary_max: positionForm.salary_max ? parseFloat(positionForm.salary_max) : null,
        requirements: positionForm.requirements
      })
      toast.success('Poste créé avec succès!')
      setShowPositionModal(false)
      resetPositionForm()
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePosition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPosition) return

    setSaving(true)
    try {
      await adminService.updatePosition(editingPosition.id, {
        name: positionForm.name,
        description: positionForm.description,
        level: positionForm.level,
        salary_min: positionForm.salary_min ? parseFloat(positionForm.salary_min) : null,
        salary_max: positionForm.salary_max ? parseFloat(positionForm.salary_max) : null,
        requirements: positionForm.requirements,
        is_active: editingPosition.is_active
      })
      toast.success('Poste mis à jour avec succès!')
      setEditingPosition(null)
      resetPositionForm()
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePosition = async (positionId: number, positionName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le poste "${positionName}" ?`)) {
      return
    }

    try {
      await adminService.deletePosition(positionId)
      toast.success('Poste supprimé avec succès!')
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression'
      toast.error(errorMessage)
    }
  }

  const resetPositionForm = () => {
    setPositionForm({
      name: '',
      description: '',
      level: '',
      salary_min: '',
      salary_max: '',
      requirements: ''
    })
  }

  const startEditPosition = (position: Position) => {
    setEditingPosition(position)
    setPositionForm({
      name: position.name,
      description: position.description,
      level: position.level,
      salary_min: position.salary_min?.toString() || '',
      salary_max: position.salary_max?.toString() || '',
      requirements: position.requirements
    })
  }

  // Fonctions de filtrage
  const filterItems = (items: any[]) => {
    return items.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && item.is_active) ||
        (statusFilter === 'inactive' && !item.is_active)
      
      return matchesSearch && matchesStatus
    })
  }

  const levels = ['Junior', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level']

  if (!isAdmin) {
    return (
      <div className="card text-center">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès restreint
        </h3>
        <p className="text-gray-600">
          Seuls les administrateurs peuvent gérer la structure organisationnelle.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la structure organisationnelle...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Structure Organisationnelle</h1>
          <p className="text-gray-600">
            Gérez les départements, services et postes de votre entreprise
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'departments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building className="inline-block w-4 h-4 mr-2" />
            Départements ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'services'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Layers className="inline-block w-4 h-4 mr-2" />
            Services ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'positions'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Briefcase className="inline-block w-4 h-4 mr-2" />
            Postes ({positions.length})
          </button>
        </nav>
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nom, description..."
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
              <option value="inactive">Inactif</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                if (activeTab === 'departments') {
                  resetDeptForm()
                  setShowDeptModal(true)
                } else if (activeTab === 'services') {
                  resetServiceForm()
                  setShowServiceModal(true)
                } else if (activeTab === 'positions') {
                  resetPositionForm()
                  setShowPositionModal(true)
                }
              }}
              className="btn-primary w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter {activeTab === 'departments' ? 'Département' : activeTab === 'services' ? 'Service' : 'Poste'}
            </button>
          </div>
        </div>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filterItems(departments).map((dept) => (
            <div key={dept.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{dept.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {dept.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm ${dept.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {dept.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => startEditDept(dept)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {dept.description && (
                  <p className="text-gray-700">{dept.description}</p>
                )}
                
                {dept.manager_name && (
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Manager: {dept.manager_name}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{dept.employee_count} employé{dept.employee_count > 1 ? 's' : ''}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4" />
                  <span>{dept.service_count} service{dept.service_count > 1 ? 's' : ''}</span>
                </div>
                
                {dept.budget && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Budget: {dept.budget.toLocaleString('fr-FR')} €</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {filterItems(departments).length === 0 && (
            <div className="col-span-full text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun département trouvé</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Aucun département ne correspond aux critères de recherche'
                  : 'Commencez par créer votre premier département'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filterItems(services).map((service) => (
            <div key={service.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Layers className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-600">{service.department_name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {service.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm ${service.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {service.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => startEditService(service)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id, service.name)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {service.description && (
                  <p className="text-gray-700">{service.description}</p>
                )}
                
                {service.manager_name && (
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Manager: {service.manager_name}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{service.employee_count} employé{service.employee_count > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          ))}
          
          {filterItems(services).length === 0 && (
            <div className="col-span-full text-center py-12">
              <Layers className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun service trouvé</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Aucun service ne correspond aux critères de recherche'
                  : 'Commencez par créer votre premier service'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filterItems(positions).map((position) => (
            <div key={position.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Briefcase className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{position.name}</h3>
                    {position.level && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {position.level}
                      </span>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      {position.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm ${position.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {position.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => startEditPosition(position)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePosition(position.id, position.name)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {position.description && (
                  <p className="text-gray-700">{position.description}</p>
                )}
                
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{position.employee_count} employé{position.employee_count > 1 ? 's' : ''}</span>
                </div>
                
                {(position.salary_min || position.salary_max) && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      {position.salary_min && position.salary_max 
                        ? `${position.salary_min.toLocaleString('fr-FR')} - ${position.salary_max.toLocaleString('fr-FR')} €`
                        : position.salary_min 
                        ? `À partir de ${position.salary_min.toLocaleString('fr-FR')} €`
                        : `Jusqu'à ${position.salary_max?.toLocaleString('fr-FR')} €`
                      }
                    </span>
                  </div>
                )}
                
                {position.requirements && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 italic">{position.requirements}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {filterItems(positions).length === 0 && (
            <div className="col-span-full text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun poste trouvé</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Aucun poste ne correspond aux critères de recherche'
                  : 'Commencez par créer votre premier poste'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal Département */}
      {(showDeptModal || editingDept) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => {
              setShowDeptModal(false)
              setEditingDept(null)
              resetDeptForm()
            }} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingDept ? 'Modifier le département' : 'Nouveau département'}
                </h2>
                <button
                  onClick={() => {
                    setShowDeptModal(false)
                    setEditingDept(null)
                    resetDeptForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={editingDept ? handleUpdateDepartment : handleCreateDepartment}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du département *
                    </label>
                    <input
                      type="text"
                      required
                      value={deptForm.name}
                      onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field"
                      placeholder="Ex: Gestion Administrative"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={deptForm.description}
                      onChange={(e) => setDeptForm(prev => ({ ...prev, description: e.target.value }))}
                      className="input-field"
                      placeholder="Description du département..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manager
                    </label>
                    <select
                      value={deptForm.manager_id}
                      onChange={(e) => setDeptForm(prev => ({ ...prev, manager_id: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">Aucun manager</option>
                      {organizationData.managers.map((manager: any) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name} ({manager.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={deptForm.budget}
                      onChange={(e) => setDeptForm(prev => ({ ...prev, budget: e.target.value }))}
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeptModal(false)
                      setEditingDept(null)
                      resetDeptForm()
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
                        {editingDept ? 'Mise à jour...' : 'Création...'}
                      </div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingDept ? 'Mettre à jour' : 'Créer'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Service */}
      {(showServiceModal || editingService) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => {
              setShowServiceModal(false)
              setEditingService(null)
              resetServiceForm()
            }} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingService ? 'Modifier le service' : 'Nouveau service'}
                </h2>
                <button
                  onClick={() => {
                    setShowServiceModal(false)
                    setEditingService(null)
                    resetServiceForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={editingService ? handleUpdateService : handleCreateService}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du service *
                    </label>
                    <input
                      type="text"
                      required
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field"
                      placeholder="Ex: Service Commercial"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Département *
                    </label>
                    <select
                      required
                      value={serviceForm.department_id}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, department_id: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">Sélectionner un département</option>
                      {organizationData.departments.map((dept: any) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                      className="input-field"
                      placeholder="Description du service..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manager
                    </label>
                    <select
                      value={serviceForm.manager_id}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, manager_id: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">Aucun manager</option>
                      {organizationData.managers.map((manager: any) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name} ({manager.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowServiceModal(false)
                      setEditingService(null)
                      resetServiceForm()
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
                        {editingService ? 'Mise à jour...' : 'Création...'}
                      </div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingService ? 'Mettre à jour' : 'Créer'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Poste */}
      {(showPositionModal || editingPosition) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => {
              setShowPositionModal(false)
              setEditingPosition(null)
              resetPositionForm()
            }} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPosition ? 'Modifier le poste' : 'Nouveau poste'}
                </h2>
                <button
                  onClick={() => {
                    setShowPositionModal(false)
                    setEditingPosition(null)
                    resetPositionForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={editingPosition ? handleUpdatePosition : handleCreatePosition}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du poste *
                    </label>
                    <input
                      type="text"
                      required
                      value={positionForm.name}
                      onChange={(e) => setPositionForm(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field"
                      placeholder="Ex: Chef Comptable"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Niveau
                    </label>
                    <select
                      value={positionForm.level}
                      onChange={(e) => setPositionForm(prev => ({ ...prev, level: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">Sélectionner un niveau</option>
                      {levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={positionForm.description}
                      onChange={(e) => setPositionForm(prev => ({ ...prev, description: e.target.value }))}
                      className="input-field"
                      placeholder="Description du poste..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salaire min (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={positionForm.salary_min}
                        onChange={(e) => setPositionForm(prev => ({ ...prev, salary_min: e.target.value }))}
                        className="input-field"
                        placeholder="35000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salaire max (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={positionForm.salary_max}
                        onChange={(e) => setPositionForm(prev => ({ ...prev, salary_max: e.target.value }))}
                        className="input-field"
                        placeholder="55000"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exigences
                    </label>
                    <textarea
                      rows={3}
                      value={positionForm.requirements}
                      onChange={(e) => setPositionForm(prev => ({ ...prev, requirements: e.target.value }))}
                      className="input-field"
                      placeholder="Compétences requises, expérience..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPositionModal(false)
                      setEditingPosition(null)
                      resetPositionForm()
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
                        {editingPosition ? 'Mise à jour...' : 'Création...'}
                      </div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingPosition ? 'Mettre à jour' : 'Créer'}
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