import React, { useEffect, useRef, useState } from 'react'
import { MapPin, Clock, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

import CheckInGuidance from '../components/attendance/CheckInGuidance'
import CheckInZoneMap from '../components/attendance/CheckInZoneMap'
import { useGeofencingContext } from '../hooks/useGeofencingContext'
import { attendanceService } from '../services/api'
import { watchPositionUntilAccurate } from '../utils/geolocation'

interface Coordinates {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  heading?: number
  speed?: number
}

export default function CheckIn() {
  const [activeTab, setActiveTab] = useState<'office' | 'mission'>('office')
  const [loading, setLoading] = useState(false)
  const [missionOrderNumber, setMissionOrderNumber] = useState('')
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null)
  const [searchingPosition, setSearchingPosition] = useState(false)
  const isMountedRef = useRef(true)

  const {
    context: geofencingContext,
    loading: geofencingLoading,
    error: geofencingError,
  } = useGeofencingContext()


  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const getPrecisePosition = async () => {
    if (!isMountedRef.current) {
      throw new Error('Composant démonté')
    }


    setSearchingPosition(true)
    setCurrentAccuracy(null)

    try {
      return await watchPositionUntilAccurate({
        onUpdate: (pos) => {
          if (!isMountedRef.current) return
          setCurrentAccuracy(Math.round(pos.coords.accuracy))
        }
      })
    } finally {
      if (isMountedRef.current) {
        setSearchingPosition(false)
      }
    }
  }

  const handleOfficeCheckIn = async () => {
    setLoading(true)

    try {
      const position = await getPrecisePosition()

      const coordinates: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      }

      if (position.coords.altitude != null) {
        coordinates.altitude = position.coords.altitude
      }
      if (position.coords.heading != null) {
        coordinates.heading = position.coords.heading
      }
      if (position.coords.speed != null) {
        coordinates.speed = position.coords.speed
      }

      const { data } = await attendanceService.checkInOffice(coordinates)
      const respMessage = data?.message || 'Pointage bureau enregistré avec succès!'
      if (data?.pointage?.statut === 'retard') {
        const delay = data.pointage.delay_minutes || 0
        toast.success(`${respMessage} Vous êtes en retard de ${delay} min.`)
      } else {
        toast.success(respMessage)
      }
    } catch (error: any) {
      if (error.message.includes('Géolocalisation')) {
        toast.error("Veuillez autoriser l'accès à votre position")
      } else if (error.response?.data?.message) {
        // Afficher le message d'erreur retourné par l'API (ex: trop loin du bureau)
        toast.error(error.response.data.message)
      }
      // les autres erreurs sont gérées par l'intercepteur API
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        setCurrentAccuracy(null)
      }
    }
  }

  const handleMissionCheckIn = async () => {
    if (!missionOrderNumber.trim()) {
      toast.error("Veuillez saisir le numéro d'ordre de mission")
      return
    }

    setLoading(true)

    try {
      const position = await getPrecisePosition()

      const coordinates: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      }

      if (position.coords.altitude != null) {
        coordinates.altitude = position.coords.altitude
      }
      if (position.coords.heading != null) {
        coordinates.heading = position.coords.heading
      }
      if (position.coords.speed != null) {
        coordinates.speed = position.coords.speed
      }

      const { data } = await attendanceService.checkInMission(
        missionOrderNumber.trim(),
        coordinates
      )
      const respMessage = data?.message || 'Pointage mission enregistré avec succès!'
      if (data?.pointage?.statut === 'retard') {
        const delay = data.pointage.delay_minutes || 0
        toast.success(`${respMessage} Vous êtes en retard de ${delay} min.`)
      } else {
        toast.success(respMessage)
      }
      setMissionOrderNumber('')
    } catch (error: any) {
      if (error.message.includes('Géolocalisation')) {
        toast.error("Veuillez autoriser l'accès à votre position")
      } else if (error.response?.data?.message) {
        // Afficher le message d'erreur retourné par l'API (ex: mission non autorisée)
        toast.error(error.response.data.message)
      }
      // autres erreurs gérées par l'intercepteur API
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        setCurrentAccuracy(null)
      }
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

            {searchingPosition && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4 text-sm">
                Obtention d'une position précise...
                {currentAccuracy !== null && (
                  <div className="mt-2 text-blue-800">
                    Précision actuelle : <span className="font-semibold">~{currentAccuracy} m</span>
                  </div>
                )}
                <div className="mt-1 text-xs text-blue-600">
                  Restez immobile et assurez-vous que le GPS haute précision est activé.
                </div>
              </div>
            )}
            <button
              onClick={handleOfficeCheckIn}
              disabled={loading}
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

            <CheckInGuidance className="mb-4 text-left" />
            <CheckInZoneMap
              context={geofencingContext}
              loading={geofencingLoading}
              error={geofencingError}
              mode="mission"
              missionOrderNumber={missionOrderNumber.trim() || undefined}
              className="mb-6"
            />

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
                placeholder="Ex: M2024-001"
              />
            </div>

            {searchingPosition && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4 text-sm">
                Obtention d'une position précise...
                {currentAccuracy !== null && (
                  <div className="mt-2 text-blue-800">
                    Précision actuelle : <span className="font-semibold">~{currentAccuracy} m</span>
                  </div>
                )}
                <div className="mt-1 text-xs text-blue-600">
                  Restez immobile et assurez-vous que le GPS haute précision est activé.
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