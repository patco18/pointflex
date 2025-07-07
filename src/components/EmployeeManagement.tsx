import React, { useState } from 'react'
import { adminService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useApi, useAsyncAction } from '../hooks/useApi'
import Modal from './shared/Modal'
import LoadingSpinner from './shared/LoadingSpinner'
import StatusBadge from './shared/StatusBadge'
import DataTable from './shared/DataTable'
import { 
  Users, Plus, Edit, Trash2, Mail, Phone, Building, 
  Briefcase, UserCheck, Shield, Save, FileText, Download // Added FileText, Download
} from 'lucide-react'

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
  manager_id?: number | null; // Added manager_id
  manager_name?: string | null; // Existing, ensure it can be null
  company_name?: string
  created_at: string
}

interface EmployeeForm {
  email: string
  nom: string
  prenom: string
  role: string
  password: string
  phone: string
  department_id: string
  service_id: string
  position_id: string
  manager_id: string
}

const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'États-Unis' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'ES', name: 'Espagne' },
  { code: 'IT', name: 'Italie' }
]

export default function EmployeeManagement() {
  const { isAdmin, isSuperAdmin } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);
  
  // State for Leave Report Modal
  const [showLeaveReportModal, setShowLeaveReportModal] = useState(false);
  const [selectedEmployeeForReport, setSelectedEmployeeForReport] = useState<Employee | null>(null);
  const [leaveReportFilters, setLeaveReportFilters] = useState({ start_date: '', end_date: '', status: '' });
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const [form, setForm] = useState<EmployeeForm>({
    email: '', nom: '', prenom: '', role: 'employee', password: '',
    phone: '', department_id: '', service_id: '', position_id: '', manager_id: '' // manager_id can be string here for form
  })

  const { data: employees = [], loading, refetch } = useApi<Employee[]>(() => adminService.getEmployees())
  const { data: orgData } = useApi(() => adminService.getOrganizationData())
  const { loading: saving, execute } = useAsyncAction()

  useEffect(() => {
    // Assuming adminService.getEmployees() returns all employees for the admin's company
    // This list can be used as potential managers.
    // Filter out the employee being currently edited if applicable.
    if (employees) {
        setPotentialManagers(employees);
    }
  }, [employees]);

  const filteredEmployees = employees.filter((emp: Employee) => {
    const matchesSearch = !searchTerm || 
      emp.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter
    return matchesSearch && matchesRole
  })

  const columns = [
    {
      key: 'name',
      label: 'Employé',
      render: (_, emp: Employee) => (
        <div className="flex items-center">
          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-gray-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium">{emp.prenom} {emp.nom}</div>
            <div className="text-sm text-gray-500">#{emp.employee_number}</div>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (_, emp: Employee) => (
        <div>
          <div className="flex items-center"><Mail className="h-4 w-4 mr-2 text-gray-400" />{emp.email}</div>
          {emp.phone && <div className="flex items-center mt-1"><Phone className="h-4 w-4 mr-2 text-gray-400" />{emp.phone}</div>}
        </div>
      )
    },
    {
      key: 'role',
      label: 'Rôle',
      render: (_, emp: Employee) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          emp.role === 'admin' ? 'bg-purple-100 text-purple-800' :
          emp.role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          <Shield className="h-3 w-3 mr-1" />
          {emp.role}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Statut',
      render: (_, emp: Employee) => <StatusBadge status={emp.is_active ? 'active' : 'inactive'} />
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prepare form data, ensuring manager_id is number or null
    const dataToSubmit: any = { ...form };
    if (form.manager_id === "" || form.manager_id === "0" || form.manager_id === null) {
      dataToSubmit.manager_id = null;
    } else {
      dataToSubmit.manager_id = parseInt(form.manager_id, 10);
    }

    // Remove password if not being changed during an edit
    if (editingEmployee && !form.password) {
      delete dataToSubmit.password;
    }

    await execute(async () => {
      if (editingEmployee) {
        // Backend PUT /api/admin/employees/:id needs to handle manager_id
        await adminService.updateEmployee(editingEmployee.id, dataToSubmit)
      } else {
        // Backend POST /api/admin/employees needs to handle manager_id
        await adminService.createEmployee(dataToSubmit)
      }
      setShowModal(false)
      resetForm()
      refetch() // This refetch should ideally bring the updated manager_name
    }, editingEmployee ? 'Employé mis à jour' : 'Employé créé')
  }

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Supprimer ${emp.prenom} ${emp.nom} ?`)) return
    await execute(async () => {
      await adminService.deleteEmployee(emp.id)
      refetch()
    }, 'Employé supprimé')
  }

  const startEdit = (emp: Employee) => {
    setEditingEmployee(emp)
    setForm({
      email: emp.email, nom: emp.nom, prenom: emp.prenom, role: emp.role,
      password: '', phone: emp.phone || '',
      department_id: '', // TODO: Populate these from emp if available and needed for edit
      service_id: '',
      position_id: '',
      manager_id: emp.manager_id ? String(emp.manager_id) : '' // Populate manager_id
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setForm({
      email: '', nom: '', prenom: '', role: 'employee', password: '',
      phone: '', department_id: '', service_id: '', position_id: '', manager_id: ''
    })
    setEditingEmployee(null)
  }

  const handleOpenLeaveReportModal = (emp: Employee) => {
    setSelectedEmployeeForReport(emp);
    setLeaveReportFilters({ start_date: '', end_date: '', status: '' }); // Reset filters
    setShowLeaveReportModal(true);
  };

  const handleLeaveReportFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setLeaveReportFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDownloadEmployeeLeaveReport = async () => {
    if (!selectedEmployeeForReport) return;
    setIsDownloadingReport(true);
    try {
      const response = await adminService.downloadEmployeeLeaveReport(selectedEmployeeForReport.id, leaveReportFilters);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `historique_conges_${selectedEmployeeForReport.nom.toLowerCase()}_${selectedEmployeeForReport.prenom.toLowerCase()}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Rapport de congés PDF téléchargé.");
      setShowLeaveReportModal(false); // Close modal on success
    } catch (error) {
      toast.error("Erreur lors du téléchargement du rapport de congés.");
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const actions = (emp: Employee) => (
    <div className="flex space-x-2">
      <button onClick={() => startEdit(emp)} className="text-blue-600 hover:text-blue-900 p-1" title="Modifier Employé">
        <Edit className="h-4 w-4" />
      </button>
      <button onClick={() => handleOpenLeaveReportModal(emp)} className="text-green-600 hover:text-green-900 p-1" title="Rapport de Congés">
        <FileText className="h-4 w-4" />
      </button>
      <button onClick={() => handleDelete(emp)} className="text-red-600 hover:text-red-900 p-1" title="Supprimer Employé">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )

  if (!isAdmin) {
    return (
      <div className="card text-center">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-600">Seuls les administrateurs peuvent gérer les employés.</p>
      </div>
    )
  }

  if (loading) return <LoadingSpinner size="lg" text="Chargement des employés..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Employés</h1>
          <p className="text-gray-600">Gérez les employés de votre entreprise</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true) }} className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nouvel Employé
        </button>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div></div>
          <div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field">
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateur</option>
              <option value="manager">Manager</option>
              <option value="employee">Employé</option>
            </select>
          </div>
          <div className="text-sm text-gray-600 flex items-end">
            {filteredEmployees.length} employé{filteredEmployees.length > 1 ? 's' : ''} trouvé{filteredEmployees.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <DataTable
        data={filteredEmployees}
        columns={columns}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        emptyMessage="Aucun employé trouvé"
        actions={actions}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                type="text" required value={form.prenom}
                onChange={(e) => setForm(prev => ({ ...prev, prenom: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text" required value={form.nom}
                onChange={(e) => setForm(prev => ({ ...prev, nom: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel" value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <select
                value={form.role}
                onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                className="input-field"
              >
                <option value="employee">Employé</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe {!editingEmployee && '*'}
              </label>
              <input
                type="password" required={!editingEmployee} value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                className="input-field"
                placeholder={editingEmployee ? 'Laisser vide pour ne pas changer' : ''}
              />
            </div>
            {orgData && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
                  <select
                    value={form.department_id}
                    onChange={(e) => setForm(prev => ({ ...prev, department_id: e.target.value, service_id: '' }))}
                    className="input-field"
                  >
                    <option value="">Aucun département</option>
                    {orgData.departments?.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                  <select
                    value={form.service_id}
                    onChange={(e) => setForm(prev => ({ ...prev, service_id: e.target.value }))}
                    className="input-field"
                    disabled={!form.department_id}
                  >
                    <option value="">Aucun service</option>
                    {orgData.services?.filter((s: any) => s.department_id === parseInt(form.department_id)).map((service: any) => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {/* Manager Selection Dropdown */}
            <div className="md:col-span-2"> {/* Span across two columns if layout allows */}
              <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
              <select
                value={form.manager_id}
                onChange={(e) => setForm(prev => ({ ...prev, manager_id: e.target.value }))}
                className="input-field"
              >
                <option value="">Aucun manager</option>
                {potentialManagers
                  .filter(manager => !editingEmployee || manager.id !== editingEmployee.id) // Prevent self-assignment
                  .map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.prenom} {manager.nom} ({manager.email})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : <><Save className="h-4 w-4 mr-2" />{editingEmployee ? 'Mettre à jour' : 'Créer'}</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Leave Report Filter Modal */}
      {selectedEmployeeForReport && (
        <Modal
          isOpen={showLeaveReportModal}
          onClose={() => setShowLeaveReportModal(false)}
          title={`Rapport de Congés pour ${selectedEmployeeForReport.prenom} ${selectedEmployeeForReport.nom}`}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="lr_start_date" className="block text-sm font-medium text-gray-700 mb-1">Date de début (optionnel)</label>
              <input type="date" name="start_date" id="lr_start_date" value={leaveReportFilters.start_date} onChange={handleLeaveReportFilterChange} className="input-field"/>
            </div>
            <div>
              <label htmlFor="lr_end_date" className="block text-sm font-medium text-gray-700 mb-1">Date de fin (optionnel)</label>
              <input type="date" name="end_date" id="lr_end_date" value={leaveReportFilters.end_date} onChange={handleLeaveReportFilterChange} className="input-field"/>
            </div>
            <div>
              <label htmlFor="lr_status" className="block text-sm font-medium text-gray-700 mb-1">Statut (optionnel)</label>
              <select name="status" id="lr_status" value={leaveReportFilters.status} onChange={handleLeaveReportFilterChange} className="input-field">
                  <option value="">Tous</option>
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvé</option>
                  <option value="rejected">Rejeté</option>
                  <option value="cancelled">Annulé</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={() => setShowLeaveReportModal(false)} className="btn-secondary" disabled={isDownloadingReport}>Annuler</button>
              <button onClick={handleDownloadEmployeeLeaveReport} className="btn-primary flex items-center" disabled={isDownloadingReport}>
                {isDownloadingReport ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4 mr-2" />}
                Télécharger Rapport
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}