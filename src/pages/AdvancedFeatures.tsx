import React, { useState } from 'react'
import { 
  Zap, Bell, FileText, Activity, BarChart3, Shield,
  CheckCircle, AlertTriangle, Info, RefreshCw
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type FeatureTab = 'notifications' | 'reports' | 'performance'

const FEATURES = [
  {
    id: 'notifications' as const,
    name: 'Notifications Push',
    description: 'Système de notifications en temps réel',
    icon: Bell,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    status: 'active' as const
  },
  {
    id: 'reports' as const,
    name: 'Rapports PDF',
    description: 'Génération de rapports professionnels',
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    status: 'active' as const,
    adminOnly: true
  },
  {
    id: 'performance' as const,
    name: 'Optimiseur Performance',
    description: 'Surveillance des performances',
    icon: Activity,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    status: 'beta' as const
  }
]

export default function AdvancedFeatures() {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<FeatureTab>('notifications')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Actif
          </span>
        )
      case 'beta':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Bêta
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Info className="h-3 w-3 mr-1" />
            Bientôt
          </span>
        )
    }
  }

  const availableFeatures = FEATURES.filter(feature => {
    if (feature.adminOnly && !isAdmin) return false
    return true
  })

  const renderFeatureContent = () => {
    switch (activeTab) {
      case 'notifications':
        return (
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Système de Notifications</h3>
            <p className="text-gray-600 mb-6">
              Recevez des notifications en temps réel pour tous les événements importants de votre entreprise.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">Notifications Push</h4>
                <p className="text-sm text-blue-700">Alertes instantanées dans le navigateur</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">Paramètres Granulaires</h4>
                <p className="text-sm text-blue-700">Contrôlez précisément vos notifications</p>
              </div>
            </div>
          </div>
        )
      case 'reports':
        return (
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Générateur de Rapports</h3>
            <p className="text-gray-600 mb-6">
              Créez des rapports professionnels personnalisés en PDF, Excel ou CSV.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900">Templates Prêts</h4>
                <p className="text-sm text-green-700">Modèles prédéfinis</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900">Multi-Format</h4>
                <p className="text-sm text-green-700">PDF, Excel, CSV</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900">Aperçu Temps Réel</h4>
                <p className="text-sm text-green-700">Prévisualisez avant export</p>
              </div>
            </div>
          </div>
        )
      case 'performance':
        return (
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Optimiseur de Performance</h3>
            <p className="text-gray-600 mb-6">
              Surveillez et optimisez les performances de l'application en temps réel.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900">Métriques Temps Réel</h4>
                <p className="text-sm text-purple-700">Surveillance continue des performances</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900">Optimisations Auto</h4>
                <p className="text-sm text-purple-700">Suggestions d'amélioration</p>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fonctionnalités Avancées</h1>
          <p className="text-gray-600">Découvrez les fonctionnalités avancées de PointFlex</p>
        </div>
        <div className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          <span className="text-sm font-medium text-gray-700">Mode Avancé</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableFeatures.map((feature) => {
            const Icon = feature.icon
            const isActive = activeTab === feature.id
            
            return (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isActive 
                    ? `border-blue-500 ${feature.bgColor}` 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`h-6 w-6 ${isActive ? feature.color : 'text-gray-400'}`} />
                  {getStatusBadge(feature.status)}
                </div>
                <h3 className={`font-medium mb-1 ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                  {feature.name}
                </h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu */}
      {renderFeatureContent()}

      {/* Roadmap */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Roadmap</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="font-medium text-gray-900">Q1 2024 - Notifications Push ✅</h4>
              <p className="text-sm text-gray-600">Système de notifications en temps réel</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-3 bg-yellow-50 rounded-lg">
            <RefreshCw className="h-5 w-5 text-yellow-600" />
            <div>
              <h4 className="font-medium text-gray-900">Q1 2024 - Optimiseur Performance 🚧</h4>
              <p className="text-sm text-gray-600">Surveillance et optimisation (Bêta)</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">Q2 2024 - Analytics IA 🔮</h4>
              <p className="text-sm text-gray-600">Intelligence artificielle prédictive</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-3 bg-purple-50 rounded-lg">
            <Shield className="h-5 w-5 text-purple-600" />
            <div>
              <h4 className="font-medium text-gray-900">Q3 2024 - Sécurité Enterprise 🔒</h4>
              <p className="text-sm text-gray-600">Audit et conformité avancés</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}