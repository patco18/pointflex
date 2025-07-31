import React, { useState } from 'react'
import { attendanceService } from '../../services/api'
import { MapPin, QrCode, WifiOff, Smartphone } from 'lucide-react'
import QrScanner from './QrScanner'
import GeoCheck from './GeoCheck'
import toast from 'react-hot-toast'

export default function CheckInMethods() {
  const [activeMethod, setActiveMethod] = useState<'geo' | 'qr' | 'nfc' | 'offline' | null>(null)
  const [loading, setLoading] = useState(false)
  
  const handleGeoCheckIn = async (coordinates: {latitude: number, longitude: number}) => {
    setLoading(true)
    try {
      const { data } = await attendanceService.checkInOffice(coordinates)
      toast.success(data.message || 'Pointage réussi')
      window.location.reload()
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      }
    } finally {
      setLoading(false)
    }
  }
  
  const handleQrCheckIn = () => {
    // Redirection vers la page de scan QR dédiée
    window.location.href = '/attendance/qr-scanner';
  }
  
  const handleOfflineCheckIn = () => {
    // Enregistrer le pointage localement
    const timestamp = new Date().toISOString()
    localStorage.setItem('offline_checkin', timestamp)
    toast.success('Pointage hors-ligne enregistré. Sera synchronisé automatiquement.')
    setActiveMethod(null)
    window.location.reload()
  }
  
  return (
    <div className="card p-6">
      <h3 className="text-lg font-medium mb-4">
        Comment souhaitez-vous pointer aujourd'hui ?
      </h3>
      
      {activeMethod === null ? (
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setActiveMethod('geo')}
            className="p-4 border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-50"
          >
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <span className="font-medium">Géolocalisation</span>
            <span className="text-xs text-gray-500">Pointage par position GPS</span>
          </button>
          
          <button 
            onClick={() => setActiveMethod('qr')}
            className="p-4 border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-50"
          >
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <QrCode className="h-6 w-6 text-purple-600" />
            </div>
            <span className="font-medium">Scanner QR</span>
            <span className="text-xs text-gray-500">Scanner le code du bureau</span>
          </button>
          
          <button 
            onClick={() => setActiveMethod('nfc')}
            className="p-4 border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-50"
            disabled={!('NDEFReader' in window)}
          >
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-green-600" />
            </div>
            <span className="font-medium">NFC</span>
            <span className="text-xs text-gray-500">
              {('NDEFReader' in window) ? 'Approcher du tag NFC' : 'Non disponible'}
            </span>
          </button>
          
          <button 
            onClick={() => setActiveMethod('offline')}
            className="p-4 border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-50"
          >
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <WifiOff className="h-6 w-6 text-red-600" />
            </div>
            <span className="font-medium">Hors ligne</span>
            <span className="text-xs text-gray-500">Sans connexion internet</span>
          </button>
        </div>
      ) : activeMethod === 'geo' ? (
        <GeoCheck onCheckIn={handleGeoCheckIn} onCancel={() => setActiveMethod(null)} loading={loading} />
      ) : activeMethod === 'qr' ? (
        <div className="text-center py-6">
          <p className="mb-4 text-gray-600">
            Vous allez être redirigé vers la page de scan du QR code.
          </p>
          <div className="space-x-4">
            <button 
              onClick={handleQrCheckIn}
              className="btn-primary"
              disabled={loading}
            >
              Aller au scanner QR
            </button>
            <button 
              onClick={() => setActiveMethod(null)}
              className="btn-secondary"
              disabled={loading}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : activeMethod === 'offline' ? (
        <div className="text-center py-6">
          <p className="mb-4 text-gray-600">
            Le pointage hors-ligne sera enregistré sur votre appareil et synchronisé dès que la connexion sera rétablie.
          </p>
          <div className="space-x-4">
            <button 
              onClick={handleOfflineCheckIn}
              className="btn-primary"
              disabled={loading}
            >
              Confirmer le pointage hors-ligne
            </button>
            <button 
              onClick={() => setActiveMethod(null)}
              className="btn-secondary"
              disabled={loading}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
