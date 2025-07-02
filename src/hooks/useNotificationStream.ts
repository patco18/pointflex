import { useEffect } from 'react'
import toast from 'react-hot-toast'

interface NotificationData {
  id: number
  message: string
  [key: string]: any
}

export function useNotificationStream(userId?: number, onMessage?: (data: NotificationData) => void) {
  useEffect(() => {
    if (!userId) return

    const source = new EventSource(`/stream?channel=user_${userId}`)
    const handler = (event: MessageEvent) => {
      try {
        const data: NotificationData = JSON.parse(event.data)
        toast.success(data.message)
        onMessage && onMessage(data)
      } catch (e) {
        console.error('Failed to parse notification', e)
      }
    }

    source.addEventListener('notification', handler)

    return () => {
      source.close()
    }
  }, [userId, onMessage])
}
