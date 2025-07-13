import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import RealtimeNotifications from './RealtimeNotifications'
import { 
  Home, 
  Clock,
  Coffee,
  User,
  LogOut, 
  Menu,
  X,
  Building,
  Users,
  Settings,
  BarChart3,
  History,
  Cog,
  Calendar,
  MapPin,
  FileText,
  Layers,
  Zap,
  Shield,
  Target,
  UserCheck,
  Search,
  Crown,
  Globe
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { permissions } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const themeColor = user?.company_theme_color || '#2563eb'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Navigation adaptée aux rôles spécifiés
  const getNavigation = () => {
    const nav = [
      { name: 'Accueil', href: '/', icon: Home, priority: true, permission: null }
    ]

    // SUPERADMIN - Administration globale, configuration système, gestion des comptes entreprises
    if (permissions.canGlobalManagement) {
      nav.push(
        { name: 'Dashboard SuperAdmin', href: '/superadmin', icon: Crown, priority: false, permission: null },
        { name: 'Gestion Entreprises', href: '/superadmin/companies', icon: Building, priority: false, permission: null },
        { name: 'Demandes Abonnement', href: '/superadmin/extension-requests', icon: Clock, priority: false, permission: null },
        { name: 'Configuration Système', href: '/settings', icon: Settings, priority: false, permission: null },
        { name: 'Rôles & Privilèges', href: '/roles', icon: Shield, priority: false, permission: null },
        { name: 'Analytics Globales', href: '/reports', icon: BarChart3, priority: false, permission: null }
      )
    }

    // ADMINISTRATEUR ENTREPRISE - Gestion globale de l'entreprise
    else if (permissions.canManageCompanySettings || permissions.canManageTeam) {
      // Gestion des Utilisateurs de son entreprise
      nav.push({ name: 'Gestion Employés', href: '/admin/employees', icon: Users, priority: false, permission: null })
      
      // Gestion des Bureaux de l'entreprise
      nav.push({ name: 'Gestion Bureaux', href: '/admin/offices', icon: Building, priority: false, permission: null })
      
      // Gérez les départements, services et postes de son entreprise
      nav.push({ name: 'Organisation', href: '/admin/organization', icon: Layers, priority: false, permission: null })
      
      // Système de géolocalisation de son entreprise et des bureaux
      nav.push({ name: 'Géofencing', href: '/geofencing', icon: MapPin, priority: false, permission: null })
      
      // Paramètres d'entreprise
      nav.push({ name: 'Paramètres Entreprise', href: '/settings', icon: Cog, priority: false, permission: null })
      
      // Calendrier équipe et rapports
      nav.push({ name: 'Calendrier Équipe', href: '/team-calendar', icon: Calendar, priority: false, permission: null })
      nav.push({ name: 'Rapports Entreprise', href: '/reports', icon: FileText, priority: false, permission: null })
    }

    // AUTRES RÔLES - Fonctionnalités selon permissions
    else {
      // Gestion d'équipe pour chefs de service/projet et managers
      if (permissions.canManageTeam || permissions.canViewTeamAttendance) {
        nav.push({ name: 'Gestion Équipe', href: '/admin/employees', icon: Users, priority: false, permission: null })
      }

      // Missions pour chefs de projet et chefs de service
      if (permissions.canCreateMissions || permissions.canTrackMissions) {
        nav.push({ name: 'Missions', href: '/missions', icon: Target, priority: false, permission: null })
      }

      // Calendrier équipe pour managers et plus
      if (permissions.canViewTeamAttendance) {
        nav.push({ name: 'Calendrier Équipe', href: '/team-calendar', icon: Calendar, priority: false, permission: null })
      }

      // Rapports selon niveau
      if (permissions.canViewTeamReports || permissions.canViewDepartmentReports) {
        nav.push({ name: 'Rapports', href: '/reports', icon: FileText, priority: false, permission: null })
      }
    }

    // Pointage regroupé pour tous (sauf auditeur)
    if (permissions.canSelfCheckIn) {
      nav.push({ name: 'Pointage', href: '/attendance', icon: Clock, priority: false, permission: null })
    }

    // Historique personnel pour tous
    nav.push({ name: 'Historique', href: '/history', icon: History, priority: false, permission: null })

    // Fonctionnalités avancées pour tous
    nav.push({ name: 'Fonctionnalités Avancées', href: '/advanced', icon: Zap, priority: false, permission: null })

    // Profil pour tous
    nav.push({ name: 'Profil', href: '/profile', icon: User, priority: false, permission: null })

    return nav
  }

  const navigation = getNavigation()

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'superadmin': return <Crown className="h-4 w-4 text-red-600" />
      case 'admin_rh': return <Users className="h-4 w-4 text-purple-600" />
      case 'chef_service': return <Building className="h-4 w-4 text-blue-600" />
      case 'chef_projet': return <Target className="h-4 w-4 text-green-600" />
      case 'manager': return <UserCheck className="h-4 w-4 text-yellow-600" />
      case 'auditeur': return <Search className="h-4 w-4 text-orange-600" />
      default: return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleName = () => {
    switch (user?.role) {
      case 'superadmin': return 'Super Admin'
      case 'admin_rh': return 'Admin Entreprise'
      case 'chef_service': return 'Chef de Service'
      case 'chef_projet': return 'Chef de Projet'
      case 'manager': return 'Manager'
      case 'auditeur': return 'Auditeur'
      case 'employee': return 'Employé'
      default: return user?.role
    }
  }

  const getRoleDescription = () => {
    switch (user?.role) {
      case 'superadmin': return 'Administration globale'
      case 'admin_rh': return 'Gestion entreprise'
      case 'chef_service': return 'Gestion service'
      case 'chef_projet': return 'Gestion projet'
      case 'manager': return 'Supervision équipe'
      case 'auditeur': return 'Audit & contrôle'
      case 'employee': return 'Utilisateur'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar mobile */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {/* Logo dynamique */}
              {user?.company_logo_url ? (
                <img src={user.company_logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: themeColor }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white"
                  >
                    <path
                      d="M3 8 L6.5 11.5 L13 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold">
                  <span className="text-blue-600">Point</span>
                  <span className="text-green-500">Flex</span>
                </h1>
                <div className="flex items-center space-x-1">
                  {getRoleIcon()}
                  <span className="text-xs font-medium">{getRoleName()}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              const isPriority = item.priority
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? isPriority 
                        ? 'bg-primary-600 text-white border-r-2 border-primary-800'
                        : 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                      : isPriority
                        ? 'text-primary-700 hover:bg-primary-50 hover:text-primary-900 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`mr-3 h-5 w-5 ${
                    isActive && isPriority ? 'text-white' : 
                    isPriority ? 'text-primary-600' : ''
                  }`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          {/* User info in mobile sidebar */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                {getRoleIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-xs text-gray-500">
                  {getRoleDescription()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {/* Logo dynamique */}
              {user?.company_logo_url ? (
                <img src={user.company_logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: themeColor }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white"
                  >
                    <path
                      d="M3 8 L6.5 11.5 L13 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold">
                  <span className="text-blue-600">Point</span>
                  <span className="text-green-500">Flex</span>
                </h1>
                <div className="flex items-center space-x-1">
                  {getRoleIcon()}
                  <span className="text-xs font-medium">{getRoleName()}</span>
                </div>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              const isPriority = item.priority
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? isPriority 
                        ? 'bg-primary-600 text-white border-r-2 border-primary-800'
                        : 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                      : isPriority
                        ? 'text-primary-700 hover:bg-primary-50 hover:text-primary-900 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${
                    isActive && isPriority ? 'text-white' : 
                    isPriority ? 'text-primary-600' : ''
                  }`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden hover:bg-gray-100 rounded-md"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              {/* Breadcrumb avec bouton Accueil */}
              <nav className="flex items-center space-x-2 text-sm">
                <Link 
                  to="/" 
                  className="flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  <Home className="h-4 w-4 mr-1" />
                  Accueil
                </Link>
                {location.pathname !== '/' && (
                  <>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600">
                      {navigation.find(item => item.href === location.pathname)?.name || 'Page actuelle'}
                    </span>
                  </>
                )}
              </nav>
              
              {/* Indicateur de rôle et entreprise */}
              <div className="flex items-center space-x-4 ml-auto">
                {user?.company_name && (
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{user.company_name}</span>
                  </div>
                )}
                {permissions.canGlobalManagement && (
                  <div className="flex items-center space-x-2 px-2 py-1 bg-red-50 rounded-full">
                    <Globe className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700">Plateforme</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notification Center */}
              <RealtimeNotifications />
              
              <div className="flex items-center gap-x-2">
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.prenom} {user?.nom}
                  </span>
                  <div className="text-xs text-gray-500 flex items-center space-x-1">
                    {getRoleIcon()}
                    <span>{getRoleDescription()}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                  title="Déconnexion"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}