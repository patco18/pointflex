import React, { useState } from 'react'
import { attendanceService } from '../../services/api'
import { Briefcase, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MissionCheckIn() {
  const [loading, setLoading] = useState(false)
  const [missionOrderNumber, setMissionOrderNumber] = useState('')

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    })
  }

  const handleMissionCheckIn = async () => {
    if (!missionOrderNumber.trim()) {
      toast.error("Veuillez saisir le numéro d'ordre de mission")
      return
    }

    setLoading(true)
    try {
      const position = await getCurrentLocation()
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
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
      setLoading(false)
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
            placeholder="Ex: M2024-001"
          />
        </div>
        
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
