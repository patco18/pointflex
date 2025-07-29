import React, { useState, useRef, useEffect } from 'react'
import { QrCode, Camera, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  onScan: (data: string) => void
  onCancel: () => void
  loading: boolean
}

export default function QrScanner({ onScan, onCancel, loading }: Props) {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null)
  const [scanActive, setScanActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanInterval, setScanIntervalState] = useState<number | null>(null)

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
      if (scanInterval) {
        clearInterval(scanInterval)
      }
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        videoRef.current.srcObject = stream
        setScanActive(true)
        startScanning()
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation de la caméra:', error)
      toast.error('Impossible d\'accéder à la caméra')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setScanActive(false)
    if (scanInterval) {
      clearInterval(scanInterval)
      setScanIntervalState(null)
    }
  }

  const startScanning = () => {
    if (scanInterval) {
      clearInterval(scanInterval)
    }
    
    // Cette fonction serait idéalement remplacée par une bibliothèque de scan QR comme jsQR
    // Ce code est une implémentation simplifiée pour démonstration
    const interval = window.setInterval(() => {
      try {
        captureFrame()
      } catch (error) {
        console.error('Erreur lors du scan:', error)
      }
    }, 500) as unknown as number
    
    setScanIntervalState(interval)
  }

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current
      const video = videoRef.current
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Dans une implémentation réelle, on utiliserait une bibliothèque comme jsQR ici
      // pour analyser l'image et détecter un code QR
      // Pour ce prototype, on simule une détection après quelques secondes
      setTimeout(() => {
        if (Math.random() > 0.7 && scanActive) { // Simulation de détection
          const fakeQrData = `OFFICE-${Math.floor(Math.random() * 1000)}`
          handleQrDetected(fakeQrData)
        }
      }, 3000)
    }
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
            <video 
              ref={videoRef}
              className="w-full h-auto rounded-lg border-2 border-purple-300"
              autoPlay 
              playsInline
            ></video>
            <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none"></div>
            <canvas ref={canvasRef} className="hidden"></canvas>
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
