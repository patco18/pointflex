import React, { useState, useRef, useEffect } from 'react'
import { QrCode, Camera, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (data: string) => void
  onCancel: () => void
  loading: boolean
}

export default function QrScanner({ onScan, onCancel, loading }: Props) {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null)
  const [scanActive, setScanActive] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)

  // Vérifie si la caméra est disponible
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        setHasCamera(videoDevices.length > 0)
      } catch (error) {
        console.error('Erreur lors de la vérification de la caméra:', error)
        setHasCamera(false)
      }
    }

    checkCamera()
    
    // Nettoyage à la destruction du composant
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      if (scannerRef.current) {
        const html5QrCode = new Html5Qrcode(scannerRef.current.id)
        html5QrCodeRef.current = html5QrCode
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleQrDetected(decodedText)
          },
          (errorMessage) => {
            if (!errorMessage.includes('NotFoundException')) {
              console.warn('Erreur de décodage:', errorMessage)
            }
          }
        )
        setScanActive(true)
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation de la caméra:', error)
      toast.error('Impossible d\'accéder à la caméra')
    }
  }

  const stopCamera = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(err => {
        console.error('Erreur lors de l\'arrêt du scanner:', err)
      }).finally(() => {
        html5QrCodeRef.current?.clear()
        html5QrCodeRef.current = null
      })
    }
    setScanActive(false)
  }
  
  const handleQrDetected = (data: string) => {
    stopCamera()
    toast.success('QR Code détecté!')
    onScan(data)
  }

  if (hasCamera === null) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader className="animate-spin h-8 w-8 text-blue-500 mb-4" />
        <p>Vérification de la caméra...</p>
      </div>
    )
  }

  if (hasCamera === false) {
    return (
      <div className="text-center py-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md my-4">
          <p>Aucune caméra détectée sur votre appareil.</p>
        </div>
        <button 
          onClick={onCancel}
          className="btn-secondary mt-4"
        >
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="text-center py-4">
      <div className="h-16 w-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
        {scanActive ? 
          <Camera className="h-8 w-8 text-purple-600" /> : 
          <QrCode className="h-8 w-8 text-purple-600" />
        }
      </div>
      
      <h3 className="text-lg font-medium mb-2">
        Pointage par QR Code
      </h3>
      
      <p className="text-gray-600 mb-4">
        {scanActive 
          ? 'Scannez le code QR affiché dans votre bureau'
          : 'Activez la caméra pour scanner le code QR de votre bureau'
        }
      </p>
      
      <div className="relative max-w-sm mx-auto">
        {scanActive && (
          <>
            <div
              ref={scannerRef}
              id="qr-reader"
              className="w-full h-auto rounded-lg border-2 border-purple-300"
            ></div>
            <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none"></div>
          </>
        )}
      </div>
      
      <div className="mt-6 space-x-3">
        {!scanActive ? (
          <button 
            onClick={startCamera}
            className="btn-primary"
            disabled={loading}
          >
            Activer la caméra
          </button>
        ) : (
          <button 
            onClick={stopCamera}
            className="btn-secondary"
            disabled={loading}
          >
            Arrêter le scan
          </button>
        )}
        <button 
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Annuler
        </button>
      </div>
      
      {loading && (
        <div className="mt-4 flex items-center justify-center">
          <Loader className="animate-spin h-5 w-5 mr-2" />
          <span>Traitement en cours...</span>
        </div>
      )}
    </div>
  )
}
