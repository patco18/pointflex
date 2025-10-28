export interface PrecisePositionOptions {
  desiredAccuracy?: number
  maxWait?: number
  onUpdate?: (position: GeolocationPosition) => void
}

const DEFAULT_ACCURACY = 25
const DEFAULT_MAX_WAIT = 15000

export function watchPositionUntilAccurate(options: PrecisePositionOptions = {}): Promise<GeolocationPosition> {
  const { desiredAccuracy = DEFAULT_ACCURACY, maxWait = DEFAULT_MAX_WAIT, onUpdate } = options

  return new Promise((resolve, reject) => {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined
    if (!geo) {
      reject(new Error('Géolocalisation non supportée'))
      return
    }

    let resolved = false
    let watchId: number
    let bestPosition: GeolocationPosition | null = null
    let timeoutId: ReturnType<typeof setTimeout>

    const cleanup = () => {
      if (watchId !== undefined) {
        geo.clearWatch(watchId)
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }

    const finishWithPosition = (position: GeolocationPosition | null, errorMessage?: string) => {
      if (resolved) {
        return
      }

      resolved = true
      cleanup()

      if (position) {
        resolve(position)
      } else {
        reject(new Error(errorMessage || 'Impossible d\'obtenir une position précise.'))
      }
    }

    timeoutId = setTimeout(() => {
      const message = bestPosition
        ? undefined
        : 'Impossible d\'obtenir une position. Vérifiez vos réglages de localisation.'
      finishWithPosition(bestPosition, message)
    }, maxWait)

    const successHandler = (position: GeolocationPosition) => {
      if (resolved) {
        return
      }

      bestPosition = position
      onUpdate?.(position)

      if (position.coords.accuracy <= desiredAccuracy) {
        finishWithPosition(position)
      }
    }

    const errorHandler = (error: GeolocationPositionError) => {
      if (resolved) {
        return
      }

      resolved = true
      cleanup()
      reject(error)
    }

    try {
      watchId = geo.watchPosition(successHandler, errorHandler, {
        enableHighAccuracy: true,
        timeout: maxWait,
        maximumAge: 0
      })
    } catch (error) {
      reject(error as Error)
      return
    }
  })
}
