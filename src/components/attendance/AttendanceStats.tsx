import React from 'react'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ChevronUp,
  ChevronDown,
  TrendingUp 
} from 'lucide-react'

interface WeeklyStats {
  days: Array<{
    date: string
    status: 'present' | 'late' | 'absent'
    worked_hours: number | null
    arrival_time?: string
    departure_time?: string
  }>
  summary: {
    present_days: number
    late_days: number
    absent_days: number
    total_days: number
    average_hours: number
    trend: 'up' | 'down' | 'stable'
    trend_percentage: number
  }
}

interface Props {
  stats: WeeklyStats
}

export default function AttendanceStats({ stats }: Props) {
  // Vérifier si stats est défini et si summary est disponible
  if (!stats || !stats.summary) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium mb-4">Performance de la semaine</h3>
        <div className="text-gray-500">Chargement des statistiques...</div>
      </div>
    );
  }
  
  const { summary, days } = stats
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500'
      case 'late': return 'bg-amber-500'
      case 'absent': return 'bg-red-500'
      default: return 'bg-gray-300'
    }
  }
  
  const formatHours = (hours: number | null) => {
    if (hours === null) return '-'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h${m.toString().padStart(2, '0')}`
  }

  // Tendance par rapport à la semaine précédente
  const renderTrend = () => {
    const { trend, trend_percentage } = summary
    
    return (
      <div className="flex items-center">
        {trend === 'up' ? (
          <ChevronUp className="h-4 w-4 text-green-500" />
        ) : trend === 'down' ? (
          <ChevronDown className="h-4 w-4 text-red-500" />
        ) : (
          <TrendingUp className="h-4 w-4 text-blue-500" />
        )}
        <span className={`text-xs ml-1 ${
          trend === 'up' ? 'text-green-600' : 
          trend === 'down' ? 'text-red-600' : 
          'text-blue-600'
        }`}>
          {trend_percentage}% {trend === 'up' ? 'mieux' : trend === 'down' ? 'moins bien' : 'stable'}
        </span>
      </div>
    )
  }
  
  return (
    <div className="card p-6">
      <h3 className="text-lg font-medium mb-4">Performance de la semaine</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
            <span className="font-medium text-green-800">Présences</span>
          </div>
          <div className="text-2xl font-bold text-green-700">
            {summary.present_days}
            <span className="text-sm text-green-600 ml-1">/{summary.total_days}</span>
          </div>
        </div>
        
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-1" />
            <span className="font-medium text-amber-800">Retards</span>
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {summary.late_days}
            <span className="text-sm text-amber-600 ml-1">/{summary.total_days}</span>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Clock className="h-5 w-5 text-blue-500 mr-1" />
            <span className="font-medium text-blue-800">Moy. heures</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {formatHours(summary.average_hours)}
          </div>
          <div className="mt-1">{renderTrend()}</div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="pb-2 font-medium">Jour</th>
              <th className="pb-2 font-medium">Statut</th>
              <th className="pb-2 font-medium">Arrivée</th>
              <th className="pb-2 font-medium">Départ</th>
              <th className="pb-2 font-medium text-right">Heures</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, index) => (
              <tr key={index} className="border-b border-gray-100 last:border-0">
                <td className="py-3">
                  {new Date(day.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(day.status)}`}></div>
                    <span>
                      {day.status === 'present' ? 'Présent' : 
                       day.status === 'late' ? 'Retard' : 'Absent'}
                    </span>
                  </div>
                </td>
                <td>{day.arrival_time || '-'}</td>
                <td>{day.departure_time || '-'}</td>
                <td className="text-right font-medium">{formatHours(day.worked_hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
