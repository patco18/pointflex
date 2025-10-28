import React, { useEffect, useRef, useState } from 'react'
import { attendanceService, missionService } from '../../services/api'
import { Briefcase, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { watchPositionUntilAccurate } from '../../utils/geolocation'

interface Mission {
  id: number
  order_number: string
  status: string
}

export default function MissionCheckIn() {
  const [loading, setLoading] = useState(false)
  const [missionOrderNumber, setMissionOrderNumber] = useState('')
  const [missions, setMissions] = useState<Mission[]>([])
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null)
  const [searchingPosition, setSearchingPosition] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    const loadMissions = async () => {
      try {
        const resp = await missionService.getActiveMissions()
        setMissions(resp.data.missions || [])
      } catch (error) {
        toast.error('Erreur lors du chargement des missions')
      }
    }
    loadMissions()

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

  const handleMissionCheckIn = async () => {
    if (!missionOrderNumber.trim()) {
      toast.error('Veuillez sélectionner une mission')
      return
    }

    const mission = missions.find(m => m.order_number === missionOrderNumber)
    if (!mission || mission.status !== 'accepted') {
      toast.error('Mission non acceptée')
      return
    }

    setLoading(true)
    try {
      const position = await getPrecisePosition()
      const coordinates: {
        latitude: number
        longitude: number
        accuracy: number
        altitude?: number
        heading?: number
        speed?: number
      } = {
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
        mission.order_number,
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

      // Rafraîchir la page après un court délai pour montrer le succès
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      if (error.message.includes('Géolocalisation')) {
        toast.error("Veuillez autoriser l'accès à votre position")
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        setCurrentAccuracy(null)
      }
    }
  }

  return (
    <div className="card">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <Briefcase className="h-8 w-8 text-purple-600" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Pointage Mission
        </h3>
        
        <p className="text-gray-600 mb-6">
          Sélectionnez la mission acceptée pour enregistrer votre pointage.
        </p>

        <div className="max-w-sm mx-auto mb-6">
          <label htmlFor="missionOrder" className="block text-sm font-medium text-gray-700 mb-2">
            Mission
          </label>
          <select
            id="missionOrder"
            value={missionOrderNumber}
            onChange={(e) => setMissionOrderNumber(e.target.value)}
            className="input-field"
          >
            <option value="">Sélectionnez une mission</option>
            {missions
              .filter(m => m.status === 'accepted')
              .map(m => (
                <option key={m.id} value={m.order_number}>{m.order_number}</option>
              ))}
          </select>
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
  )
}
