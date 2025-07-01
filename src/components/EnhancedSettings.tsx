import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { superAdminService } from '../services/api'
import { 
  MapPin, Clock, Save, Settings, Globe, Shield, Bell, 
  Users, Building, Calendar, Mail, Phone, Lock, Eye, 
  EyeOff, Download, Upload, Trash2, AlertTriangle,
  CheckCircle, Info, Zap, Database, Server, Activity,
  RefreshCw, FileText, BarChart3, Cog, Crown, Search,
  Archive, HardDrive, Wifi, Monitor, Cpu, MemoryStick
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SystemSettings {
  general: Record<string, any>
  security: Record<string, any>
  notifications: Record<string, any>
  integrations: Record<string, any>
  advanced: Record<string, any>
}

interface SystemHealth {
  api_status: string
  database_status: string
  storage_usage: number
  uptime: string
  response_time: string
  active_connections: number
  max_connections: number
  metrics: {
    total_companies: number
    total_users: number
    total_pointages: number
    daily_active_users: number
    error_rate: string
  }
  last_backup: string
  maintenance_mode: boolean
}

interface AuditLog {
  id: number
  user_email: string
  action: string
  resource_type: string
  resource_id: number
  details: any
  ip_address: string
  created_at: string
}

export default function EnhancedSettings() {
  const { user } = useAuth()
  const { permissions } = usePermissions()
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'integrations' | 'advanced' | 'health' | 'audit'>('general')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<SystemSettings>({
    general: {},
    security: {},
    notifications: {},
    integrations: {},
    advanced: {}
  })
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)

  useEffect(() => {
    if (permissions.canGlobalManagement) {
      loadSystemSettings()
      loadSystemHealth()
      loadAuditLogs()
    }
  }, [permissions.canGlobalManagement])

  const loadSystemSettings = async () => {
    try {
      setLoading(true)
      const response = await superAdminService.getSystemSettings()
      setSettings(response.data.settings)
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
      toast.error('Erreur lors du chargement des paramètres système')
    } finally {
      setLoading(false)
    }
  }

  const loadSystemHealth = async () => {
    try {
      const response = await superAdminService.getSystemHealth()
      setSystemHealth(response.data.health)
    } catch (error) {
      console.error('Erreur lors du chargement de l\'état système:', error)
    }
  }

  const loadAuditLogs = async (page = 1) => {
    try {
      const response = await superAdminService.getAuditLogs({ page, per_page: 20 })
      setAuditLogs(response.data.logs)
      setAuditTotal(response.data.pagination.total)
      setAuditPage(page)
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error)
    }
  }

  const handleSaveSettings = async (category: string) => {
    setLoading(true)
    try {
      const settingsToSave = { [category]: settings[category as keyof SystemSettings] }
      await superAdminService.updateSystemSettings(settingsToSave)
      toast.success(`Paramètres ${category} sauvegardés avec succès!`)
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    try {
      setLoading(true)
      const response = await superAdminService.createSystemBackup()
      toast.success(`Sauvegarde créée: ${response.data.backup_id}`)
      loadSystemHealth() // Recharger pour mettre à jour la date de dernière sauvegarde
    } catch (error) {
      toast.error('Erreur lors de la création de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMaintenanceMode = async () => {
    try {
      const enabled = !systemHealth?.maintenance_mode
      const message = enabled ? 'Maintenance programmée en cours' : ''
      
      await superAdminService.toggleMaintenanceMode({ enabled, message })
      toast.success(`Mode maintenance ${enabled ? 'activé' : 'désactivé'}`)
      loadSystemHealth()
    } catch (error) {
      toast.error('Erreur lors du changement de mode maintenance')
    }
  }

  const handleResetSettings = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres système ? Cette action est irréversible.')) {
      return
    }

    try {
      setLoading(true)
      await superAdminService.resetSystemSettings(true)
      toast.success('Paramètres système réinitialisés')
      loadSystemSettings()
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof SystemSettings],
        [key]: { ...prev[category as keyof SystemSettings][key], value }
      }
    }))
  }

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
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'error': return <AlertTriangle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  if (!permissions.canGlobalManagement) {
    return (
      <div className="card text-center">
        <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès SuperAdmin requis
        </h3>
        <p className="text-gray-600">
          Seuls les SuperAdmins peuvent accéder à la configuration système.
        </p>
      </div>
    )
  }

  const tabs = [
    { id: 'general', name: 'Général', icon: Settings },
    { id: 'security', name: 'Sécurité', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'integrations', name: 'Intégrations', icon: Globe },
    { id: 'advanced', name: 'Avancé', icon: Zap },
    { id: 'health', name: 'État Système', icon: Activity },
    { id: 'audit', name: 'Logs Audit', icon: Search }
  ]

  return (
    <div className="space-y-6">
      {/* Header SuperAdmin */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Crown className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Configuration Système</h1>
            </div>
            <p className="text-red-100">
              Administration globale de la plateforme PointFlex SaaS
            </p>
            <div className="flex items-center space-x-4 mt-3">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm">Niveau Global</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Contrôle Total</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-red-200 text-sm">Configuration Système</div>
            {systemHealth?.maintenance_mode && (
              <div className="text-red-100 text-xs mt-1 bg-red-800 px-2 py-1 rounded">
                🔧 Mode Maintenance
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="inline-block w-4 h-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres Généraux</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la plateforme
                </label>
                <input
                  type="text"
                  value={settings.general.platform_name?.value || 'PointFlex SaaS'}
                  onChange={(e) => updateSetting('general', 'platform_name', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={settings.general.platform_version?.value || '2.0.0'}
                  onChange={(e) => updateSetting('general', 'platform_version', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fuseau horaire par défaut
                </label>
                <select
                  value={settings.general.default_timezone?.value || 'Europe/Paris'}
                  onChange={(e) => updateSetting('general', 'default_timezone', e.target.value)}
                  className="input-field"
                >
                  <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                  <option value="Europe/London">Europe/London (GMT+0)</option>
                  <option value="America/New_York">America/New_York (GMT-5)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Langue par défaut
                </label>
                <select
                  value={settings.general.default_language?.value || 'fr'}
                  onChange={(e) => updateSetting('general', 'default_language', e.target.value)}
                  className="input-field"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Limites Système</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre maximum d'entreprises
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={settings.general.max_companies?.value || 1000}
                  onChange={(e) => updateSetting('general', 'max_companies', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Utilisateurs max par entreprise
                </label>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={settings.general.max_users_per_company?.value || 999}
                  onChange={(e) => updateSetting('general', 'max_users_per_company', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-end">
            <button
              onClick={() => handleSaveSettings('general')}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Sauvegarde...' : 'Sauvegarder les paramètres généraux'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres de Sécurité</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longueur minimale du mot de passe
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={settings.security.password_min_length?.value || 8}
                    onChange={(e) => updateSetting('security', 'password_min_length', parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Majuscule obligatoire
                    </label>
                    <p className="text-xs text-gray-500">Le mot de passe doit contenir une majuscule</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.security.password_require_uppercase?.value || false}
                    onChange={(e) => updateSetting('security', 'password_require_uppercase', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Chiffres obligatoires
                    </label>
                    <p className="text-xs text-gray-500">Le mot de passe doit contenir un chiffre</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.security.password_require_numbers?.value || false}
                    onChange={(e) => updateSetting('security', 'password_require_numbers', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Authentification 2FA
                    </label>
                    <p className="text-xs text-gray-500">Obligatoire pour tous les utilisateurs</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.security.require_2fa?.value || false}
                    onChange={(e) => updateSetting('security', 'require_2fa', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeout session (minutes)
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="2880"
                    value={settings.security.session_timeout?.value || 1440}
                    onChange={(e) => updateSetting('security', 'session_timeout', parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tentatives de connexion max
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={settings.security.max_login_attempts?.value || 5}
                    onChange={(e) => updateSetting('security', 'max_login_attempts', parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durée de verrouillage (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.security.lockout_duration?.value || 30}
                    onChange={(e) => updateSetting('security', 'lockout_duration', parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => handleSaveSettings('security')}
                disabled={loading}
                className="btn-primary"
              >
                Sauvegarder les paramètres de sécurité
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres de Notifications</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Canaux de notification</h4>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Notifications email</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.email_notifications_enabled?.value || false}
                  onChange={(e) => updateSetting('notifications', 'email_notifications_enabled', e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Notifications push</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.push_notifications_enabled?.value || false}
                  onChange={(e) => updateSetting('notifications', 'push_notifications_enabled', e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Notifications SMS</label>
                <input
                  type="checkbox"
                  checked={settings.notifications.sms_notifications_enabled?.value || false}
                  onChange={(e) => updateSetting('notifications', 'sms_notifications_enabled', e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Rétention</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rétention notifications (jours)
                </label>
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={settings.notifications.notification_retention_days?.value || 30}
                  onChange={(e) => updateSetting('notifications', 'notification_retention_days', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => handleSaveSettings('notifications')}
              disabled={loading}
              className="btn-primary"
            >
              Sauvegarder les paramètres de notifications
            </button>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration SMTP</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serveur SMTP
                  </label>
                  <input
                    type="text"
                    value={settings.integrations.smtp_host?.value || ''}
                    onChange={(e) => updateSetting('integrations', 'smtp_host', e.target.value)}
                    className="input-field"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port SMTP
                  </label>
                  <input
                    type="number"
                    value={settings.integrations.smtp_port?.value || 587}
                    onChange={(e) => updateSetting('integrations', 'smtp_port', parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Utiliser TLS</label>
                  <input
                    type="checkbox"
                    checked={settings.integrations.smtp_use_tls?.value || false}
                    onChange={(e) => updateSetting('integrations', 'smtp_use_tls', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limite API (requêtes/heure)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    value={settings.integrations.api_rate_limit?.value || 1000}
                    onChange={(e) => updateSetting('integrations', 'api_rate_limit', parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeout webhooks (secondes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.integrations.webhook_timeout?.value || 30}
                    onChange={(e) => updateSetting('integrations', 'webhook_timeout', parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => handleSaveSettings('integrations')}
                disabled={loading}
                className="btn-primary"
              >
                Sauvegarder les intégrations
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres Avancés</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mode debug</label>
                    <p className="text-xs text-gray-500">Logs détaillés pour le développement</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.advanced.debug_mode_enabled?.value || false}
                    onChange={(e) => updateSetting('advanced', 'debug_mode_enabled', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Sauvegarde automatique</label>
                    <p className="text-xs text-gray-500">Sauvegarde automatique des données</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.advanced.auto_backup_enabled?.value || false}
                    onChange={(e) => updateSetting('advanced', 'auto_backup_enabled', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fréquence sauvegarde (heures)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={settings.advanced.auto_backup_frequency?.value || 24}
                    onChange={(e) => updateSetting('advanced', 'auto_backup_frequency', parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rétention logs (jours)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={settings.advanced.log_retention_days?.value || 90}
                    onChange={(e) => updateSetting('advanced', 'log_retention_days', parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rétention sauvegardes (jours)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={settings.advanced.backup_retention_days?.value || 30}
                    onChange={(e) => updateSetting('advanced', 'backup_retention_days', parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => handleSaveSettings('advanced')}
                disabled={loading}
                className="btn-primary"
              >
                Sauvegarder les paramètres avancés
              </button>
            </div>
          </div>

          {/* Actions dangereuses */}
          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-start space-x-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Zone dangereuse</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Ces actions peuvent affecter le fonctionnement de votre système.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <button 
                  onClick={handleCreateBackup}
                  className="btn-secondary w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Créer une sauvegarde
                </button>
                
                <button 
                  onClick={handleToggleMaintenanceMode}
                  className={`w-full px-4 py-2 rounded-lg transition-colors ${
                    systemHealth?.maintenance_mode 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  <Cog className="h-4 w-4 mr-2 inline" />
                  {systemHealth?.maintenance_mode ? 'Désactiver' : 'Activer'} mode maintenance
                </button>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleResetSettings}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2 inline" />
                  Réinitialiser tous les paramètres
                </button>

                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700">
                    ⚠️ La réinitialisation des paramètres restaurera toutes les valeurs par défaut. Cette action est irréversible.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'health' && systemHealth && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">État du Système</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Server className="h-5 w-5 text-gray-600" />
                    <div>
                      <span className="font-medium text-gray-900">API Gateway</span>
                      <div className="text-xs text-gray-500">Temps de réponse: {systemHealth.response_time}</div>
                    </div>
                  </div>
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(systemHealth.api_status)}`}>
                    {getStatusIcon(systemHealth.api_status)}
                    <span className="text-sm font-medium capitalize">{systemHealth.api_status}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-gray-600" />
                    <div>
                      <span className="font-medium text-gray-900">Base de données</span>
                      <div className="text-xs text-gray-500">
                        Connexions: {systemHealth.active_connections}/{systemHealth.max_connections}
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(systemHealth.database_status)}`}>
                    {getStatusIcon(systemHealth.database_status)}
                    <span className="text-sm font-medium capitalize">{systemHealth.database_status}</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <HardDrive className="h-5 w-5 text-gray-600" />
                      <div>
                        <span className="font-medium text-gray-900">Stockage</span>
                        <div className="text-xs text-gray-500">Utilisation</div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{systemHealth.storage_usage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        systemHealth.storage_usage > 80 ? 'bg-red-500' :
                        systemHealth.storage_usage > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${systemHealth.storage_usage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Métriques</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{systemHealth.metrics.total_companies}</div>
                      <div className="text-xs text-gray-500">Entreprises</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{systemHealth.metrics.total_users}</div>
                      <div className="text-xs text-gray-500">Utilisateurs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{systemHealth.metrics.daily_active_users}</div>
                      <div className="text-xs text-gray-500">Utilisateurs actifs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{systemHealth.metrics.error_rate}</div>
                      <div className="text-xs text-gray-500">Taux d'erreur</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Informations système</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uptime:</span>
                      <span className="font-medium text-gray-900">{systemHealth.uptime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dernière sauvegarde:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(systemHealth.last_backup).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mode maintenance:</span>
                      <span className={`font-medium ${systemHealth.maintenance_mode ? 'text-red-600' : 'text-green-600'}`}>
                        {systemHealth.maintenance_mode ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={loadSystemHealth}
                className="btn-secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ressources Système</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Cpu className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-gray-900">CPU</h4>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: '45%' }} />
                </div>
                <div className="text-sm text-gray-600">45% utilisé</div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <MemoryStick className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-gray-900">Mémoire</h4>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: '60%' }} />
                </div>
                <div className="text-sm text-gray-600">60% utilisé</div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Wifi className="h-5 w-5 text-purple-600" />
                  <h4 className="font-medium text-gray-900">Réseau</h4>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full bg-purple-500" style={{ width: '25%' }} />
                </div>
                <div className="text-sm text-gray-600">25% utilisé</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Logs d'Audit</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => loadAuditLogs(auditPage)}
                className="btn-secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </button>
              <button className="btn-secondary">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ressource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {auditLogs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun log d'audit</h3>
              <p className="mt-1 text-sm text-gray-500">
                Les actions des utilisateurs seront enregistrées ici
              </p>
            </div>
          )}
          
          {auditLogs.length > 0 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-700">
                Affichage de {auditLogs.length} logs sur {auditTotal}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => loadAuditLogs(auditPage - 1)}
                  disabled={auditPage === 1}
                  className="btn-secondary disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => loadAuditLogs(auditPage + 1)}
                  disabled={auditLogs.length < 20}
                  className="btn-secondary disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}