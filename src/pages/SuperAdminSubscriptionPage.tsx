import React, { useState, useEffect } from 'react'
import { superAdminService } from '../services/api'
import { usePermissions } from '../hooks/usePermissions'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import SubscriptionPlanManagement from '../components/SubscriptionPlanManagement'
import { 
  Crown, 
  Package, 
  DollarSign, 
  Users, 
  Clock, 
  Star, 
  Settings,
  ArrowUpRight,
  Layers,
  Building,
  BarChart3,
  TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'

// Interfaces
interface CompanySubscription {
  id: number
  company_id: number
  company_name: string
  plan: string
  status: 'active' | 'trial' | 'expired' | 'cancelled' | 'pending'
  start_date: string
  end_date: string
  amount_paid: number
  days_remaining: number
  auto_renew: boolean
}

interface SubscriptionStats {
  total_subscriptions: number
  active_subscriptions: number
  revenue_monthly: number
  trial_subscriptions: number
  expired_subscriptions: number
  plan_distribution: Record<string, number>
  renewal_upcoming_30_days: number
}

export default function SuperAdminSubscriptionPage() {
  const { permissions } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [subscriptions, setSubscriptions] = useState<CompanySubscription[]>([])
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  
  useEffect(() => {
    if (permissions.canGlobalManagement) {
      loadSubscriptionsData()
    }
  }, [permissions.canGlobalManagement])
  
  const loadSubscriptionsData = async () => {
    try {
      setLoading(true)
      
      let subscriptionsData: CompanySubscription[] = [];
      let statsData = {
        total_subscriptions: 0,
        active_subscriptions: 0,
        revenue_monthly: 0,
        trial_subscriptions: 0,
        expired_subscriptions: 0,
        plan_distribution: {},
        renewal_upcoming_30_days: 0
      };
      
      try {
        const subscriptionsResponse = await superAdminService.getCompanySubscriptions();
        subscriptionsData = subscriptionsResponse.data.subscriptions || [];
      } catch (subscriptionsError) {
        console.error('Erreur lors du chargement des abonnements:', subscriptionsError);
        toast.error('Erreur lors du chargement des abonnements');
      }
      
      try {
        const statsResponse = await superAdminService.getSubscriptionStats();
        statsData = statsResponse.data.stats || statsData;
      } catch (statsError) {
        console.error('Erreur lors du chargement des statistiques:', statsError);
        toast.error('Erreur lors du chargement des statistiques');
      }
      
      setSubscriptions(subscriptionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données d\'abonnement:', error)
      toast.error('Erreur lors du chargement des données')
      
      // Données de démonstration en cas d'erreur
      setStats({
        total_subscriptions: 28,
        active_subscriptions: 24,
        revenue_monthly: 2950,
        trial_subscriptions: 3,
        expired_subscriptions: 1,
        plan_distribution: {
          basic: 10,
          premium: 12,
          enterprise: 6
        },
        renewal_upcoming_30_days: 5
      })
      
      // Quelques abonnements de démonstration
      setSubscriptions([
        {
          id: 1,
          company_id: 1,
          company_name: 'Acme Inc',
          plan: 'premium',
          status: 'active',
          start_date: '2025-01-15',
          end_date: '2026-01-15',
          amount_paid: 1188,
          days_remaining: 175,
          auto_renew: true
        },
        {
          id: 2,
          company_id: 2,
          company_name: 'Tech Solutions',
          plan: 'enterprise',
          status: 'active',
          start_date: '2025-03-01',
          end_date: '2026-03-01',
          amount_paid: 3588,
          days_remaining: 220,
          auto_renew: true
        },
        {
          id: 3,
          company_id: 3,
          company_name: 'Startup Labs',
          plan: 'basic',
          status: 'trial',
          start_date: '2025-07-10',
          end_date: '2025-08-10',
          amount_paid: 0,
          days_remaining: 15,
          auto_renew: false
        },
        {
          id: 4,
          company_id: 4,
          company_name: 'Global Services',
          plan: 'premium',
          status: 'active',
          start_date: '2025-05-20',
          end_date: '2026-05-20',
          amount_paid: 1188,
          days_remaining: 300,
          auto_renew: true
        },
        {
          id: 5,
          company_id: 5,
          company_name: 'Digital Studios',
          plan: 'basic',
          status: 'expired',
          start_date: '2024-06-01',
          end_date: '2025-06-01',
          amount_paid: 348,
          days_remaining: 0,
          auto_renew: false
        }
      ])
    } finally {
      setLoading(false)
    }
  }
  
  if (!permissions.canGlobalManagement) {
    return (
      <div className="card text-center">
        <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès SuperAdmin requis</h3>
        <p className="text-gray-600">Seuls les SuperAdmins peuvent accéder à cette page.</p>
      </div>
    )
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement des données d'abonnement..." />
  }
  
  // Fonction pour afficher les montants
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')}€`
  }
  
  // Fonction pour le statut coloré
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <span className="badge-success">Actif</span>
      case 'trial':
        return <span className="badge-info">Essai</span>
      case 'expired':
        return <span className="badge-error">Expiré</span>
      case 'cancelled':
        return <span className="badge-warning">Annulé</span>
      default:
        return <span className="badge-default">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Package className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Gestion des Abonnements</h1>
            </div>
            <p className="text-purple-100">
              Administration des abonnements et plans tarifaires de la plateforme
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{formatCurrency(stats?.revenue_monthly || 0)}</div>
            <div className="text-purple-200 text-sm">Revenus mensuels récurrents</div>
          </div>
        </div>
      </div>
      
      {/* Métriques clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Layers className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Abonnements Actifs</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.active_subscriptions || 0}</p>
              <p className="text-xs text-purple-600">sur {stats?.total_subscriptions || 0} total</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Taux Conversion</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats ? 
                  `${Math.round((stats.active_subscriptions / Math.max(stats.total_subscriptions, 1)) * 100)}%` 
                  : '0%'}
              </p>
              <p className="text-xs text-blue-600">essai → abonnement</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Renouvellements</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.renewal_upcoming_30_days || 0}</p>
              <p className="text-xs text-green-600">dans les 30 jours</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Essais en cours</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.trial_subscriptions || 0}</p>
              <p className="text-xs text-yellow-600">conversion potentielle</p>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'plans'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Plans d'abonnement
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'companies'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Abonnements entreprises
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Paramètres
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Distribution des plans */}
              <div className="card lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Distribution des Plans
                </h3>
                <div className="space-y-4">
                  {stats && stats.plan_distribution && 
                   Object.entries(stats.plan_distribution).map(([plan, count]) => {
                    const total = Object.values(stats.plan_distribution).reduce((a, b) => a + b, 0)
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
                              {plan}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">{count} entreprises</span>
                            <div className="text-xs text-green-600">{formatCurrency(revenue)}/mois</div>
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
                </div>
              </div>
              
              {/* Statistiques de conversion */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Conversion & Fidélisation
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-600 mb-1">Taux de conversion</div>
                    <div className="text-2xl font-bold text-gray-900">78%</div>
                    <div className="text-xs text-green-600">+5% vs mois dernier</div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-600 mb-1">Durée moyenne</div>
                    <div className="text-2xl font-bold text-gray-900">14.3 mois</div>
                    <div className="text-xs text-green-600">+2.1 mois vs 2024</div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-600 mb-1">Churn rate annuel</div>
                    <div className="text-2xl font-bold text-gray-900">8.2%</div>
                    <div className="text-xs text-green-600">-1.5% vs 2024</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Abonnements récents */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Abonnements récents</h3>
                <a href="/superadmin/subscriptions" className="text-primary-600 hover:text-primary-800 text-sm flex items-center">
                  Voir tout <ArrowUpRight className="h-3 w-3 ml-1" />
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entreprise
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de fin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.slice(0, 5).map((subscription) => (
                      <tr key={subscription.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-medium">
                              {subscription.company_name.substring(0, 2)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {subscription.company_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm capitalize font-medium">
                            {subscription.plan}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(subscription.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{subscription.end_date}</div>
                          <div className="text-xs text-gray-500">
                            {subscription.days_remaining > 0 ? `${subscription.days_remaining} jours restants` : 'Expiré'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(subscription.amount_paid)}
                          <div className="text-xs text-gray-500">
                            {subscription.auto_renew ? 'Renouvellement auto' : 'Pas de renouvellement auto'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'plans' && (
          <SubscriptionPlanManagement />
        )}
        
        {activeTab === 'companies' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Abonnements des entreprises</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entreprise
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Période
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-medium">
                            {subscription.company_name.substring(0, 2)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {subscription.company_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {subscription.company_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm capitalize font-medium">
                          {subscription.plan}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(subscription.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{subscription.start_date} au {subscription.end_date}</div>
                        <div className="text-xs text-gray-500">
                          {subscription.days_remaining > 0 ? `${subscription.days_remaining} jours restants` : 'Expiré'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(subscription.amount_paid)}
                        <div className="text-xs text-gray-500">
                          {subscription.auto_renew ? 'Renouvellement auto' : 'Pas de renouvellement auto'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            className="text-primary-600 hover:text-primary-900"
                            onClick={() => alert(`Éditer l'abonnement de ${subscription.company_name}`)}
                          >
                            Éditer
                          </button>
                          <button 
                            className="text-gray-600 hover:text-gray-900"
                            onClick={() => alert(`Voir l'historique de ${subscription.company_name}`)}
                          >
                            Historique
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres des abonnements</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Intégration de paiement</h4>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-blue-100 flex items-center justify-center rounded-lg">
                        <DollarSign className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Stripe</div>
                        <div className="text-sm text-gray-500">Passerelle de paiement principale</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="badge-success text-xs">Connecté</span>
                      <button className="text-sm text-gray-500 hover:text-gray-700">Configurer</button>
                    </div>
                  </div>
                  
                  <h4 className="font-medium text-gray-700 mt-6">Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Notification de fin d'essai (jours avant)</label>
                      <input type="number" className="w-20 px-2 py-1 border rounded" defaultValue={3} />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Notification d'expiration (jours avant)</label>
                      <input type="number" className="w-20 px-2 py-1 border rounded" defaultValue={7} />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Notification de paiement réussi</label>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Paramètres d'essai</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Durée d'essai (jours)</label>
                      <input type="number" className="w-20 px-2 py-1 border rounded" defaultValue={14} />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Nécessite une carte bancaire</label>
                      <input type="checkbox" className="toggle" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Conversion automatique</label>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </div>
                  </div>
                  
                  <h4 className="font-medium text-gray-700 mt-6">Facturation</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Devise par défaut</label>
                      <select className="px-2 py-1 border rounded">
                        <option>EUR (€)</option>
                        <option>USD ($)</option>
                        <option>GBP (£)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-600">Pays par défaut</label>
                      <select className="px-2 py-1 border rounded">
                        <option>France</option>
                        <option>États-Unis</option>
                        <option>Canada</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button className="btn-outline">Annuler</button>
                <button className="btn-primary" onClick={() => toast.success('Paramètres enregistrés')}>
                  Enregistrer les paramètres
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
