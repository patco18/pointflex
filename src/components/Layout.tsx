import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import NotificationCenter from './NotificationCenter'
import { useI18n } from '../contexts/I18nContext'
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
  Globe,
  CreditCard,
  DollarSign,
  ChevronDown
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
  priority?: boolean
}

interface NavCategory {
  title: string
  items: NavItem[]
}

function SidebarSection({
  category,
  currentPath,
  onLinkClick
}: {
  category: NavCategory
  currentPath: string
  onLinkClick?: () => void
}) {
  const [open, setOpen] = React.useState(true)

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
      >
        <span>{category.title}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`${open ? 'mt-1 space-y-1' : 'hidden'}`}>
        {category.items.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.href
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
              onClick={onLinkClick}
            >
              <Icon
                className={`mr-3 h-5 w-5 ${
                  isActive && isPriority
                    ? 'text-white'
                    : isPriority
                      ? 'text-primary-600'
                      : ''
                }`}
              />
              {item.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { permissions, checkPermission } = usePermissions()
  const { language, setLanguage } = useI18n()
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
    const categories: NavCategory[] = []

    const generalItems: NavItem[] = [
      { name: 'Accueil', href: '/', icon: Home, priority: true }
    ]

    const activityItems: NavItem[] = []
    const analysisItems: NavItem[] = []
    const reportingItems: NavItem[] = []
    const toolsItems: NavItem[] = []

    if (permissions.canSelfCheckIn) {
      generalItems.push({ name: 'Pointage', href: '/attendance/home', icon: Clock, priority: true })
    }

    generalItems.push({ name: 'Historique', href: '/history', icon: History })

    if (checkPermission('leave.view_personal')) {
      generalItems.push({ name: 'Congés', href: '/leave', icon: Calendar, priority: true })
    }

    const showGeneralTeamSections =
      !permissions.canGlobalManagement &&
      !(permissions.canManageCompanySettings || permissions.canManageTeam)

    if (showGeneralTeamSections) {
      if (permissions.canCreateMissions || permissions.canTrackMissions) {
        activityItems.push({ name: 'Missions', href: '/missions', icon: Target })
      }

      if (permissions.canManageTeam || permissions.canViewTeamAttendance) {
        activityItems.push({ name: 'Gestion Équipe', href: '/admin/employees', icon: Users })
      }

      if (permissions.canViewTeamAttendance) {
        activityItems.push({ name: 'Calendrier Équipe', href: '/team-calendar', icon: Calendar })
      }
    }

    if (!permissions.canGlobalManagement && !(permissions.canManageCompanySettings || permissions.canManageTeam)) {
      if (
        permissions.canViewPersonalReports ||
        permissions.canViewTeamReports ||
        permissions.canViewDepartmentReports ||
        permissions.canViewCompanyReports ||
        permissions.canViewAdvancedReports
      ) {
        reportingItems.push({ name: 'Rapports', href: '/reports', icon: FileText })
      }
    }

    if (checkPermission('analytics.access_basic')) {
      analysisItems.push({ name: 'Tableau de Bord', href: '/analytics', icon: BarChart3, priority: true })
    }

    toolsItems.push({ name: 'Fonctionnalités Avancées', href: '/advanced', icon: Zap })

    generalItems.push({ name: 'Profil', href: '/profile', icon: User })

    if (generalItems.length > 0) {
      categories.push({ title: 'Général', items: generalItems })
    }

    if (activityItems.length > 0) {
      categories.push({ title: 'Activités', items: activityItems })
    }

    if (analysisItems.length > 0) {
      categories.push({ title: 'Analyse', items: analysisItems })
    }

    if (reportingItems.length > 0) {
      categories.push({ title: 'Rapports', items: reportingItems })
    }

    if (toolsItems.length > 0) {
      categories.push({ title: 'Outils', items: toolsItems })
    }

    if (permissions.canGlobalManagement) {
      categories.push(
        {
          title: 'Supervision',
          items: [
            { name: 'Dashboard SuperAdmin', href: '/superadmin', icon: Crown },
            { name: 'Analytics Globales', href: '/reports', icon: BarChart3 }
          ]
        },
        {
          title: 'Clients & Abonnements',
          items: [
            { name: 'Gestion Entreprises', href: '/superadmin/companies', icon: Building },
            { name: 'Gestion Abonnements', href: '/superadmin/subscription', icon: CreditCard },
            { name: 'Demandes Abonnement', href: '/superadmin/extension-requests', icon: Clock },
            { name: 'Facturation', href: '/superadmin/billing', icon: DollarSign }
          ]
        },
        {
          title: 'Configuration Système',
          items: [
            { name: 'Configuration Système', href: '/settings', icon: Settings },
            { name: 'Rôles & Privilèges', href: '/roles', icon: Shield }
          ]
        }
      )
    } else if (permissions.canManageCompanySettings || permissions.canManageTeam) {
      const adminOverview: NavItem[] = [
        { name: 'Tableau de Bord Entreprise', href: '/admin', icon: BarChart3, priority: true },
        { name: 'Historique Pointages', href: '/admin/attendance-history', icon: History },
        { name: 'Rapports Entreprise', href: '/admin/reports', icon: FileText }
      ]

      const adminTeam: NavItem[] = [
        { name: 'Gestion Employés', href: '/admin/employees', icon: Users },
        { name: 'Organisation', href: '/admin/organization', icon: Layers },
        { name: 'Calendrier Équipe', href: '/admin/team-calendar', icon: Calendar }
      ]

      const adminOperations: NavItem[] = [
        { name: 'Gestion Bureaux', href: '/admin/offices', icon: Building },
        { name: 'Géofencing', href: '/admin/geofencing', icon: MapPin },
        { name: 'Pointage QR Code', href: '/admin/qr-code', icon: Target }
      ]

      const adminConfiguration: NavItem[] = [
        { name: 'Webhooks', href: '/admin/webhooks', icon: Globe },
        { name: 'Paramètres Entreprise', href: '/admin/settings', icon: Cog }
      ]

      categories.push(
        { title: 'Pilotage', items: adminOverview },
        { title: 'Ressources Humaines', items: adminTeam },
        { title: 'Opérations', items: adminOperations },
        { title: 'Configuration', items: adminConfiguration }
      )
    }

    const seenHrefs = new Set<string>()
    const deduplicated = categories
      .map((category) => {
        const uniqueItems = category.items.filter((item) => {
          if (seenHrefs.has(item.href)) {
            return false
          }
          seenHrefs.add(item.href)
          return true
        })
        return { ...category, items: uniqueItems }
      })
      .filter((category) => category.items.length > 0)

    return deduplicated
  }

  const navigation = getNavigation()
  const flatNavigation = navigation.flatMap((cat) => cat.items)

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
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            {navigation.map((category) => (
              <SidebarSection
                key={category.title}
                category={category}
                currentPath={location.pathname}
                onLinkClick={() => setSidebarOpen(false)}
              />
            ))}
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
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            {navigation.map((category) => (
              <SidebarSection
                key={category.title}
                category={category}
                currentPath={location.pathname}
              />
            ))}
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
                      {flatNavigation.find(item => item.href === location.pathname)?.name || 'Page actuelle'}
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
              <NotificationCenter />

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-sm border rounded px-1 py-0.5"
              >
                <option value="fr">Français</option>
                <option value="ci">Langues locales</option>
              </select>

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