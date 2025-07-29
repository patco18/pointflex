import React from 'react'
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { format, formatDistance } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  attendance: any
  loading: boolean
}

export default function AttendanceStatus({ attendance, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-6 flex justify-center">
        <div className="animate-pulse flex space-x-4 items-center">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  if (!attendance) {
    return (
      <div className="card p-6">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Clock className="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <h3 className="font-medium">Pointage non effectué</h3>
            <p className="text-sm text-gray-500">
              Vous n'avez pas encore pointé aujourd'hui
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  let icon = <CheckCircle className="h-6 w-6 text-green-500" />
  let statusText = "Présent"
  let statusDesc = "Vous avez pointé à l'heure"
  let color = "bg-green-100"
  
  if (attendance.statut === 'retard') {
    icon = <AlertTriangle className="h-6 w-6 text-amber-500" />
    statusText = "En retard"
    statusDesc = `Retard de ${attendance.delay_minutes} minutes`
    color = "bg-amber-100"
  } else if (attendance.statut === 'absent') {
    icon = <XCircle className="h-6 w-6 text-red-500" />
    statusText = "Absent"
    statusDesc = "Vous n'avez pas pointé aujourd'hui"
    color = "bg-red-100"
  }
  
  return (
    <div className={`card p-6 border-l-4 ${
      attendance.statut === 'present' ? 'border-green-500' : 
      attendance.statut === 'retard' ? 'border-amber-500' : 'border-red-500'
    }`}>
      <div className="flex items-center space-x-4">
        <div className={`h-12 w-12 rounded-full ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">{statusText}</h3>
            <span className="text-sm font-medium">
              {attendance.heure_arrivee && format(new Date(`2000-01-01T${attendance.heure_arrivee}`), 'HH:mm')}
            </span>
          </div>
          <p className="text-sm text-gray-500">{statusDesc}</p>
        </div>
      </div>
      
      {attendance.heure_arrivee && !attendance.heure_depart && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Durée de présence</span>
            <span className="font-medium">
              {formatDistance(new Date(), new Date(`2000-01-01T${attendance.heure_arrivee}`), { 
                locale: fr,
                addSuffix: false 
              })}
            </span>
          </div>
        </div>
      )}
      
      {attendance.heure_depart && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Heures travaillées</span>
            <span className="font-medium">
              {attendance.worked_hours || '8h00'} 
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
