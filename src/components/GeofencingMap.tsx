import React, { useState, useEffect } from 'react'
import { MapPin, Target, Settings, Save, AlertCircle, CheckCircle, Navigation } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { adminService } from '../services/api'
import toast from 'react-hot-toast'

export default function GeofencingMap() {
  const { isAdmin } = useAuth()
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const [offices, setOffices] = useState<any[]>([])
  const [officeLocation, setOfficeLocation] = useState({
    latitude: 48.8566,
    longitude: 2.3522,
    name: 'Bureau Principal',
    radius: 100
  })
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  // Charger les bureaux au chargement du composant
  useEffect(() => {
    if (isAdmin) {
      loadOffices()
    }
    getCurrentLocation()
  }, [isAdmin])

  const loadOffices = async () => {
    setDataLoading(true)
    try {
      const response = await adminService.getOffices()
      setOffices(response.data.offices)
      
      // Si des bureaux sont disponibles, utiliser le premier comme emplacement par défaut
      if (response.data.offices.length > 0) {
        const firstOffice = response.data.offices[0]
        setOfficeLocation({
          latitude: firstOffice.latitude,
          longitude: firstOffice.longitude,
          name: firstOffice.name,
          radius: firstOffice.radius
        })
      }
    } catch (error) {
      console.error('Erreur lors du chargement des bureaux:', error)
      toast.error('Erreur lors du chargement des bureaux')
    } finally {
      setDataLoading(false)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée par votre navigateur')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setCurrentLocation(newLocation)
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

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000 // Rayon de la Terre en mètres
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const distance = currentLocation ? calculateDistance(
    currentLocation.lat,
    currentLocation.lng,
    officeLocation.latitude,
    officeLocation.longitude
  ) : null

  const isWithinRadius = distance !== null && distance <= officeLocation.radius

  // Fonction pour utiliser la position actuelle dans le formulaire
  const useCurrentLocationForOffice = () => {
    if (!currentLocation) {
      toast.error('Position actuelle non disponible')
      return
    }
    
    setOfficeLocation(prev => ({
      ...prev,
      latitude: currentLocation.lat,
      longitude: currentLocation.lng
    }))
    
    toast.success('Coordonnées du bureau mises à jour avec votre position actuelle')
  }

  // Fonction pour sauvegarder les coordonnées du bureau
  const saveOfficeLocation = async () => {
    if (!isAdmin) {
      toast.error('Vous n\'avez pas les permissions nécessaires')
      return
    }

    setLoading(true)
    try {
      // Trouver le bureau à mettre à jour (premier bureau par défaut)
      const officeToUpdate = offices.length > 0 ? offices[0] : null
      
      if (officeToUpdate) {
        // Mettre à jour le bureau existant
        const updatedOffice = {
          ...officeToUpdate,
          latitude: officeLocation.latitude,
          longitude: officeLocation.longitude,
          radius: officeLocation.radius
        }
        
        await adminService.updateOffice(officeToUpdate.id, updatedOffice)
        toast.success('Coordonnées du bureau mises à jour avec succès')
        
        // Mettre à jour la liste des bureaux
        setOffices(prev => prev.map(office => 
          office.id === officeToUpdate.id ? updatedOffice : office
        ))
      } else {
        // Créer un nouveau bureau
        const newOffice = {
          name: officeLocation.name,
          address: 'Adresse à compléter',
          latitude: officeLocation.latitude,
          longitude: officeLocation.longitude,
          radius: officeLocation.radius,
          timezone: 'Europe/Paris',
          is_active: true
        }
        
        const response = await adminService.createOffice(newOffice)
        toast.success('Nouveau bureau créé avec succès')
        
        // Ajouter le nouveau bureau à la liste
        setOffices(prev => [...prev, response.data.office])
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des coordonnées:', error)
      toast.error('Erreur lors de la sauvegarde des coordonnées')
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading && isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Géofencing et Localisation</h2>
          <p className="text-gray-600">
            {isAdmin 
              ? 'Configurez les zones de pointage autorisées'
              : 'Vérifiez votre position par rapport aux zones autorisées'
            }
          </p>
        </div>
      </div>

      {/* Status actuel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Statut de Localisation</h3>
          <button
            onClick={getCurrentLocation}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? 'Localisation...' : 'Actualiser Position'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position actuelle
              </label>
              {currentLocation ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Position obtenue</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    Lat: {currentLocation.lat.toFixed(6)}
                  </p>
                  <p className="text-sm text-gray-900">
                    Lng: {currentLocation.lng.toFixed(6)}
                  </p>
                  <button 
                    onClick={() => {
                      if (currentLocation) {
                        navigator.clipboard.writeText(`${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`)
                        toast.success('Coordonnées copiées dans le presse-papier')
                      }
                    }}
                    className="mt-2 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                  >
                    Copier les coordonnées
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Position non disponible</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance du bureau
              </label>
              {distance !== null ? (
                <div className={`p-3 rounded-lg border ${
                  isWithinRadius 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {isWithinRadius ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      isWithinRadius ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {Math.round(distance)}m du bureau
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${
                    isWithinRadius ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {isWithinRadius 
                      ? '✓ Pointage autorisé dans cette zone' 
                      : `✗ Hors zone autorisée (rayon: ${officeLocation.radius}m)`
                    }
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">Calcul en cours...</p>
                </div>
              )}
            </div>
          </div>

          {/* Carte simulée */}
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg h-64 flex items-center justify-center relative overflow-hidden border border-gray-200">
            {/* Bureau */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                {/* Rayon de pointage */}
                <div 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-blue-400 border-dashed rounded-full opacity-50"
                  style={{ 
                    width: `${Math.min(officeLocation.radius / 2, 120)}px`, 
                    height: `${Math.min(officeLocation.radius / 2, 120)}px` 
                  }}
                ></div>
                
                {/* Bureau */}
                <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg relative z-10">
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow-sm whitespace-nowrap">
                    {officeLocation.name}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Position actuelle */}
            {currentLocation && (
              <div className={`absolute ${
                isWithinRadius 
                  ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' 
                  : 'top-1/4 right-1/4'
              }`}>
                <div className={`w-3 h-3 ${
                  isWithinRadius ? 'bg-green-500' : 'bg-red-500'
                } rounded-full border-2 border-white shadow-lg animate-pulse relative`}>
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-1 py-0.5 rounded text-xs whitespace-nowrap">
                    Vous
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configuration (Admin seulement) */}
      {isAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Settings className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Configuration du Bureau</h3>
                <p className="text-sm text-gray-600">Définissez les paramètres de géofencing</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du bureau
                </label>
                <input
                  type="text"
                  value={officeLocation.name}
                  onChange={(e) => setOfficeLocation(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={officeLocation.latitude}
                    onChange={(e) => setOfficeLocation(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
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
                    value={officeLocation.longitude}
                    onChange={(e) => setOfficeLocation(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rayon autorisé (mètres)
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={officeLocation.radius}
                  onChange={(e) => setOfficeLocation(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                  className="input-field"
                />
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={useCurrentLocationForOffice}
                disabled={!currentLocation}
                className="btn-secondary w-full"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {!currentLocation ? 'Position non disponible' : 'Utiliser ma position actuelle'}
              </button>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  💡 Conseils de configuration
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Un rayon de 50-100m est généralement suffisant</li>
                  <li>• Vérifiez que tous les accès au bureau sont couverts</li>
                  <li>• Évitez un rayon trop large pour maintenir la précision</li>
                </ul>
              </div>

              <button 
                onClick={saveOfficeLocation}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sauvegarde...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder la configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}