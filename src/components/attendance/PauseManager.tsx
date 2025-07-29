import React, { useState, useEffect } from 'react'
import { Clock, CoffeeIcon, BriefcaseIcon, UserIcon } from 'lucide-react'

interface Pause {
  id: number
  type: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
}

interface Props {
  onStartPause: (type: string) => void
  onEndPause: (pauseId: number) => void
  activePause: Pause | null
  todayPauses: Pause[]
  loading: boolean
}

export default function PauseManager({ onStartPause, onEndPause, activePause, todayPauses, loading }: Props) {
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  
  // Mettre à jour le temps écoulé chaque seconde si une pause est active
  useEffect(() => {
    if (!activePause) {
      setElapsedTime(0)
      return
    }
    
    const startTime = new Date(activePause.start_time).getTime()
    
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const elapsed = Math.floor((now - startTime) / 1000)
      setElapsedTime(elapsed)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [activePause])
  
  // Formater le temps écoulé en HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0'),
    ].join(':')
  }
  
  // Calculer le temps total de pause de la journée
  const calculateTotalPauseTime = () => {
    return todayPauses.reduce((total, pause) => {
      return total + (pause.duration_minutes || 0)
    }, 0)
  }
  
  const pauseTypes = [
    { id: 'lunch', name: 'Déjeuner', icon: CoffeeIcon, color: 'text-amber-600', bg: 'bg-amber-100' },
    { id: 'work', name: 'Pause travail', icon: BriefcaseIcon, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'personal', name: 'Pause perso', icon: UserIcon, color: 'text-purple-600', bg: 'bg-purple-100' },
  ]
  
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Gestion des pauses</h3>
        <div className="text-sm text-gray-600">
          Total aujourd'hui: <span className="font-medium">{calculateTotalPauseTime()} min</span>
        </div>
      </div>
      
      {activePause ? (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <span className="font-medium">Pause en cours</span>
                <p className="text-sm text-gray-600">
                  {pauseTypes.find(p => p.id === activePause.type)?.name || 'Pause'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-orange-600">
                {formatTime(elapsedTime)}
              </div>
              <button 
                className="btn-sm bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => onEndPause(activePause.id)}
                disabled={loading}
              >
                Terminer la pause
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {pauseTypes.map(type => (
            <button
              key={type.id}
              onClick={() => onStartPause(type.id)}
              disabled={loading}
              className="p-3 border rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-gray-50"
            >
              <div className={`h-10 w-10 rounded-full ${type.bg} flex items-center justify-center`}>
                <type.icon className={`h-5 w-5 ${type.color}`} />
              </div>
              <span className="text-sm font-medium">{type.name}</span>
            </button>
          ))}
        </div>
      )}
      
      {todayPauses.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Historique aujourd'hui</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {todayPauses.map((pause, index) => {
              const pauseType = pauseTypes.find(p => p.id === pause.type)
              const PauseIcon = pauseType?.icon || Clock
              
              return (
                <div 
                  key={index}
                  className="flex items-center justify-between text-sm p-2 border-b border-gray-100"
                >
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full ${pauseType?.bg || 'bg-gray-100'} flex items-center justify-center mr-2`}>
                      <PauseIcon className={`h-4 w-4 ${pauseType?.color || 'text-gray-600'}`} />
                    </div>
                    <div>
                      <div className="font-medium">{pauseType?.name || 'Pause'}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(pause.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {pause.end_time && ` - ${new Date(pause.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>
                  </div>
                  <div className="font-medium">
                    {pause.duration_minutes ? `${pause.duration_minutes} min` : 'En cours'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
