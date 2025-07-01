import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Building,
  CheckCircle,
  AlertCircle
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
}

export default function OfficeManagement() {
  const { isAdmin } = useAuth()
  const [offices, setOffices] = useState<Office[]>([
    {
      id: 1,
      name: 'Bureau Principal',
      address: '123 Rue de la Paix, 75001 Paris',
      latitude: 48.8566,
      longitude: 2.3522,
      radius: 100,
      is_active: true
    }
  ])

  if (!isAdmin) {
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

  const handleDelete = (officeId: number, officeName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le bureau "${officeName}" ?`)) {
      setOffices(prev => prev.filter(office => office.id !== officeId))
      toast.success('Bureau supprimé avec succès!')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestion des Bureaux</h2>
          <p className="text-gray-600">
            Configurez les différents bureaux de votre entreprise
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Bureau
        </button>
      </div>

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
                <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(office.id, office.name)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="break-words">{office.address}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span>Coordonnées: {office.latitude.toFixed(4)}, {office.longitude.toFixed(4)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span>Rayon: {office.radius}m</span>
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
    </div>
  )
}