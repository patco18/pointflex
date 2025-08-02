import React, { useState, useEffect } from 'react'
import { attendanceService } from '../services/api'
import { MapPin, Clock, Loader, Navigation, Clipboard } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CheckIn() {
  const [activeTab, setActiveTab] = useState<'office' | 'mission'>('office')
  const [loading, setLoading] = useState(false)
  const [missionOrderNumber, setMissionOrderNumber] = useState('')
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number, accuracy: number} | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  // Obtenir la position actuelle au chargement du composant
  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée par votre navigateur')
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        
        // Validation des coordonnées
        if (isNaN(newLocation.latitude) || isNaN(newLocation.longitude) ||
            !isFinite(newLocation.latitude) || !isFinite(newLocation.longitude)) {
          toast.error('Coordonnées GPS invalides. Veuillez réessayer.')
          setLocationLoading(false)
          return
        }
        
        setCurrentLocation(newLocation)
        toast.success('Position actuelle récupérée avec succès')
        setLocationLoading(false)
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error)
        
        // Messages d'erreur plus précis selon le type d'erreur
        if (error.code === 1) {
          toast.error('Accès à la géolocalisation refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.')
        } else if (error.code === 2) {
          toast.error('Position indisponible. Vérifiez vos paramètres GPS.')
        } else if (error.code === 3) {
          toast.error('Délai de récupération de la position dépassé. Veuillez réessayer.')
        } else {
          toast.error('Impossible d\'obtenir votre position')
        }
        
        setLocationLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 20000, // Augmenter le timeout pour les appareils lents
        maximumAge: 30000 // Réduire pour plus de précision
      }
    )
  }

  const handleOfficeCheckIn = async () => {
    if (!currentLocation) {
      toast.error('Veuillez d\'abord obtenir votre position')
      return
    }

    setLoading(true)
    try {
      const response = await attendanceService.checkInOffice(currentLocation)
      if (response && response.data) {
        toast.success('Pointage bureau enregistré avec succès!')
      } else {
        toast.error('Réponse invalide du serveur')
      }
    } catch (error: any) {
      if (error.message?.includes('Géolocalisation')) {
        toast.error('Veuillez autoriser l\'accès à votre position')
      } else if (error.response?.status === 409) {
        toast.error('Vous avez déjà pointé aujourd\'hui')
      } else if (error.response?.status === 403) {
        // Message spécifique pour les erreurs de distance
        const errorMessage = error.response?.data?.message || 'Vous êtes trop loin du bureau';
        toast.error(errorMessage);
      } else if (error.response?.status === 400) {
        toast.error('Coordonnées GPS non valides');
      } else {
        toast.error('Erreur lors du pointage bureau')
        console.error('Détail de l\'erreur:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMissionCheckIn = async () => {
    if (!missionOrderNumber.trim()) {
      toast.error('Veuillez saisir le numéro d\'ordre de mission')
      return
    }

    setLoading(true)
    try {
      let response;
      // Inclure les coordonnées GPS si disponibles
      if (currentLocation) {
        response = await attendanceService.checkInMission(missionOrderNumber.trim(), currentLocation)
      } else {
        response = await attendanceService.checkInMission(missionOrderNumber.trim())
      }
      
      if (response && response.data) {
        toast.success('Pointage mission enregistré avec succès!')
        setMissionOrderNumber('')
      } else {
        toast.error('Réponse invalide du serveur')
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Mission non trouvée. Vérifiez le numéro d\'ordre.')
      } else if (error.response?.status === 409) {
        toast.error('Vous avez déjà pointé aujourd\'hui')
      } else {
        toast.error('Erreur lors du pointage mission')
        console.error('Détail de l\'erreur:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const copyCoordinates = () => {
    if (currentLocation) {
      const coordsText = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
      navigator.clipboard.writeText(coordsText)
      toast.success('Coordonnées copiées dans le presse-papier')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pointage</h1>
        <p className="text-gray-600">
          Enregistrez votre présence au bureau ou en mission
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('office')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'office'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MapPin className="inline-block w-4 h-4 mr-2" />
            Pointage Bureau
          </button>
          <button
            onClick={() => setActiveTab('mission')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mission'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="inline-block w-4 h-4 mr-2" />
            Pointage Mission
          </button>
        </nav>
      </div>

      {/* Office Check-in */}
      {activeTab === 'office' && (
        <div className="card">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Pointage Bureau
            </h3>
            <p className="text-gray-600 mb-6">
              Cliquez sur le bouton ci-dessous pour enregistrer votre arrivée au bureau.
              Votre position sera automatiquement détectée.
            </p>
            
            {/* Affichage de la position actuelle */}
            <div className="mb-6">
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="btn-secondary mb-4"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {locationLoading ? 'Récupération...' : 'Obtenir ma position actuelle'}
              </button>
              
              {currentLocation && (
                <div className="p-4 bg-gray-50 rounded-lg mx-auto max-w-sm">
                  <h4 className="font-medium text-gray-900 mb-2">Position actuelle</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>Latitude: {currentLocation.latitude.toFixed(6)}</p>
                    <p>Longitude: {currentLocation.longitude.toFixed(6)}</p>
                    <button 
                      onClick={copyCoordinates}
                      className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded flex items-center mx-auto"
                    >
                      <Clipboard className="h-3 w-3 mr-1" />
                      Copier les coordonnées
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleOfficeCheckIn}
              disabled={loading || !currentLocation}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Pointage en cours...
                </div>
              ) : (
                'Pointer au Bureau'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mission Check-in */}
      {activeTab === 'mission' && (
        <div className="card">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Pointage Mission
            </h3>
            <p className="text-gray-600 mb-6">
              Saisissez le numéro d'ordre de mission pour enregistrer votre pointage.
            </p>
            
            <div className="max-w-sm mx-auto mb-6">
              <label htmlFor="missionOrder" className="block text-sm font-medium text-gray-700 mb-2">
                Numéro d'ordre de mission
              </label>
              <input
                type="text"
                id="missionOrder"
                value={missionOrderNumber}
                onChange={(e) => setMissionOrderNumber(e.target.value)}
                className="input-field"
                placeholder="Ex: ABI2024-153"
              />
            </div>
            
            {/* Affichage de la position actuelle pour mission */}
            {currentLocation && (
              <div className="p-4 bg-gray-50 rounded-lg mx-auto max-w-sm mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Position actuelle</h4>
                  <span className="text-xs text-gray-500">(Optionnel pour mission)</span>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>Latitude: {currentLocation.latitude.toFixed(6)}</p>
                  <p>Longitude: {currentLocation.longitude.toFixed(6)}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleMissionCheckIn}
              disabled={loading || !missionOrderNumber.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Pointage en cours...
                </div>
              ) : (
                'Pointer en Mission'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Informations importantes
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Le pointage bureau nécessite l'autorisation de géolocalisation</li>
          <li>• Le pointage mission requiert un numéro d'ordre valide</li>
          <li>• Vos pointages sont automatiquement horodatés</li>
          <li>• En cas de problème, contactez votre administrateur</li>
        </ul>
      </div>
    </div>
  )
}