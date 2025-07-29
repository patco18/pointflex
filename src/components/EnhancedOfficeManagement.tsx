import { useState, useEffect } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import { adminService } from '../services/api'
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Building,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  Navigation,
  Users,
  Wifi,
  Car,
  Coffee,
  Shield,
  Globe
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Office {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
  radius: number
  is_active: boolean
  timezone: string
  capacity: number
  current_occupancy: number
  amenities: string[] | string
  wifi_ssid?: string
  parking_spots?: number
  access_code?: string
  manager_name?: string
  phone?: string
  opening_hours?: {
    monday: { open: string, close: string }
    tuesday: { open: string, close: string }
    wednesday: { open: string, close: string }
    thursday: { open: string, close: string }
    friday: { open: string, close: string }
    saturday: { open: string, close: string }
    sunday: { open: string, close: string }
  }
}

const AMENITIES = [
  { id: 'wifi', name: 'WiFi', icon: Wifi },
  { id: 'parking', name: 'Parking', icon: Car },
  { id: 'cafeteria', name: 'Cafétéria', icon: Coffee },
  { id: 'security', name: 'Sécurité 24h/24', icon: Shield },
  { id: 'meeting_rooms', name: 'Salles de réunion', icon: Users },
  { id: 'gym', name: 'Salle de sport', icon: Users }
]

const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Europe/Paris (GMT+1)' },
  { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
  { value: 'America/New_York', label: 'America/New_York (GMT-5)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (GMT+10)' }
]

export default function EnhancedOfficeManagement() {
  const { permissions } = usePermissions()
  const [offices, setOffices] = useState<Office[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingOffice, setEditingOffice] = useState<Office | null>(null)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  const [officeForm, setOfficeForm] = useState<Partial<Office>>({
    name: '',
    address: '',
    latitude: 48.8566,
    longitude: 2.3522,
    radius: 100,
    timezone: 'Europe/Paris',
    capacity: 50,
    amenities: [],
    opening_hours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '', close: '' },
      sunday: { open: '', close: '' }
    }
  })

  // Charger les bureaux au chargement du composant
  useEffect(() => {
    loadOffices()
  }, [])

  const loadOffices = async () => {
    if (!permissions.canManageCompanySettings) return
    
    setDataLoading(true)
    try {
      const response = await adminService.getOffices()
      // Ensure amenities is always an array
      const processedOffices = response.data.offices.map((office: Office) => ({
        ...office,
        amenities: parseAmenities(office.amenities)
      }))
      setOffices(processedOffices)
    } catch (error) {
      console.error('Erreur lors du chargement des bureaux:', error)
      toast.error('Erreur lors du chargement des bureaux')
    } finally {
      setDataLoading(false)
    }
  }

  // Parse amenities to ensure it's always an array
  const parseAmenities = (amenities: string[] | string | undefined): string[] => {
    if (!amenities) return []
    if (Array.isArray(amenities)) return amenities
    try {
      // Try to parse if it's a JSON string
      return JSON.parse(amenities)
    } catch (e) {
      // If it's not a valid JSON string, return empty array
      return []
    }
  }

  const handleCreateOffice = async () => {
    setLoading(true)
    try {
      // Préparer les données pour l'API
      const officeData = {
        name: officeForm.name,
        address: officeForm.address,
        latitude: officeForm.latitude,
        longitude: officeForm.longitude,
        radius: officeForm.radius,
        timezone: officeForm.timezone,
        capacity: officeForm.capacity,
        amenities: JSON.stringify(officeForm.amenities),
        manager_name: officeForm.manager_name,
        phone: officeForm.phone,
        is_active: true,
        is_main: false
      }

      const response = await adminService.createOffice(officeData)
      
      // Ensure amenities is an array
      const newOffice = {
        ...response.data.office,
        amenities: parseAmenities(response.data.office.amenities)
      }
      
      // Ajouter le nouveau bureau à la liste
      setOffices(prev => [...prev, newOffice])
      
      setShowModal(false)
      resetForm()
      toast.success('Bureau créé avec succès!')
    } catch (error) {
      console.error('Erreur lors de la création du bureau:', error)
      toast.error('Erreur lors de la création du bureau')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOffice = async () => {
    if (!editingOffice) return
    
    setLoading(true)
    try {
      // Préparer les données pour l'API
      const officeData = {
        name: officeForm.name,
        address: officeForm.address,
        latitude: officeForm.latitude,
        longitude: officeForm.longitude,
        radius: officeForm.radius,
        timezone: officeForm.timezone,
        capacity: officeForm.capacity,
        amenities: JSON.stringify(officeForm.amenities),
        manager_name: officeForm.manager_name,
        phone: officeForm.phone,
        is_active: officeForm.is_active
      }

      const response = await adminService.updateOffice(editingOffice.id, officeData)
      
      // Ensure amenities is an array
      const updatedOffice = {
        ...response.data.office,
        amenities: parseAmenities(response.data.office.amenities)
      }
      
      // Mettre à jour le bureau dans la liste
      setOffices(prev => prev.map(office => 
        office.id === editingOffice.id 
          ? updatedOffice
          : office
      ))
      
      setShowModal(false)
      setEditingOffice(null)
      resetForm()
      toast.success('Bureau mis à jour avec succès!')
    } catch (error) {
      console.error('Erreur lors de la mise à jour du bureau:', error)
      toast.error('Erreur lors de la mise à jour du bureau')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOffice = async (officeId: number, officeName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le bureau "${officeName}" ?`)) {
      return
    }

    try {
      await adminService.deleteOffice(officeId)
      setOffices(prev => prev.filter(office => office.id !== officeId))
      toast.success('Bureau supprimé avec succès!')
    } catch (error) {
      console.error('Erreur lors de la suppression du bureau:', error)
      toast.error('Erreur lors de la suppression du bureau')
    }
  }

  const startEdit = (office: Office) => {
    setEditingOffice(office)
    setOfficeForm({
      name: office.name,
      address: office.address,
      latitude: office.latitude,
      longitude: office.longitude,
      radius: office.radius,
      timezone: office.timezone,
      capacity: office.capacity,
      amenities: parseAmenities(office.amenities),
      manager_name: office.manager_name,
      phone: office.phone,
      is_active: office.is_active,
      opening_hours: office.opening_hours
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setOfficeForm({
      name: '',
      address: '',
      latitude: 48.8566,
      longitude: 2.3522,
      radius: 100,
      timezone: 'Europe/Paris',
      capacity: 50,
      amenities: [],
      opening_hours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '', close: '' },
        sunday: { open: '', close: '' }
      }
    })
    setEditingOffice(null)
  }

  const toggleAmenity = (amenityId: string) => {
    setOfficeForm(prev => {
      const currentAmenities = Array.isArray(prev.amenities) ? prev.amenities : []
      const newAmenities = currentAmenities.includes(amenityId)
        ? currentAmenities.filter(id => id !== amenityId)
        : [...currentAmenities, amenityId]
      
      return {
        ...prev,
        amenities: newAmenities
      }
    })
  }

  const updateOpeningHours = (day: string, field: 'open' | 'close', value: string) => {
    setOfficeForm(prev => {
      if (!prev.opening_hours) return prev
      
      return {
        ...prev,
        opening_hours: {
          ...prev.opening_hours,
          [day]: {
            ...prev.opening_hours[day as keyof typeof prev.opening_hours],
            [field]: value
          }
        }
      }
    })
  }

  const getOccupancyColor = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  // Fonction pour obtenir la position actuelle
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée par votre navigateur')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        
        // Mettre à jour le formulaire avec les coordonnées actuelles
        setOfficeForm(prev => ({
          ...prev,
          latitude,
          longitude
        }))
        
        toast.success('Position actuelle récupérée avec succès')
        setLoading(false)
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error)
        toast.error('Impossible d\'obtenir votre position')
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    )
  }

  if (!permissions.canManageCompanySettings) {
    return (
      <div className="card text-center">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès restreint
        </h3>
        <p className="text-gray-600">
          Seuls les administrateurs peuvent gérer les bureaux de l'entreprise.
        </p>
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestion des Bureaux</h2>
          <p className="text-gray-600">
            Configurez et gérez tous les bureaux de votre entreprise
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Bureau
        </button>
      </div>

      {/* Liste des bureaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {offices.map((office) => (
          <div key={office.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{office.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {office.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm ${office.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {office.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => startEdit(office)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDeleteOffice(office.id, office.name)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                <span className="break-words">{office.address}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>Capacité: {office.capacity}</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getOccupancyColor(office.current_occupancy, office.capacity)}`}>
                  {office.current_occupancy}/{office.capacity}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <span>{office.timezone}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Navigation className="h-4 w-4 text-gray-400" />
                <span>Rayon: {office.radius}m</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>Coordonnées: {office.latitude.toFixed(6)}, {office.longitude.toFixed(6)}</span>
              </div>

              {office.manager_name && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>Manager: {office.manager_name}</span>
                </div>
              )}

              {/* Équipements */}
              <div className="flex flex-wrap gap-1 mt-2">
                {parseAmenities(office.amenities).map(amenityId => {
                  const amenity = AMENITIES.find(a => a.id === amenityId)
                  if (!amenity) return null
                  const Icon = amenity.icon
                  return (
                    <div key={amenityId} className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                      <Icon className="h-3 w-3" />
                      <span>{amenity.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}

        {offices.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun bureau configuré</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par ajouter votre premier bureau
            </p>
          </div>
        )}
      </div>

      {/* Modal de création/édition */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingOffice ? 'Modifier le bureau' : 'Nouveau bureau'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informations générales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                    Informations générales
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du bureau *
                    </label>
                    <input
                      type="text"
                      required
                      value={officeForm.name || ''}
                      onChange={(e) => setOfficeForm(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field"
                      placeholder="Bureau Principal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse complète *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={officeForm.address || ''}
                      onChange={(e) => setOfficeForm(prev => ({ ...prev, address: e.target.value }))}
                      className="input-field"
                      placeholder="Rue des Jardins, Cocody, Abidjan"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Latitude *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={officeForm.latitude || ''}
                        onChange={(e) => setOfficeForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Longitude *
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={officeForm.longitude || ''}
                        onChange={(e) => setOfficeForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <button
                    onClick={getCurrentLocation}
                    disabled={loading}
                    className="btn-secondary w-full"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    {loading ? 'Récupération...' : 'Utiliser ma position actuelle'}
                  </button>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rayon autorisé (m)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={officeForm.radius || 100}
                        onChange={(e) => setOfficeForm(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Capacité
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={officeForm.capacity || 50}
                        onChange={(e) => setOfficeForm(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fuseau horaire
                    </label>
                    <select
                      value={officeForm.timezone || 'Europe/Paris'}
                      onChange={(e) => setOfficeForm(prev => ({ ...prev, timezone: e.target.value }))}
                      className="input-field"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Détails et équipements */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                    Détails et équipements
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Manager
                      </label>
                      <input
                        type="text"
                        value={officeForm.manager_name || ''}
                        onChange={(e) => setOfficeForm(prev => ({ ...prev, manager_name: e.target.value }))}
                        className="input-field"
                        placeholder="Aminata Koné"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={officeForm.phone || ''}
                        onChange={(e) => setOfficeForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="input-field"
                        placeholder="+225 07 12 34 56 78"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SSID WiFi
                      </label>
                      <input
                        type="text"
                        value={officeForm.wifi_ssid || ''}
                        onChange={(e) => setOfficeForm(prev => ({ ...prev, wifi_ssid: e.target.value }))}
                        className="input-field"
                        placeholder="PointFlex-Abidjan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Places parking
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={officeForm.parking_spots || ''}
                        onChange={(e) => setOfficeForm(prev => ({ ...prev, parking_spots: parseInt(e.target.value) }))}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code d'accès
                    </label>
                    <input
                      type="text"
                      value={officeForm.access_code || ''}
                      onChange={(e) => setOfficeForm(prev => ({ ...prev, access_code: e.target.value }))}
                      className="input-field"
                      placeholder="1234"
                    />
                  </div>

                  {/* Équipements */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Équipements disponibles
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {AMENITIES.map(amenity => {
                        const Icon = amenity.icon
                        const isSelected = Array.isArray(officeForm.amenities) && officeForm.amenities.includes(amenity.id)
                        return (
                          <button
                            key={amenity.id}
                            type="button"
                            onClick={() => toggleAmenity(amenity.id)}
                            className={`flex items-center space-x-2 p-2 rounded-lg border transition-colors ${
                              isSelected 
                                ? 'border-blue-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="text-sm">{amenity.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Horaires d'ouverture */}
              {officeForm.opening_hours && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">
                    Horaires d'ouverture
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(officeForm.opening_hours).map(([day, hours]) => (
                      <div key={day} className="flex items-center space-x-4">
                        <div className="w-20 text-sm font-medium text-gray-700 capitalize">
                          {day === 'monday' ? 'Lundi' :
                           day === 'tuesday' ? 'Mardi' :
                           day === 'wednesday' ? 'Mercredi' :
                           day === 'thursday' ? 'Jeudi' :
                           day === 'friday' ? 'Vendredi' :
                           day === 'saturday' ? 'Samedi' : 'Dimanche'}
                        </div>
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateOpeningHours(day, 'open', e.target.value)}
                          className="input-field flex-1"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateOpeningHours(day, 'close', e.target.value)}
                          className="input-field flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button 
                  onClick={editingOffice ? handleUpdateOffice : handleCreateOffice}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingOffice ? 'Mise à jour...' : 'Création...'}
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingOffice ? 'Mettre à jour' : 'Créer le bureau'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}