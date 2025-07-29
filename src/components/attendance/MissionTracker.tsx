import React, { useState } from 'react'
import { 
  Map, 
  Briefcase, 
  Calendar,
  ChevronRight,
  Navigation,
  Clock,
  CheckCircle
} from 'lucide-react'

interface Mission {
  id: number
  title: string
  order_number: string
  start_date: string
  end_date: string
  location: string
  status: 'upcoming' | 'ongoing' | 'completed'
  checked_in: boolean
}

interface Props {
  missions?: Mission[]
  onCheckInMission?: (missionId: number) => void
  loading?: boolean
}

export default function MissionTracker({ missions = [], onCheckInMission, loading = false }: Props) {
  const [expandedMission, setExpandedMission] = useState<number | null>(null)
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'À venir'
      case 'ongoing': return 'En cours'
      case 'completed': return 'Terminée'
      default: return status
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-50'
      case 'ongoing': return 'text-green-600 bg-green-50'
      case 'completed': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }
  
  // Filtrer pour avoir uniquement les missions à venir ou en cours
  const activeMissions = missions.filter(m => m.status !== 'completed')
  
  if (activeMissions.length === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
          <Briefcase className="h-6 w-6 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium mb-1">Aucune mission active</h3>
        <p className="text-gray-600 text-sm">
          Vous n'avez pas de missions en cours ou à venir
        </p>
      </div>
    )
  }
  
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Missions actives</h3>
        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {activeMissions.length} mission{activeMissions.length > 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-3">
        {activeMissions.map(mission => {
          const isExpanded = expandedMission === mission.id
          const formattedStartDate = new Date(mission.start_date).toLocaleDateString('fr-FR')
          const formattedEndDate = new Date(mission.end_date).toLocaleDateString('fr-FR')
          
          return (
            <div 
              key={mission.id}
              className="border rounded-lg overflow-hidden"
            >
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedMission(isExpanded ? null : mission.id)}
              >
                <div className="flex items-center">
                  <div className="mr-3">
                    <div className={`p-2 rounded-full ${getStatusColor(mission.status)}`}>
                      <Briefcase className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium">{mission.title}</h4>
                    <div className="text-xs text-gray-500">
                      N° {mission.order_number} • {formattedStartDate} au {formattedEndDate}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`text-xs px-2 py-1 rounded-full mr-2 ${getStatusColor(mission.status)}`}>
                    {getStatusText(mission.status)}
                  </span>
                  <ChevronRight 
                    className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                  />
                </div>
              </div>
              
              {isExpanded && (
                <div className="p-3 border-t border-gray-100 bg-gray-50">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Date de début</div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                        <span>{formattedStartDate}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Date de fin</div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                        <span>{formattedEndDate}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Localisation</div>
                    <div className="flex items-center">
                      <Map className="h-4 w-4 text-gray-500 mr-1" />
                      <span>{mission.location}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    {mission.checked_in ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Pointage effectué</span>
                      </div>
                    ) : mission.status === 'ongoing' ? (
                      <button 
                        onClick={e => {
                          e.stopPropagation()
                          onCheckInMission && onCheckInMission(mission.id)
                        }}
                        disabled={loading}
                        className="btn-sm bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Pointer pour cette mission
                      </button>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {mission.status === 'upcoming' ? 'Mission à venir' : 'Mission terminée'}
                      </div>
                    )}
                    
                    <button 
                      onClick={e => {
                        e.stopPropagation()
                        window.open(`https://maps.google.com/?q=${encodeURIComponent(mission.location)}`, '_blank')
                      }}
                      className="btn-sm btn-secondary"
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      Itinéraire
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
