import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Crosshair, Loader, MapPin, Target } from 'lucide-react'
import { GeofencingContext, MissionGeofence, OfficeGeofence } from '../../types/geofencing'

interface CheckInZoneMapProps {
  context: GeofencingContext | null
  loading: boolean
  error?: string | null
  mode: 'office' | 'mission'
  missionOrderNumber?: string
  className?: string
}

interface CurrentLocation {
  lat: number
  lng: number
  accuracy: number | null
}

interface ZoneInfo {
  label: string
  type: 'office' | 'mission' | 'fallback'
  latitude: number
  longitude: number
  radius: number | null
  geolocationAccuracy: number | null
  extraLabel?: string | null
}

const formatDistance = (distance: number | null) => {
  if (distance === null) {
    return 'distance inconnue'
  }
  if (distance < 1000) {
    return `${Math.round(distance)} m`
  }
  return `${(distance / 1000).toFixed(2)} km`
}

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function findNearestOffice(offices: OfficeGeofence[], location: CurrentLocation | null): OfficeGeofence | null {
  if (!offices.length) {
    return null
  }

  const filtered = offices.filter(
    (office) => office.latitude !== null && office.longitude !== null,
  )

  if (!filtered.length) {
    return null
  }

  if (!location) {
    return filtered[0]
  }

  let nearest = filtered[0]
  let minDistance = calculateDistance(
    location.lat,
    location.lng,
    filtered[0].latitude as number,
    filtered[0].longitude as number,
  )

  for (const office of filtered.slice(1)) {
    const distance = calculateDistance(
      location.lat,
      location.lng,
      office.latitude as number,
      office.longitude as number,
    )
    if (distance < minDistance) {
      nearest = office
      minDistance = distance
    }
  }

  return nearest
}

function getMissionZone(missions: MissionGeofence[], missionOrderNumber?: string): MissionGeofence | null {
  if (!missionOrderNumber) {
    return null
  }
  return missions.find((mission) => mission.order_number === missionOrderNumber) || null
}

export default function CheckInZoneMap({
  context,
  loading,
  error,
  mode,
  missionOrderNumber,
  className = '',
}: CheckInZoneMapProps) {
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoError('Géolocalisation non supportée par ce navigateur')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
        })
        setGeoError(null)
      },
      () => {
        setGeoError('Impossible d\'actualiser votre position en temps réel')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    )

    return () => {
      if (typeof watchId === 'number') {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [])

  const zoneInfo = useMemo<{
    zone: ZoneInfo | null
    missingMessage: string | null
  }>(() => {
    if (!context) {
      return { zone: null, missingMessage: null }
    }

    if (mode === 'mission') {
      const mission = getMissionZone(context.missions, missionOrderNumber)
      if (!mission) {
        return { zone: null, missingMessage: missionOrderNumber ? 'Mission introuvable ou non assignée.' : 'Sélectionnez une mission pour visualiser sa zone.' }
      }

      if (mission.latitude == null || mission.longitude == null || mission.radius == null) {
        return {
          zone: null,
          missingMessage: 'Cette mission ne dispose pas de coordonnées complètes. Contactez votre administrateur.',
        }
      }

      return {
        zone: {
          label: mission.title || `Mission ${mission.order_number}`,
          extraLabel: mission.order_number,
          latitude: mission.latitude,
          longitude: mission.longitude,
          radius: mission.radius,
          geolocationAccuracy: mission.geolocation_max_accuracy ?? null,
          type: 'mission',
        },
        missingMessage: null,
      }
    }

    const office = findNearestOffice(context.offices, currentLocation)
    if (office) {
      return {
        zone: {
          label: office.name,
          latitude: office.latitude as number,
          longitude: office.longitude as number,
          radius: office.radius,
          geolocationAccuracy: office.geolocation_max_accuracy ?? null,
          type: 'office',
        },
        missingMessage: null,
      }
    }

    if (context.fallback) {
      return {
        zone: {
          label: 'Zone bureau principale',
          latitude: context.fallback.latitude,
          longitude: context.fallback.longitude,
          radius: context.fallback.radius,
          geolocationAccuracy: context.fallback.geolocation_max_accuracy ?? null,
          type: 'fallback',
        },
        missingMessage: null,
      }
    }

    return {
      zone: null,
      missingMessage: "Aucune zone de pointage n'a été configurée pour votre entreprise.",
    }
  }, [context, currentLocation, missionOrderNumber, mode])

  const zone = zoneInfo.zone

  const distance = useMemo(() => {
    if (!zone || !currentLocation) {
      return null
    }
    return calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      zone.latitude,
      zone.longitude,
    )
  }, [currentLocation, zone])

  const isInside = useMemo(() => {
    if (!zone || zone.radius == null || distance === null) {
      return null
    }
    return distance <= zone.radius
  }, [distance, zone])

  const accuracyChip = currentLocation?.accuracy != null
    ? `Précision actuelle ~${Math.round(currentLocation.accuracy)} m`
    : null

  if (loading) {
    return (
      <div className={`border border-gray-200 rounded-lg bg-white p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
          Chargement des zones de pointage...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700 ${className}`}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error}
        </div>
      </div>
    )
  }

  if (!zone) {
    return (
      <div className={`border border-gray-200 bg-white rounded-lg p-4 text-sm text-gray-600 ${className}`}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-gray-500" aria-hidden="true" />
          {zoneInfo.missingMessage || 'Aucune zone disponible.'}
        </div>
      </div>
    )
  }

  const radiusVisual = zone.radius ? Math.max(Math.min(zone.radius / 2, 140), 60) : 80
  const userIndicatorPosition = isInside === null || isInside
    ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
    : 'top-6 right-6'

  return (
    <div className={`border border-gray-200 rounded-lg bg-white p-4 space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {zone.type === 'mission' ? zone.label : `Zone autorisée : ${zone.label}`}
          </p>
          <p className="text-xs text-gray-500">
            {zone.type === 'mission' ? 'Périmètre de mission' : 'Zone de pointage bureau'}
            {zone.type === 'mission' && zone.extraLabel ? ` • ${zone.extraLabel}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isInside !== null && zone.radius !== null && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              isInside ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isInside ? 'Vous êtes dans la zone' : 'Hors zone autorisée'}
            </span>
          )}
          {accuracyChip && (
            <span className="text-[11px] text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
              {accuracyChip}
            </span>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg h-48 relative overflow-hidden border border-gray-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {zone.radius !== null && (
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-blue-400 border-dashed rounded-full opacity-60"
                style={{ width: `${radiusVisual}px`, height: `${radiusVisual}px` }}
              ></div>
            )}
            <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg relative z-10">
              <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-white px-2 py-0.5 rounded text-[11px] font-medium shadow-sm whitespace-nowrap text-gray-800">
                {zone.type === 'mission' ? 'Mission' : 'Bureau'}
              </div>
            </div>
          </div>
        </div>
        {currentLocation && (
          <div className={`absolute ${userIndicatorPosition}`}>
            <div className={`w-3 h-3 ${isInside === false ? 'bg-red-500' : 'bg-green-500'} rounded-full border-2 border-white shadow-lg animate-pulse relative`}>
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-1.5 py-0.5 rounded text-[11px] whitespace-nowrap">
                Vous
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <div>
            <p className="font-medium text-gray-800">Distance estimée</p>
            <p className="text-xs text-gray-500">{formatDistance(distance)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <div>
            <p className="font-medium text-gray-800">Rayon autorisé</p>
            <p className="text-xs text-gray-500">{zone.radius ? `${Math.round(zone.radius)} m` : 'Non défini'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <div>
            <p className="font-medium text-gray-800">Précision requise</p>
            <p className="text-xs text-gray-500">
              {zone.geolocationAccuracy ? `≤ ${Math.round(zone.geolocationAccuracy)} m` : 'Selon paramètres globaux'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <div>
            <p className="font-medium text-gray-800">Statut localisation</p>
            <p className="text-xs text-gray-500">
              {geoError ? geoError : 'Actualisation automatique activée'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
