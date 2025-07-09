import { useState } from 'react'
import { attendanceService } from '../services/api'
import { Coffee, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PausePage() {
  const [onBreak, setOnBreak] = useState(false)
  const [loading, setLoading] = useState(false)

  const start = async () => {
    setLoading(true)
    try {
      await attendanceService.startPause()
      toast.success('Pause démarrée')
      setOnBreak(true)
    } catch (err) {
      toast.error('Erreur lors du démarrage de la pause')
    } finally {
      setLoading(false)
    }
  }

  const end = async () => {
    setLoading(true)
    try {
      await attendanceService.endPause()
      toast.success('Pause terminée')
      setOnBreak(false)
    } catch (err) {
      toast.error('Erreur lors de la fin de la pause')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="card text-center">
        <div className="mb-4 flex justify-center">
          <Coffee className="h-8 w-8 text-yellow-600" />
        </div>
        {onBreak ? (
          <button onClick={end} disabled={loading} className="btn-primary">
            {loading ? <Loader className="animate-spin h-4 w-4" /> : 'Terminer la pause'}
          </button>
        ) : (
          <button onClick={start} disabled={loading} className="btn-primary">
            {loading ? <Loader className="animate-spin h-4 w-4" /> : 'Démarrer une pause'}
          </button>
        )}
      </div>
    </div>
  )
}

