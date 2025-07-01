import { useState, useEffect } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import { adminService } from '../services/api'
import { 
  MapPin, 
  Target, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Navigation, 
  Crosshair, 
  Map, 
  Globe
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Office {
  id: number
  name: string
  latitude: number
  longitude: number
  radius: number
  address: string
  is_active: boolean
  timezone: string
}

export default function EnhancedGeofencing() {
  const { permissions } = usePermissions()
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null)
  const [offices, setOffices] = useState<Office[]>([])
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null)
  const [loading, setLoading] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)
  const [locationHistory, setLocationHistory] = useState<Array<{lat: number, lng: number, timestamp: Date}>>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    // Charger les bureaux
    loadOffices()
    
    // Démarrer le suivi de position en temps réel
    startLocationTracking()
    
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [])

  const loadOffices = async () => {
    if (!permissions.canManageCompanySettings) return
    
    setDataLoading(true)
    try {
      const response = await adminService.getOffices()
      setOffices(response.data.offices)
    } catch (error) {
      console.error('Erreur lors du chargement des bureaux:', error)
      toast.error('Erreur lors du chargement des bureaux')
    } finally {
      setDataLoading(false)
    }
  }

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée par votre navigateur')
      return
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        setCurrentLocation(newLocation)
        
        // Ajouter à l'historique (garder seulement les 10 dernières positions)
        setLocationHistory(prev => [
          { ...newLocation, timestamp: new Date() },
          ...prev.slice(0, 9)
        ])
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error)
        toast.error('Impossible d\'obtenir votre position')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    )
    
    setWatchId(id)
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
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        setCurrentLocation(newLocation)
        toast.success('Position mise à jour avec succès')
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

  const getOfficeStatus = (office: Office) => {
    if (!currentLocation) return { status: 'unknown', distance: null, message: 'Position inconnue' }
    
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      office.latitude,
      office.longitude
    )
    
    const isWithin = distance <= office.radius
    
    return {
      status: isWithin ? 'inside' : 'outside',
      distance: Math.round(distance),
      message: isWithin 
        ? `À l'intérieur (${Math.round(distance)}m du centre)`
        : `Hors zone (${Math.round(distance)}m du bureau)`
    }
  }

  const getAccuracyLevel = () => {
    if (!currentLocation) return 'unknown'
    if (currentLocation.accuracy <= 10) return 'excellent'
    if (currentLocation.accuracy <= 50) return 'good'
    if (currentLocation.accuracy <= 100) return 'fair'
    return 'poor'
  }

  const getAccuracyColor = () => {
    const level = getAccuracyLevel()
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'fair': return 'text-yellow-600 bg-yellow-100'
      case 'poor': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Fonction pour utiliser la position actuelle dans le formulaire d'édition
  const useCurrentLocationForOffice = () => {
    if (!currentLocation) {
      toast.error('Position actuelle non disponible')
      return
    }
    
    if (selectedOffice) {
      // Mettre à jour le bureau sélectionné avec les coordonnées actuelles
      const updatedOffice = {
        ...selectedOffice,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng
      }
      
      // Appel API pour mettre à jour le bureau
      setLoading(true)
      adminService.updateOffice(selectedOffice.id, updatedOffice)
        .then(() => {
          // Mettre à jour l'état local
          setOffices(prev => prev.map(office => 
            office.id === selectedOffice.id ? updatedOffice : office
          ))
          setSelectedOffice(updatedOffice)
          toast.success('Coordonnées du bureau mises à jour avec succès')
        })
        .catch(error => {
          console.error('Erreur lors de la mise à jour du bureau:', error)
          toast.error('Erreur lors de la mise à jour des coordonnées')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }

  if (dataLoading && permissions.canManageCompanySettings) {
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
          <h2 className="text-xl font-bold text-gray-900">Géofencing Avancé</h2>
          <p className="text-gray-600">
            Système de géolocalisation en temps réel avec suivi précis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getAccuracyColor()}`}>
            Précision: {getAccuracyLevel()}
          </div>
        </div>
      </div>

      {/* Status de localisation en temps réel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Position Actuelle</h3>
          <div className="flex space-x-2">
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="btn-secondary"
            >
              {loading ? 'Localisation...' : 'Actualiser Position'}
            </button>
            <button className="btn-secondary">
              <Navigation className="h-4 w-4 mr-2" />
              Centrer carte
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Position GPS */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Crosshair className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-900">Coordonnées GPS</span>
              </div>
              {currentLocation ? (
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Latitude:</span> {currentLocation.lat.toFixed(6)}</p>
                  <p><span className="font-medium">Longitude:</span> {currentLocation.lng.toFixed(6)}</p>
                  <p><span className="font-medium">Précision:</span> ±{Math.round(currentLocation.accuracy)}m</p>
                  <button 
                    onClick={() => {
                      if (currentLocation) {
                        navigator.clipboard.writeText(`${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`)
                        toast.success('Coordonnées copiées dans le presse-papier')
                      }
                    }}
                    className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                  >
                    Copier les coordonnées
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Position non disponible</p>
              )}
            </div>

            {/* Historique des positions */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Map className="h-4 w-4 text-green-600" />
                <span className="font-medium text-gray-900">Historique (10 dernières positions)</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {locationHistory.map((pos, index) => (
                  <div key={index} className="text-xs text-gray-600 flex justify-between">
                    <span>{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</span>
                    <span>{pos.timestamp.toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Carte simulée améliorée */}
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg h-80 flex items-center justify-center relative overflow-hidden border border-gray-200">
            {/* Grille de fond */}
            <div className="absolute inset-0 opacity-20">
              <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div key={i} className="border border-gray-300"></div>
                ))}
              </div>
            </div>

            {/* Bureaux */}
            {offices.map((office, index) => {
              const status = getOfficeStatus(office)
              return (
                <div 
                  key={office.id}
                  className={`absolute ${index === 0 ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' : 'top-1/4 right-1/4'}`}
                >
                  <div className="relative">
                    {/* Rayon de pointage */}
                    <div 
                      className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed rounded-full opacity-50 ${
                        status.status === 'inside' ? 'border-green-400' : 'border-blue-400'
                      }`}
                      style={{ 
                        width: `${Math.min(office.radius / 2, 120)}px`, 
                        height: `${Math.min(office.radius / 2, 120)}px` 
                      }}
                    ></div>
                    
                    {/* Bureau */}
                    <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg relative z-10 ${
                      office.is_active ? 'bg-blue-600' : 'bg-gray-400'
                    }`}>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow-sm whitespace-nowrap">
                        {office.name}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Position actuelle */}
            {currentLocation && (
              <div className="absolute top-1/3 left-2/3">
                <div className="relative">
                  {/* Cercle de précision */}
                  <div 
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-blue-300 rounded-full opacity-30 bg-blue-100"
                    style={{ 
                      width: `${Math.min(currentLocation.accuracy / 5, 60)}px`, 
                      height: `${Math.min(currentLocation.accuracy / 5, 60)}px` 
                    }}
                  ></div>
                  
                  {/* Position */}
                  <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse relative z-10">
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-1 py-0.5 rounded text-xs whitespace-nowrap">
                      Vous
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Légende */}
            <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 p-2 rounded text-xs">
              <div className="flex items-center space-x-1 mb-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Bureau</span>
              </div>
              <div className="flex items-center space-x-1 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Votre position</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 border border-blue-400 border-dashed rounded-full"></div>
                <span>Zone autorisée</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status des bureaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offices.map((office) => {
          const status = getOfficeStatus(office)
          return (
            <div key={office.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${office.is_active ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <MapPin className={`h-5 w-5 ${office.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{office.name}</h3>
                    <p className="text-xs text-gray-500">{office.address}</p>
                  </div>
                </div>
                {permissions.canManageCompanySettings && (
                  <button
                    onClick={() => setSelectedOffice(office)}
                    className="text-gray-400 hover:text-blue-600"
                  >
                    <Target className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className={`p-2 rounded-lg border ${
                  status.status === 'inside' 
                    ? 'bg-green-50 border-green-200' 
                    : status.status === 'outside'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {status.status === 'inside' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : status.status === 'outside' ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Target className="h-4 w-4 text-gray-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      status.status === 'inside' ? 'text-green-800' :
                      status.status === 'outside' ? 'text-red-800' : 'text-gray-600'
                    }`}>
                      {status.message}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Rayon autorisé: {office.radius}m</p>
                  <p>Fuseau horaire: {office.timezone}</p>
                  <p>Statut: {office.is_active ? 'Actif' : 'Inactif'}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Configuration bureau (Admin seulement) */}
      {permissions.canManageCompanySettings && selectedOffice && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Configuration - {selectedOffice.name}
            </h3>
            <button
              onClick={() => setSelectedOffice(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du bureau
                </label>
                <input
                  type="text"
                  value={selectedOffice.name}
                  onChange={(e) => setSelectedOffice({...selectedOffice, name: e.target.value})}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <textarea
                  rows={2}
                  value={selectedOffice.address}
                  onChange={(e) => setSelectedOffice({...selectedOffice, address: e.target.value})}
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
                    value={selectedOffice.latitude}
                    onChange={(e) => setSelectedOffice({...selectedOffice, latitude: parseFloat(e.target.value)})}
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
                    value={selectedOffice.longitude}
                    onChange={(e) => setSelectedOffice({...selectedOffice, longitude: parseFloat(e.target.value)})}
                    className="input-field"
                  />
                </div>
              </div>
              
              <button
                onClick={useCurrentLocationForOffice}
                disabled={!currentLocation || loading}
                className="btn-secondary w-full"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {loading ? 'Mise à jour...' : 'Utiliser ma position actuelle'}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rayon autorisé (mètres)
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={selectedOffice.radius}
                  onChange={(e) => setSelectedOffice({...selectedOffice, radius: parseInt(e.target.value)})}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fuseau horaire
                </label>
                <select 
                  value={selectedOffice.timezone} 
                  onChange={(e) => setSelectedOffice({...selectedOffice, timezone: e.target.value})}
                  className="input-field"
                >
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedOffice.is_active}
                  onChange={(e) => setSelectedOffice({...selectedOffice, is_active: e.target.checked})}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Bureau actif
                </label>
              </div>

              <div className="pt-4">
                <button 
                  onClick={async () => {
                    setLoading(true)
                    try {
                      await adminService.updateOffice(selectedOffice.id, selectedOffice)
                      // Mettre à jour la liste des bureaux
                      setOffices(prev => prev.map(office => 
                        office.id === selectedOffice.id ? selectedOffice : office
                      ))
                      toast.success('Bureau mis à jour avec succès')
                      setSelectedOffice(null)
                    } catch (error) {
                      console.error('Erreur lors de la mise à jour du bureau:', error)
                      toast.error('Erreur lors de la mise à jour du bureau')
                    } finally {
                      setLoading(false)
                    }
                  }}
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
                      Sauvegarder les modifications
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}