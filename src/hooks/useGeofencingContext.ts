import { useCallback, useEffect, useState } from 'react'
import { attendanceService } from '../services/api'
import { GeofencingContext } from '../types/geofencing'

interface GeofencingState {
  context: GeofencingContext | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useGeofencingContext(): GeofencingState {
  const [context, setContext] = useState<GeofencingContext | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContext = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await attendanceService.getGeofencingContext()
      setContext(response.data.context)
    } catch (err) {
      console.error('Erreur lors du chargement du contexte de géofencing:', err)
      setError("Impossible de charger les zones de pointage")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContext()
  }, [fetchContext])

  return { context, loading, error, refresh: fetchContext }
}
