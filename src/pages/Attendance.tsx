import React, { useState } from 'react'
import { attendanceService } from '../services/api'
import { toast } from 'react-hot-toast'
import { Coffee, LogOut, Loader } from 'lucide-react'
import Card from '../components/ui/card'
import Button from '../components/ui/button'
import CheckInComponent from '../components/attendance/CheckIn'

export default function Attendance() {
  const [onBreak, setOnBreak] = useState(false)
  const [loadingPause, setLoadingPause] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)

  const startPause = async () => {
    setLoadingPause(true)
    try {
      await attendanceService.startPause()
      setOnBreak(true)
      toast.success('Pause démarrée avec succès!')
    } catch (err) {
      toast.error("Erreur lors du démarrage de la pause")
    } finally {
      setLoadingPause(false)
    }
  }

  const endPause = async () => {
    setLoadingPause(true)
    try {
      await attendanceService.endPause()
      setOnBreak(false)
      toast.success('Pause terminée avec succès!')
    } catch (err) {
      toast.error("Erreur lors de la fin de la pause")
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
        <Card className="text-center">
          <div className="mb-4 flex justify-center">
            <Coffee className="h-8 w-8 text-yellow-600" />
          </div>
          {onBreak ? (
            <Button onClick={endPause} disabled={loadingPause}>
              {loadingPause ? <Loader className="animate-spin h-4 w-4" /> : 'Terminer la pause'}
            </Button>
          ) : (
            <Button onClick={startPause} disabled={loadingPause}>
              {loadingPause ? <Loader className="animate-spin h-4 w-4" /> : 'Démarrer une pause'}
            </Button>
          )}
        </Card>

        <Card className="text-center">
          <div className="mb-4 flex justify-center">
            <LogOut className="h-8 w-8 text-red-600" />
          </div>
          <Button onClick={checkout} disabled={loadingCheckout}>
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
          </Button>
        </Card>
      </div>
    </div>
  )
}
