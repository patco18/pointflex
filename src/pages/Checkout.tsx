import React, { useState } from 'react'
import { attendanceService } from '../services/api'
import { LogOut, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Checkout() {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)
    try {
      await attendanceService.checkout()
      toast.success('Sortie enregistrée avec succès!')
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement de la sortie')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sortie</h1>
        <p className="text-gray-600">Enregistrez votre départ de la journée</p>
      </div>
      <div className="card text-center">
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
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
  )
}
