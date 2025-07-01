import React, { useState, useEffect } from 'react'
import { superAdminService } from '../services/api'
import { usePermissions } from '../hooks/usePermissions'
import LoadingSpinner from './shared/LoadingSpinner'
import RoleBasedAccess from './RoleBasedAccess'
import { 
  Building, 
  Users, 
  Clock, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  Crown,
  Shield,
  BarChart3,
  Plus,
  Settings,
  Globe,
  Database,
  Server,
  Activity,
  DollarSign,
  Zap
} from 'lucide-react'

interface GlobalStats {
  total_companies: number
  active_companies: number
  total_users: number
  total_pointages: number
  plans_distribution: Record<string, number>
  revenue_monthly: number
  system_health: {
    api_status: 'healthy' | 'warning' | 'error'
    database_status: 'healthy' | 'warning' | 'error'
    storage_usage: number
  }
}

export default function SuperAdminDashboard() {
  const { permissions } = usePermissions()
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Charger les statistiques au chargement du composant
  useEffect(() => {
    if (permissions.canGlobalManagement) {
      loadGlobalStats()
    }
  }, [permissions.canGlobalManagement])

  const loadGlobalStats = async () => {
    try {
      setLoading(true)
      const response = await superAdminService.getGlobalStats()
      // Cast or map status fields to the correct union type
      setStats({
        ...response,
        system_health: {
          ...response.system_health,
          api_status: (['healthy', 'warning', 'error'].includes(response.system_health.api_status)
            ? response.system_health.api_status
            : 'healthy') as 'healthy' | 'warning' | 'error',
          database_status: (['healthy', 'warning', 'error'].includes(response.system_health.database_status)
            ? response.system_health.database_status
            : 'healthy') as 'healthy' | 'warning' | 'error',
        }
      })
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!permissions.canGlobalManagement) {
    return (
      <div className="card text-center">
        <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès SuperAdmin requis</h3>
        <p className="text-gray-600">Seuls les SuperAdmins peuvent accéder à ce dashboard.</p>
      </div>
    )
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement des statistiques globales..." />
  }

  // Données simulées enrichies pour le SuperAdmin avec valeurs par défaut sécurisées
  const mockStats: GlobalStats = stats || {
    total_companies: 12,
    active_companies: 10,
    total_users: 145,
    total_pointages: 2850,
    revenue_monthly: 15420,
    plans_distribution: {
      basic: 5,
      premium: 4,
      enterprise: 3
    },
    system_health: {
      api_status: 'healthy',
      database_status: 'healthy',
      storage_usage: 65
    }
  }

  // Fonction de sécurité pour formater les nombres
  const safeFormatNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0'
    }
    return value.toLocaleString('fr-FR')
  }

  // Fonction de sécurité pour formater les montants
  const safeFormatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0€'
    }
    return `${value.toLocaleString('fr-FR')}€`
  }

  // Calculer les revenus mensuels en fonction des plans d'abonnement
  const calculateMonthlyRevenue = () => {
    const planPrices = { basic: 29, premium: 99, enterprise: 299 }
    let totalRevenue = 0
    
    for (const [plan, count] of Object.entries(mockStats.plans_distribution)) {
      const price = planPrices[plan as keyof typeof planPrices] || 0
      totalRevenue += count * price
    }
    
    return totalRevenue
  }

  // Mettre à jour les revenus calculés
  const calculatedRevenue = calculateMonthlyRevenue()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertCircle className="h-4 w-4" />
      case 'error': return <XCircle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header SuperAdmin spécifique */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Crown className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Dashboard SuperAdmin</h1>
            </div>
            <p className="text-red-100">
              Vue d'ensemble globale de la plateforme PointFlex SaaS
            </p>
            <div className="flex items-center space-x-4 mt-3">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm">Plateforme Multi-Tenant</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Niveau 1 - Contrôle Total</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{safeFormatCurrency(calculatedRevenue)}</div>
            <div className="text-red-200 text-sm">Revenus mensuels récurrents</div>
            <div className="text-red-100 text-xs mt-1">+12% vs mois dernier</div>
          </div>
        </div>
      </div>

      {/* Métriques globales SuperAdmin */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Entreprises Totales</p>
              <p className="text-2xl font-bold text-gray-900">{safeFormatNumber(mockStats.total_companies)}</p>
              <p className="text-xs text-green-600">+2 ce mois</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Entreprises Actives</p>
              <p className="text-2xl font-bold text-gray-900">{safeFormatNumber(mockStats.active_companies)}</p>
              <p className="text-xs text-gray-500">
                {mockStats.total_companies > 0 
                  ? Math.round((mockStats.active_companies / mockStats.total_companies) * 100)
                  : 0
                }% du total
              </p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Utilisateurs Totaux</p>
              <p className="text-2xl font-bold text-gray-900">{safeFormatNumber(mockStats.total_users)}</p>
              <p className="text-xs text-green-600">+12 cette semaine</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pointages Totaux</p>
              <p className="text-2xl font-bold text-gray-900">{safeFormatNumber(mockStats.total_pointages)}</p>
              <p className="text-xs text-green-600">+156 aujourd'hui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions SuperAdmin spécifiques */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Actions SuperAdmin</h3>
          <Crown className="h-5 w-5 text-red-600" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/superadmin/companies"
            className="p-4 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all duration-200 hover:shadow-md group"
          >
            <div className="flex items-center space-x-3">
              <Building className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="font-medium">Gérer Entreprises</h4>
                <p className="text-sm opacity-75">Créer, modifier, supprimer</p>
              </div>
            </div>
          </a>

          <a
            href="/roles"
            className="p-4 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-all duration-200 hover:shadow-md group"
          >
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="font-medium">Rôles & Privilèges</h4>
                <p className="text-sm opacity-75">Système de permissions</p>
              </div>
            </div>
          </a>

          <a
            href="/reports"
            className="p-4 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 transition-all duration-200 hover:shadow-md group"
          >
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="font-medium">Analytics Globales</h4>
                <p className="text-sm opacity-75">Rapports plateforme</p>
              </div>
            </div>
          </a>

          <a
            href="/settings"
            className="p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all duration-200 hover:shadow-md group"
          >
            <div className="flex items-center space-x-3">
              <Settings className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="font-medium">Config Système</h4>
                <p className="text-sm opacity-75">Paramètres globaux</p>
              </div>
            </div>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution des plans avec revenus */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Distribution des Plans & Revenus
          </h2>
          <div className="space-y-4">
            {Object.entries(mockStats.plans_distribution || {}).map(([plan, count]) => {
              const total = Object.values(mockStats.plans_distribution || {}).reduce((a, b) => a + b, 0)
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0
              const prices = { basic: 29, premium: 99, enterprise: 299 }
              const revenue = count * (prices[plan as keyof typeof prices] || 0)
              
              return (
                <div key={plan} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        plan === 'basic' ? 'bg-gray-400' :
                        plan === 'premium' ? 'bg-blue-500' :
                        'bg-purple-600'
                      }`} />
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {plan} ({prices[plan as keyof typeof prices] || 0}€/mois)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{count} entreprises</span>
                      <div className="text-xs text-green-600">{safeFormatCurrency(revenue)}/mois</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        plan === 'basic' ? 'bg-gray-400' :
                        plan === 'premium' ? 'bg-blue-500' :
                        'bg-purple-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
            
            {/* Total des revenus */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Total des revenus mensuels</span>
                <span className="font-bold text-lg text-green-600">{safeFormatCurrency(calculatedRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* État du système avec détails */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            État du Système
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Server className="h-5 w-5 text-gray-600" />
                <div>
                  <span className="font-medium text-gray-900">API Gateway</span>
                  <div className="text-xs text-gray-500">Temps de réponse: 120ms</div>
                </div>
              </div>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(mockStats.system_health?.api_status || 'healthy')}`}>
                {getStatusIcon(mockStats.system_health?.api_status || 'healthy')}
                <span className="text-sm font-medium capitalize">{mockStats.system_health?.api_status || 'healthy'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-gray-600" />
                <div>
                  <span className="font-medium text-gray-900">Base de données</span>
                  <div className="text-xs text-gray-500">Connexions actives: 45/100</div>
                </div>
              </div>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(mockStats.system_health?.database_status || 'healthy')}`}>
                {getStatusIcon(mockStats.system_health?.database_status || 'healthy')}
                <span className="text-sm font-medium capitalize">{mockStats.system_health?.database_status || 'healthy'}</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-gray-600" />
                  <div>
                    <span className="font-medium text-gray-900">Stockage</span>
                    <div className="text-xs text-gray-500">2.4 TB utilisés / 5 TB total</div>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">{mockStats.system_health?.storage_usage || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    (mockStats.system_health?.storage_usage || 0) > 80 ? 'bg-red-500' :
                    (mockStats.system_health?.storage_usage || 0) > 60 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${mockStats.system_health?.storage_usage || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques de performance plateforme */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Métriques de Performance Plateforme</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">99.9%</div>
            <div className="text-sm text-blue-800">Uptime Global</div>
            <div className="text-xs text-blue-600 mt-1">SLA respecté</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">1.2s</div>
            <div className="text-sm text-green-800">Temps de réponse</div>
            <div className="text-xs text-green-600 mt-1">Moyenne 24h</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">4.8/5</div>
            <div className="text-sm text-purple-800">Satisfaction client</div>
            <div className="text-xs text-purple-600 mt-1">NPS: +67</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">€{Math.round(calculatedRevenue * 12 / 1000)}k</div>
            <div className="text-sm text-yellow-800">ARR Projeté</div>
            <div className="text-xs text-yellow-600 mt-1">+15% YoY</div>
          </div>
        </div>
      </div>

      {/* Alertes système */}
      <div className="card bg-yellow-50 border-yellow-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Maintenance programmée</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Mise à jour système prévue le 15/01/2024 à 02:00 UTC (durée estimée: 30 minutes)
            </p>
            <div className="mt-2">
              <button className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded">
                Voir les détails
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
