import React, { useState, useEffect } from 'react'
import { attendanceService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useApi } from '../hooks/useApi'
import LoadingSpinner from './shared/LoadingSpinner'
import StatusBadge from './shared/StatusBadge'
import RoleBasedAccess from './RoleBasedAccess'
import { 
  Clock, MapPin, Calendar, TrendingUp, CheckCircle, 
  XCircle, AlertTriangle, Users, Building, Home,
  Target, Shield, FileText, BarChart3, Settings,
  UserCheck, Search, Crown, User, Briefcase, Globe,
  Layers, Cog, Zap
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Dashboard() {
  const { user } = useAuth()
  const { permissions, userRole } = usePermissions()
  const { data: stats, loading } = useApi(() => attendanceService.getStats())
  const { data: attendanceData } = useApi(() => attendanceService.getAttendance())

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  const getTodayStatus = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayRecord = attendanceData?.records?.find((r: any) => r.date_pointage === today)
    
    if (!todayRecord) {
      return { status: 'warning', message: 'Vous n\'avez pas encore pointé aujourd\'hui', icon: Clock }
    }
    
    if (todayRecord.statut === 'present') {
      return { status: 'active', message: `Pointé à ${todayRecord.heure_arrivee} - À l'heure`, icon: CheckCircle }
    }
    
    return { status: 'warning', message: `Pointé à ${todayRecord.heure_arrivee} - En retard`, icon: AlertTriangle }
  }

  const getRoleSpecificActions = () => {
    const baseActions = []

    // SUPERADMIN - Administration globale, configuration système, gestion des comptes entreprises
    if (permissions.canGlobalManagement) {
      baseActions.push(
        { 
          title: 'Dashboard SuperAdmin', 
          description: 'Vue d\'ensemble globale de la plateforme',
          icon: Crown, 
          href: '/superadmin',
          color: 'bg-red-50 hover:bg-red-100 text-red-700',
          permission: null
        },
        { 
          title: 'Gestion Entreprises', 
          description: 'Gérer toutes les entreprises de la plateforme',
          icon: Building, 
          href: '/superadmin/companies',
          color: 'bg-red-50 hover:bg-red-100 text-red-700',
          permission: null
        },
        { 
          title: 'Configuration Système', 
          description: 'Paramètres globaux de la plateforme',
          icon: Settings, 
          href: '/settings',
          color: 'bg-gray-50 hover:bg-gray-100 text-gray-700',
          permission: null
        },
        { 
          title: 'Analytics Globales', 
          description: 'Rapports et statistiques globales',
          icon: BarChart3, 
          href: '/reports',
          color: 'bg-purple-50 hover:bg-purple-100 text-purple-700',
          permission: null
        }
      )
    }

    // ADMINISTRATEUR ENTREPRISE - Gestion globale de l'entreprise
    else if (permissions.canManageCompanySettings || permissions.canManageTeam) {
      baseActions.push(
        { 
          title: 'Gestion Employés', 
          description: 'Gérer les utilisateurs de votre entreprise',
          icon: Users, 
          href: '/admin/employees',
          color: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
          permission: null
        },
        { 
          title: 'Gestion Bureaux', 
          description: 'Configurer les bureaux de l\'entreprise',
          icon: Building, 
          href: '/admin/offices',
          color: 'bg-green-50 hover:bg-green-100 text-green-700',
          permission: null
        },
        { 
          title: 'Organisation', 
          description: 'Départements, services et postes',
          icon: Layers, 
          href: '/admin/organization',
          color: 'bg-purple-50 hover:bg-purple-100 text-purple-700',
          permission: null
        },
        { 
          title: 'Géofencing', 
          description: 'Système de géolocalisation',
          icon: MapPin, 
          href: '/geofencing',
          color: 'bg-orange-50 hover:bg-orange-100 text-orange-700',
          permission: null
        },
        { 
          title: 'Paramètres Entreprise', 
          description: 'Configuration de l\'entreprise',
          icon: Cog, 
          href: '/settings',
          color: 'bg-gray-50 hover:bg-gray-100 text-gray-700',
          permission: null
        },
        { 
          title: 'Rapports Entreprise', 
          description: 'Analytics et rapports d\'entreprise',
          icon: FileText, 
          href: '/reports',
          color: 'bg-teal-50 hover:bg-teal-100 text-teal-700',
          permission: null
        }
      )
    }

    // AUTRES RÔLES - Actions selon permissions
    else {
      // Gestion d'équipe pour chefs de service/projet et managers
      if (permissions.canManageTeam || permissions.canViewTeamAttendance) {
        baseActions.push(
          { 
            title: 'Gestion Équipe', 
            description: 'Gérer votre équipe',
            icon: Users, 
            href: '/admin/employees',
            color: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
            permission: null
          }
        )
      }

      // Missions pour chefs de projet et chefs de service
      if (permissions.canCreateMissions || permissions.canTrackMissions) {
        baseActions.push(
          { 
            title: 'Gestion Missions', 
            description: 'Créer et suivre les missions',
            icon: Target, 
            href: '/missions',
            color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700',
            permission: null
          }
        )
      }

      // Rapports selon niveau
      if (permissions.canViewTeamReports || permissions.canViewDepartmentReports) {
        baseActions.push(
          { 
            title: 'Rapports', 
            description: 'Rapports d\'équipe ou département',
            icon: FileText, 
            href: '/reports',
            color: 'bg-teal-50 hover:bg-teal-100 text-teal-700',
            permission: null
          }
        )
      }
    }

    // Actions communes pour ceux qui peuvent pointer
    if (permissions.canSelfCheckIn) {
      baseActions.unshift(
        { 
          title: 'Pointage Bureau', 
          description: 'Pointer votre arrivée au bureau',
          icon: MapPin, 
          href: '/checkin',
          color: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
          permission: null
        },
        { 
          title: 'Pointage Mission', 
          description: 'Pointer pour une mission externe',
          icon: Clock, 
          href: '/checkin',
          color: 'bg-purple-50 hover:bg-purple-100 text-purple-700',
          permission: null
        }
      )
    }

    // Historique pour tous
    baseActions.push(
      { 
        title: 'Mon Historique', 
        description: 'Consulter vos pointages récents',
        icon: Calendar, 
        href: '/history',
        color: 'bg-green-50 hover:bg-green-100 text-green-700',
        permission: null
      }
    )

    return baseActions
  }

  const getRoleIcon = () => {
    switch (userRole) {
      case 'superadmin': return <Crown className="h-5 w-5 text-red-600" />
      case 'admin_rh': return <Users className="h-5 w-5 text-purple-600" />
      case 'chef_service': return <Building className="h-5 w-5 text-blue-600" />
      case 'chef_projet': return <Target className="h-5 w-5 text-green-600" />
      case 'manager': return <UserCheck className="h-5 w-5 text-yellow-600" />
      case 'auditeur': return <Search className="h-5 w-5 text-orange-600" />
      default: return <User className="h-5 w-5 text-gray-600" />
    }
  }

  const getRoleName = () => {
    switch (userRole) {
      case 'superadmin': return 'Super Administrateur'
      case 'admin_rh': return 'Administrateur Entreprise'
      case 'chef_service': return 'Chef de Service'
      case 'chef_projet': return 'Chef de Projet'
      case 'manager': return 'Manager'
      case 'auditeur': return 'Auditeur'
      case 'employee': return 'Employé'
      default: return 'Utilisateur'
    }
  }

  const getRoleDescription = () => {
    switch (userRole) {
      case 'superadmin': return 'Administration globale de la plateforme'
      case 'admin_rh': return 'Gestion globale de l\'entreprise'
      case 'chef_service': return 'Gestion d\'un service ou département'
      case 'chef_projet': return 'Supervision d\'équipes projet'
      case 'manager': return 'Supervision d\'équipe restreinte'
      case 'auditeur': return 'Accès en lecture pour audit'
      case 'employee': return 'Utilisateur standard'
      default: return ''
    }
  }

  const getDashboardColor = () => {
    switch (userRole) {
      case 'superadmin': return 'from-red-600 to-red-700'
      case 'admin_rh': return 'from-purple-600 to-purple-700'
      case 'chef_service': return 'from-blue-600 to-blue-700'
      case 'chef_projet': return 'from-green-600 to-green-700'
      case 'manager': return 'from-yellow-600 to-yellow-700'
      case 'auditeur': return 'from-orange-600 to-orange-700'
      default: return 'from-primary-600 to-primary-700'
    }
  }

  if (loading) return <LoadingSpinner size="lg" text="Chargement du dashboard..." />

  const todayStatus = getTodayStatus()
  const StatusIcon = todayStatus.icon
  const quickActions = getRoleSpecificActions()

  return (
    <div className="space-y-6">
      {/* Header personnalisé avec rôle - COULEURS DIFFÉRENCIÉES */}
      <div className={`bg-gradient-to-r ${getDashboardColor()} rounded-xl p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, {user?.prenom} !</h1>
            <p className="text-white/80 mt-1">
              {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })} {/* Format ivoirien: jour-mois-année */}
            </p>
            <div className="flex items-center mt-3 space-x-4">
              <div className="flex items-center text-white/80">
                {getRoleIcon()}
                <span className="text-sm ml-2">{getRoleName()}</span>
              </div>
              {user?.company_name && !permissions.canGlobalManagement && (
                <div className="flex items-center text-white/80">
                  <Building className="h-4 w-4 mr-2" />
                  <span className="text-sm">{user.company_name}</span>
                </div>
              )}
              {permissions.canGlobalManagement && (
                <div className="flex items-center text-white/80">
                  <Globe className="h-4 w-4 mr-2" />
                  <span className="text-sm">Plateforme Multi-Tenant</span>
                </div>
              )}
            </div>
            <p className="text-white/70 text-sm mt-2">
              {getRoleDescription()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{format(new Date(), 'HH:mm')}</div>
            <div className="text-white/70 text-sm">
              {permissions.canGlobalManagement ? 'Niveau Global' : 
               permissions.canManageCompanySettings ? 'Niveau Entreprise' :
               permissions.canManageTeam ? 'Niveau Équipe' : 'Niveau Personnel'}
            </div>
          </div>
        </div>
      </div>

      {/* Statut du jour - seulement pour ceux qui peuvent pointer */}
      {permissions.canSelfCheckIn && (
        <div className="card">
          <div className="flex items-center space-x-3">
            <StatusIcon className="h-6 w-6 text-primary-600" />
            <div>
              <h3 className="font-medium text-gray-900">Statut du jour</h3>
              <p className="text-sm text-gray-600">{todayStatus.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards - adaptées selon les permissions */}
      {stats && permissions.canSelfCheckIn && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Jours présents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.present_days || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Retards</p>
                <p className="text-2xl font-bold text-gray-900">{stats.late_days || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Absences</p>
                <p className="text-2xl font-bold text-gray-900">{stats.absence_days || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Heures moy.</p>
                <p className="text-2xl font-bold text-gray-900">{stats.average_hours?.toFixed(1) || '0.0'}h</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions rapides basées sur le rôle - NORMALISÉES */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Actions rapides</h3>
          <div className="flex items-center space-x-2">
            {getRoleIcon()}
            <span className="text-sm text-gray-600">{getRoleName()}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            
            return (
              <a
                key={index}
                href={action.href}
                className={`p-4 rounded-lg border transition-all duration-200 ${action.color} hover:shadow-md group`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="font-medium">{action.title}</h4>
                    <p className="text-sm opacity-75">{action.description}</p>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>

      {/* Activité récente - pour ceux qui ont accès aux pointages */}
      {(permissions.canSelfCheckIn || permissions.canViewTeamAttendance) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h3>
          {attendanceData?.records?.length > 0 ? (
            <div className="space-y-3">
              {attendanceData.records.slice(0, 5).map((record: any) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${record.type === 'office' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {record.type === 'office' ? (
                        <MapPin className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {record.type === 'office' ? 'Pointage Bureau' : 'Pointage Mission'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(record.date_pointage), 'd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{record.heure_arrivee}</p>
                    <StatusBadge 
                      status={record.statut === 'present' ? 'active' : record.statut === 'retard' ? 'warning' : 'inactive'} 
                      text={record.statut}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun pointage</h3>
              <p className="mt-1 text-sm text-gray-500">
                {permissions.canSelfCheckIn 
                  ? 'Commencez par effectuer votre premier pointage'
                  : 'Aucune activité récente à afficher'
                }
              </p>
              {permissions.canSelfCheckIn && (
                <a href="/checkin" className="mt-4 btn-primary inline-flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Pointer maintenant
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section spéciale pour les auditeurs */}
      <RoleBasedAccess role="auditeur">
        <div className="card bg-orange-50 border-orange-200">
          <div className="flex items-center space-x-3 mb-4">
            <Search className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-900">Mode Audit</h3>
          </div>
          <p className="text-orange-800 mb-4">
            Vous avez accès en lecture seule à toutes les données pour effectuer vos audits.
          </p>
          <div className="flex space-x-3">
            <a href="/reports" className="btn-primary bg-orange-600 hover:bg-orange-700">
              <FileText className="h-4 w-4 mr-2" />
              Rapports d'audit
            </a>
            <a href="/advanced" className="btn-secondary">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics avancées
            </a>
          </div>
        </div>
      </RoleBasedAccess>
    </div>
  )
}