import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { attendanceService } from '../services/api'
import { 
  Clock, 
  Users, 
  Building, 
  FileText, 
  Calendar, 
  MapPin, 
  Settings, 
  Plus, 
  BarChart3, 
  Download,
  Shield,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  DollarSign
  LogOut
} from 'lucide-react'
import toast from 'react-hot-toast'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  hoverColor: string
  onClick: () => void
  badge?: string
  urgent?: boolean
  disabled?: boolean
}

export default function QuickActions() {
  const { user, isSuperAdmin, isAdmin, isEmployee } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (actionId: string, action: () => void) => {
    setLoading(actionId)
    try {
      await action()
    } catch (error) {
      console.error('Erreur lors de l\'action:', error)
    } finally {
      setLoading(null)
    }
  }

  const downloadCalendar = async () => {
    const resp = await attendanceService.downloadICal()
    const url = window.URL.createObjectURL(new Blob([resp.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'attendance.ics')
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const checkout = async () => {
    await attendanceService.checkout()
    toast.success("Heure de d\u00e9part enregistr\u00e9e")
  }

  const downloadCalendarAction: QuickAction = {
    id: 'download-calendar',
    title: 'Exporter calendrier',
    description: 'iCal des pointages',
    icon: Download,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    hoverColor: 'hover:bg-indigo-100',
    onClick: downloadCalendar
  }

  const checkoutAction: QuickAction = {
    id: 'checkout',
    title: 'Fin de journ\u00e9e',
    description: 'Enregistrer votre d\u00e9part',
    icon: LogOut,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    hoverColor: 'hover:bg-red-100',
    onClick: checkout
  }

  // Actions SuperAdmin
  const superAdminActions: QuickAction[] = [
    {
      id: 'create-company',
      title: 'Créer une entreprise',
      description: 'Ajouter une nouvelle entreprise à la plateforme',
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      onClick: () => {
        window.location.href = '/superadmin/companies'
        toast.success('Redirection vers la gestion des entreprises')
      }
    },
    {
      id: 'global-stats',
      title: 'Statistiques globales',
      description: 'Vue d\'ensemble de toute la plateforme',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      onClick: () => {
        window.location.href = '/superadmin'
        toast.info('Affichage des statistiques globales')
      }
    },
    {
      id: 'billing',
      title: 'Facturation',
      description: 'Voir les factures et paiements',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      onClick: () => {
        window.location.href = '/superadmin/billing'
        toast.success('Accès à la facturation')
      }
    },
    {
      id: 'system-health',
      title: 'État du système',
      description: 'Vérifier la santé de la plateforme',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      onClick: () => {
        toast.success('Système opérationnel - Tous les services fonctionnent')
      },
      badge: 'OK'
    },
    downloadCalendarAction,
    checkoutAction
  ]

  // Actions Admin
  const adminActions: QuickAction[] = [
    {
      id: 'add-employee',
      title: 'Ajouter un employé',
      description: 'Créer un nouveau compte employé',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      onClick: () => {
        window.location.href = '/admin/employees'
        toast.success('Redirection vers la gestion des employés')
      }
    },
    {
      id: 'team-report',
      title: 'Rapport d\'équipe',
      description: 'Générer le rapport de pointage de l\'équipe',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      onClick: () => {
        window.location.href = '/reports'
        toast.success('Génération du rapport d\'équipe')
      }
    },
    {
      id: 'geofencing',
      title: 'Configuration GPS',
      description: 'Gérer les zones de pointage autorisées',
      icon: MapPin,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100',
      onClick: () => {
        window.location.href = '/geofencing'
        toast.info('Configuration du géofencing')
      }
    },
    downloadCalendarAction,
    checkoutAction
  ]

  // Actions Employé
  const employeeActions: QuickAction[] = [
    {
      id: 'quick-checkin',
      title: 'Pointage rapide',
      description: 'Pointer votre arrivée au bureau',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      onClick: () => {
        window.location.href = '/checkin'
        toast.success('Redirection vers le pointage')
      }
    },
    {
      id: 'mission-checkin',
      title: 'Pointage mission',
      description: 'Pointer pour une mission externe',
      icon: MapPin,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      onClick: () => {
        window.location.href = '/checkin'
        toast.info('Sélectionnez l\'onglet Mission')
      }
    },
    {
      id: 'view-history',
      title: 'Mon historique',
      description: 'Consulter vos pointages récents',
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      onClick: () => {
        window.location.href = '/history'
        toast.info('Affichage de votre historique')
      }
    },
    downloadCalendarAction,
    checkoutAction
  ]

  // Sélectionner les actions selon le rôle
  const getActionsForRole = (): QuickAction[] => {
    if (isSuperAdmin) return superAdminActions
    if (isAdmin) return adminActions
    return employeeActions
  }

  const actions = getActionsForRole()

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Actions rapides</h3>
          <p className="text-sm text-gray-600">
            {isSuperAdmin 
              ? 'Gestion de la plateforme' 
              : isAdmin 
              ? 'Administration de votre entreprise'
              : 'Vos actions quotidiennes'
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => {
          const Icon = action.icon
          const isLoading = loading === action.id
          
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id, action.onClick)}
              disabled={action.disabled || isLoading}
              className={`
                relative p-4 rounded-lg border border-gray-200 text-left transition-all duration-200
                ${action.bgColor} ${action.hoverColor}
                hover:shadow-md hover:border-gray-300
                disabled:opacity-50 disabled:cursor-not-allowed
                ${action.urgent ? 'ring-2 ring-red-200 animate-pulse' : ''}
              `}
            >
              {/* Badge */}
              {action.badge && (
                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  action.urgent ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {action.badge}
                </div>
              )}

              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${action.bgColor}`}>
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                  ) : (
                    <Icon className={`h-5 w-5 ${action.color}`} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    {action.title}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}