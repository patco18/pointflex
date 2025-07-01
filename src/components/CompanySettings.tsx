import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { adminService } from '../services/api'
import { MapPin, Clock, Save, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CompanySettings() {
  const { isAdmin } = useAuth()
  const [settings, setSettings] = useState({
    office_latitude: 48.8566,
    office_longitude: 2.3522,
    office_radius: 100,
    work_start_time: '09:00',
    late_threshold: 15
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  // Charger les paramètres de l'entreprise
  useEffect(() => {
    if (isAdmin) {
      loadCompanySettings()
    }
  }, [isAdmin])

  const loadCompanySettings = async () => {
    try {
      setDataLoading(true)
      // Simuler le chargement des paramètres depuis l'API
      // En production, remplacer par un appel API réel
      setTimeout(() => {
        setSettings({
          office_latitude: 48.8566,
          office_longitude: 2.3522,
          office_radius: 100,
          work_start_time: '09:00',
          late_threshold: 15
        })
        setDataLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
      toast.error('Erreur lors du chargement des paramètres')
      setDataLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Appel API pour sauvegarder les paramètres
      await adminService.updateCompanySettings(settings)
      toast.success('Paramètres sauvegardés avec succès!')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // Fonction pour obtenir la position actuelle
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée par votre navigateur')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettings(prev => ({
          ...prev,
          office_latitude: position.coords.latitude,
          office_longitude: position.coords.longitude
        }))
        toast.success('Position actuelle récupérée avec succès')
        setLoading(false)
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error)
        toast.error('Impossible d\'obtenir votre position')
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    )
  }

  if (!isAdmin) {
    return (
      <div className="card text-center">
        <div className="h-12 w-12 text-gray-400 mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès restreint
        </h3>
        <p className="text-gray-600">
          Seuls les administrateurs peuvent accéder aux paramètres de l'entreprise.
        </p>
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres de l'entreprise</h1>
        <p className="text-gray-600">
          Configurez les paramètres de pointage pour votre entreprise
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center mb-4">
            <MapPin className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Localisation du bureau
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={settings.office_latitude}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    office_latitude: parseFloat(e.target.value)
                  }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={settings.office_longitude}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    office_longitude: parseFloat(e.target.value)
                  }))}
                  className="input-field"
                />
              </div>
            </div>
            
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="btn-secondary w-full"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {loading ? 'Récupération...' : 'Utiliser ma position actuelle'}
            </button>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rayon autorisé (mètres)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={settings.office_radius}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  office_radius: parseInt(e.target.value)
                }))}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center mb-4">
            <Clock className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Horaires de travail
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure de début
              </label>
              <input
                type="time"
                value={settings.work_start_time}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  work_start_time: e.target.value
                }))}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tolérance retard (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.late_threshold}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  late_threshold: parseInt(e.target.value)
                }))}
                className="input-field"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sauvegarde...
            </div>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder les paramètres
            </>
          )}
        </button>
      </div>
    </div>
  )
}