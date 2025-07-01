import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export function useApi<T>(apiCall: () => Promise<{ data: T }>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiCall()
      setData(response.data)
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors du chargement'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, deps)

  return { data, loading, error, refetch }
}

export function useAsyncAction() {
  const [loading, setLoading] = useState(false)

  const execute = async (action: () => Promise<void>, successMessage?: string) => {
    try {
      setLoading(true)
      await action()
      if (successMessage) toast.success(successMessage)
    } catch (error: any) {
      const message = error.response?.data?.message || 'Une erreur est survenue'
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { loading, execute }
}