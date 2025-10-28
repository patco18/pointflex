export interface OfficeGeofence {
  id: number
  name: string
  latitude: number | null
  longitude: number | null
  radius: number | null
  geolocation_max_accuracy: number | null
}

export interface MissionGeofence {
  id: number
  order_number: string
  title?: string | null
  latitude: number | null
  longitude: number | null
  radius: number | null
  geolocation_max_accuracy: number | null
  status?: string | null
}

export interface CompanyFallbackGeofence {
  latitude: number
  longitude: number
  radius: number | null
  geolocation_max_accuracy: number | null
}

export interface GeofencingContext {
  offices: OfficeGeofence[]
  missions: MissionGeofence[]
  fallback: CompanyFallbackGeofence | null
}
