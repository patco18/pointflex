import { useState } from 'react'
import CheckInComponent from '../components/CheckIn'
import { attendanceService } from '../services/api'
import { Coffee, LogOut, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AttendancePage() {
  const [onBreak, setOnBreak] = useState(false)
  const [loadingPause, setLoadingPause] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)

  const startPause = async () => {
    setLoadingPause(true)
    try {
      await attendanceService.startPause()
      toast.success('Pause démarrée')
      setOnBreak(true)
    } catch (err) {
      toast.error('Erreur lors du démarrage de la pause')
    } finally {
      setLoadingPause(false)
    }
  }

  const endPause = async () => {
    setLoadingPause(true)
    try {
      await attendanceService.endPause()
      toast.success('Pause terminée')
      setOnBreak(false)
    } catch (err) {
      toast.error('Erreur lors de la fin de la pause')
    } finally {
      setLoadingPause(false)
    }
  }

  const checkout = async () => {
    setLoadingCheckout(true)
    try {
      await attendanceService.checkout()
      toast.success('Sortie enregistrée avec succès!')
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement de la sortie")
    } finally {
      setLoadingCheckout(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <CheckInComponent />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card text-center">
          <div className="mb-4 flex justify-center">
            <Coffee className="h-8 w-8 text-yellow-600" />
          </div>
          {onBreak ? (
            <button onClick={endPause} disabled={loadingPause} className="btn-primary">
              {loadingPause ? <Loader className="animate-spin h-4 w-4" /> : 'Terminer la pause'}
            </button>
          ) : (
            <button onClick={startPause} disabled={loadingPause} className="btn-primary">
              {loadingPause ? <Loader className="animate-spin h-4 w-4" /> : 'Démarrer une pause'}
            </button>
          )}
        </div>

        <div className="card text-center">
          <div className="mb-4 flex justify-center">
            <LogOut className="h-8 w-8 text-red-600" />
          </div>
          <button onClick={checkout} disabled={loadingCheckout} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {loadingCheckout ? (
              <div className="flex items-center justify-center">
                <Loader className="animate-spin h-5 w-5 mr-2" />
                Sortie en cours...
              </div>
            ) : (
              <>
                <LogOut className="inline-block h-5 w-5 mr-2" />
                Enregistrer ma sortie
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
