import React, { useState, useEffect } from 'react'
import { MapPin, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import CheckInGuidance from './CheckInGuidance'
import CheckInZoneMap from './CheckInZoneMap'
import { useGeofencingContext } from '../../hooks/useGeofencingContext'

interface Coordinates {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  heading?: number
  speed?: number
}

interface Coordinates {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  heading?: number
  speed?: number
}

interface Props {
  onCheckIn: (coordinates: Coordinates) => void
  onCancel: () => void
  loading: boolean
}

export default function GeoCheck({ onCheckIn, onCancel, loading }: Props) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const {
    context: geofencingContext,
    loading: geofencingLoading,
    error: geofencingError,
  } = useGeofencingContext()

  useEffect(() => {
    const getLocation = () => {
      if (!navigator.geolocation) {
        setGeoError("La géolocalisation n'est pas supportée par votre navigateur.")
        setLoadingLocation(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextCoordinates: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }

          if (position.coords.altitude != null) {
            nextCoordinates.altitude = position.coords.altitude
          }
          if (position.coords.heading != null) {
            nextCoordinates.heading = position.coords.heading
          }
          if (position.coords.speed != null) {
            nextCoordinates.speed = position.coords.speed
          }

          setCoordinates(nextCoordinates)
          setLoadingLocation(false)
        },
        (error) => {
          let errorMessage = "Impossible d'obtenir votre position."
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Veuillez autoriser l'accès à votre position pour continuer."
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Votre position est actuellement indisponible."
              break
            case error.TIMEOUT:
              errorMessage = "Délai d'attente dépassé pour obtenir votre position."
              break
          }
          
          setGeoError(errorMessage)
          setLoadingLocation(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    }

    getLocation()
  }, [])

  const handleCheckIn = () => {
    if (coordinates) {
      onCheckIn(coordinates)
    } else {
      toast.error("Position non disponible")
    }
  }

  return (
    <div className="text-center py-4">
      <div className="h-16 w-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <MapPin className="h-8 w-8 text-blue-600" />
      </div>

      <h3 className="text-lg font-medium mb-2">
        Pointage par géolocalisation
      </h3>

      <CheckInGuidance className="mb-4 text-left" />
      <CheckInZoneMap
        context={geofencingContext}
        loading={geofencingLoading}
        error={geofencingError}
        mode="office"
        className="mb-6"
      />

      {loadingLocation ? (
        <div className="flex flex-col items-center justify-center my-6">
          <Loader className="animate-spin h-8 w-8 text-blue-500 mb-2" />
          <p className="text-gray-600">Obtention de votre position...</p>
        </div>
      ) : geoError ? (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md my-4">
          <p>{geoError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-blue-600 mt-2 font-medium"
          >
            Réessayer
          </button>
        </div>
      ) : coordinates ? (
        <>
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md my-4">
            <p>Position obtenue avec succès!</p>
            <p className="text-xs mt-1 text-gray-600">
              Lat: {coordinates.latitude.toFixed(6)}, Long: {coordinates.longitude.toFixed(6)}
            </p>
            <p className="text-xs mt-1 text-gray-600">
              Précision: ~{Math.round(coordinates.accuracy)} m
            </p>
          </div>
          
          <div className="mt-6 space-x-3">
            <button 
              onClick={handleCheckIn}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Pointage en cours...
                </>
              ) : 'Pointer maintenant'}
            </button>
            <button 
              onClick={onCancel}
              className="btn-secondary"
              disabled={loading}
            >
              Annuler
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
