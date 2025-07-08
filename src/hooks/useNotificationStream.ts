import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

interface NotificationData {
  id: number
  message: string
  [key: string]: any
}

export function useNotificationStream(userId?: number, onMessage?: (data: NotificationData) => void) {
  const onMessageRef = useRef<typeof onMessage>()

  // Keep the latest callback in a ref so that the EventSource doesn't need to
  // be re-created on each render
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!userId) return

    const source = new EventSource(`/stream?channel=user_${userId}`)
    const handler = (event: MessageEvent) => {
      try {
        const data: NotificationData = JSON.parse(event.data)
        toast.success(data.message)
        onMessageRef.current && onMessageRef.current(data)
      } catch (e) {
        console.error('Failed to parse notification', e)
      }
    }

    source.addEventListener('notification', handler)

    return () => {
      source.close()
    }
  }, [userId])
}
