import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useApi } from '../hooks/useApi'
import { adminService } from '../services/api'
import { 
  Users, 
  Building, 
  Settings, 
  Clock, 
  MapPin, 
  BarChart3,
  CheckCircle,
  TrendingUp,
  Layers,
  Shield,
  ChevronRight,
  Activity,
  Zap,
  Target,
  Globe
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'

// Composants importés
import EmployeeManagement from './EmployeeManagement'
import OfficeManagement from './OfficeManagement'
import EnhancedGeofencing from './EnhancedGeofencing'
import CompanySettings from './CompanySettings'
import AttendanceHistory from './AttendanceHistory'
import AttendanceChart from './AttendanceChart'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'attendance' | 'offices' | 'organization' | 'geofencing' | 'settings'>('overview')

  const { data: statsResp } = useApi(() => adminService.getCompanyStats())
  const stats = statsResp?.stats || {
    total_employees: 0,
    active_employees: 0,
    departments: 0,
    services: 0,
    today_present: 0,
    today_late: 0,
    today_absent: 0,
    avg_hours_week: 0,
    avg_late_month: 0,
    offices: 0,
    attendance_rate: 0,
    retention_rate: 0,
    growth_rate: 0
  }

  const { data: attendanceResp } = useApi(() => adminService.getCompanyAttendance())
  const attendanceChartData = (() => {
    const dataMap: Record<string, { present: number; late: number; absent: number }> = {}
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i)
      const key = format(d, 'yyyy-MM-dd')
      dataMap[key] = { present: 0, late: 0, absent: 0 }
    }

    attendanceResp?.records.forEach((r: any) => {
      const key = r.date_pointage
      if (dataMap[key]) {
        if (r.statut === 'present') dataMap[key].present += 1
        else if (r.statut === 'retard') dataMap[key].late += 1
        else dataMap[key].absent += 1
      }
    })

    return Object.entries(dataMap).map(([key, value]) => ({
      date: format(new Date(key), 'dd/MM', { locale: fr }),
      ...value
    }))
  })()
  
  // Vérifier si l'utilisateur a les permissions nécessaires
  if (!permissions.canManageCompanySettings && !permissions.canManageTeam) {
    return (
      <div className="card text-center">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès restreint
        </h3>
        <p className="text-gray-600">
          Vous n'avez pas les permissions nécessaires pour accéder au dashboard administrateur.
        </p>
      </div>
    )
  }

  // Rendu conditionnel basé sur l'onglet actif
  const renderTabContent = () => {
    switch (activeTab) {
      case 'employees':
        return <EmployeeManagement />
      case 'offices':
        return <OfficeManagement />
      case 'geofencing':
        return <EnhancedGeofencing />
      case 'settings':
        return <CompanySettings />
      case 'attendance':
        return <AttendanceHistory />
      case 'organization':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Structure Organisationnelle</h2>
              <a href="/admin/organization" className="btn-primary">
                <Layers className="h-4 w-4 mr-2" />
                Gérer l'organisation
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Départements */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Départements</h3>
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {stats.departments}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {['Ressources Humaines', 'Développement', 'Marketing', 'Finance', 'Opérations'].map((dept, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{dept}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Services */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Services</h3>
                  <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                    {stats.services}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {[
                    { name: 'Recrutement', dept: 'RH' },
                    { name: 'Frontend', dept: 'Dev' },
                    { name: 'Backend', dept: 'Dev' },
                    { name: 'Digital', dept: 'Marketing' },
                    { name: 'Comptabilité', dept: 'Finance' }
                  ].map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Layers className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{service.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{service.dept}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Organigramme simplifié */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Organigramme</h3>
              
              <div className="bg-gray-50 p-6 rounded-lg overflow-auto">
                <div className="flex flex-col items-center">
                  {/* Niveau 1 - Direction */}
                  <div className="p-4 bg-blue-100 rounded-lg border border-blue-200 mb-4">
                    <div className="font-bold text-blue-800">Direction</div>
                  </div>
                  
                  {/* Connecteur */}
                  <div className="w-px h-8 bg-gray-300"></div>
                  
                  {/* Niveau 2 - Départements */}
                  <div className="flex flex-wrap justify-center gap-4 mb-4">
                    {['RH', 'Développement', 'Marketing', 'Finance', 'Opérations'].map((dept, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className="p-3 bg-purple-100 rounded-lg border border-purple-200">
                          <div className="font-medium text-purple-800">{dept}</div>
                        </div>
                        <div className="w-px h-8 bg-gray-300"></div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Niveau 3 - Services (simplifié) */}
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      'Recrutement', 'Formation', 'Frontend', 'Backend', 'Mobile',
                      'Digital', 'Contenu', 'Comptabilité', 'Logistique', 'Support'
                    ].map((service, index) => (
                      <div key={index} className="p-2 bg-green-100 rounded-lg border border-green-200">
                        <div className="text-sm font-medium text-green-800">{service}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      default: // 'overview'
        return (
          <>
            {/* Statistiques générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Employés</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_employees}</p>
                    <p className="text-xs text-purple-600">{stats.active_employees} actifs</p>
                  </div>
                </div>
              </div>
              
              <div className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Layers className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Structure</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.departments}</p>
                    <p className="text-xs text-blue-600">{stats.services} services</p>
                  </div>
                </div>
              </div>
              
              <div className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Présence</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.today_present}</p>
                    <p className="text-xs text-green-600">Présents aujourd'hui</p>
                  </div>
                </div>
              </div>
              
              <div className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Building className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Bureaux</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.offices}</p>
                    <p className="text-xs text-yellow-600">Sites actifs</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Graphique de présence et actions rapides */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Graphique de présence */}
              <AttendanceChart 
                data={attendanceChartData}
                title="Présence hebdomadaire"
              />
              
              {/* Actions rapides */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Actions rapides</h3>
                  <Settings className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a
                    href="/admin/employees"
                    className="p-4 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all duration-200 hover:shadow-md group"
                  >
                    <div className="flex items-center space-x-3">
                      <Users className="h-6 w-6 group-hover:scale-110 transition-transform" />
                      <div>
                        <h4 className="font-medium">Gérer Employés</h4>
                        <p className="text-sm opacity-75">Ajouter, modifier, supprimer</p>
                      </div>
                    </div>
                  </a>
                  
                  <a
                    href="/admin/offices"
                    className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 transition-all duration-200 hover:shadow-md group"
                  >
                    <div className="flex items-center space-x-3">
                      <Building className="h-6 w-6 group-hover:scale-110 transition-transform" />
                      <div>
                        <h4 className="font-medium">Gérer Bureaux</h4>
                        <p className="text-sm opacity-75">Configurer les sites</p>
                      </div>
                    </div>
                  </a>
                  
                  <a
                    href="/admin/organization"
                    className="p-4 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-all duration-200 hover:shadow-md group"
                  >
                    <div className="flex items-center space-x-3">
                      <Layers className="h-6 w-6 group-hover:scale-110 transition-transform" />
                      <div>
                        <h4 className="font-medium">Organisation</h4>
                        <p className="text-sm opacity-75">Structure de l'entreprise</p>
                      </div>
                    </div>
                  </a>
                  
                  <a
                    href="/geofencing"
                    className="p-4 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 transition-all duration-200 hover:shadow-md group"
                  >
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-6 w-6 group-hover:scale-110 transition-transform" />
                      <div>
                        <h4 className="font-medium">Géofencing</h4>
                        <p className="text-sm opacity-75">Zones de pointage</p>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
            
            {/* Métriques avancées */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-200 rounded-lg">
                    <Activity className="h-5 w-5 text-blue-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900">Taux de présence</h3>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-blue-900">{stats.attendance_rate}%</div>
                  <div className="text-sm text-blue-700">
                    <span className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +2.3% ce mois
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${stats.attendance_rate}%` }}
                  />
                </div>
              </div>
              
              <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-200 rounded-lg">
                    <Users className="h-5 w-5 text-green-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-900">Rétention</h3>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-green-900">{stats.retention_rate}%</div>
                  <div className="text-sm text-green-700">
                    <span className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +1.5% vs année précédente
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-green-600"
                    style={{ width: `${stats.retention_rate}%` }}
                  />
                </div>
              </div>
              
              <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-200 rounded-lg">
                    <Zap className="h-5 w-5 text-purple-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-purple-900">Croissance</h3>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-purple-900">+{stats.growth_rate}%</div>
                  <div className="text-sm text-purple-700">
                    <span className="flex items-center">
                      <Target className="h-4 w-4 mr-1" />
                      Objectif: +15%
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 w-full bg-purple-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-purple-600"
                    style={{ width: `${(stats.growth_rate / 15) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Dernières activités */}
            <div className="card mt-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Activités récentes</h3>
                <div className="flex space-x-2">
                  <button className="btn-secondary text-sm">
                    Filtrer
                  </button>
                  <button className="btn-secondary text-sm">
                    Exporter
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Heure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Données simulées */}
                    {[
                      { id: 1, name: 'Jean Dupont', action: 'Pointage Bureau', time: '08:45', status: 'present' },
                      { id: 2, name: 'Marie Martin', action: 'Pointage Bureau', time: '09:10', status: 'late' },
                      { id: 3, name: 'Pierre Durand', action: 'Pointage Mission', time: '08:30', status: 'present' },
                      { id: 4, name: 'Sophie Lefebvre', action: 'Absence Maladie', time: '00:00', status: 'absent' },
                      { id: 5, name: 'Thomas Bernard', action: 'Pointage Bureau', time: '08:55', status: 'present' }
                    ].map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{activity.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{activity.action}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(), 'dd/MM/yyyy')} à {activity.time}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            activity.status === 'present' 
                              ? 'bg-green-100 text-green-800'
                              : activity.status === 'late'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {activity.status === 'present' 
                              ? 'Présent'
                              : activity.status === 'late'
                              ? 'Retard'
                              : 'Absent'
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-center">
                <a href="/history" className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                  Voir tout l'historique →
                </a>
              </div>
            </div>
          </>
        )
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header personnalisé pour Admin */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Dashboard Administrateur</h1>
            </div>
            <p className="text-purple-100">
              Gestion complète de votre entreprise {user?.company_name}
            </p>
            <div className="flex items-center space-x-4 mt-3">
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span className="text-sm">{user?.company_name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">{stats.total_employees} employés</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm">{stats.offices} bureaux</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{format(new Date(), 'dd MMMM yyyy', { locale: fr })}</div>
            <div className="text-purple-200 text-sm">{format(new Date(), 'EEEE', { locale: fr })}</div>
          </div>
        </div>
      </div>
      
      {/* Navigation par onglets */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="inline-block w-4 h-4 mr-2" />
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'employees'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline-block w-4 h-4 mr-2" />
            Employés
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="inline-block w-4 h-4 mr-2" />
            Pointages
          </button>
          <button
            onClick={() => setActiveTab('offices')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'offices'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building className="inline-block w-4 h-4 mr-2" />
            Bureaux
          </button>
          <button
            onClick={() => setActiveTab('organization')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'organization'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Layers className="inline-block w-4 h-4 mr-2" />
            Organisation
          </button>
          <button
            onClick={() => setActiveTab('geofencing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'geofencing'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MapPin className="inline-block w-4 h-4 mr-2" />
            Géofencing
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="inline-block w-4 h-4 mr-2" />
            Paramètres
          </button>
        </nav>
      </div>
      
      {/* Contenu de l'onglet actif */}
      {renderTabContent()}
    </div>
  )
}