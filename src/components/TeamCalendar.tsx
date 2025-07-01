import React, { useState } from 'react'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Clock,
  MapPin,
  Filter
} from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function TeamCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  // Générer les jours du mois (simulation)
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendrier d'Équipe</h1>
          <p className="text-gray-600">Vue d'ensemble des pointages de l'équipe</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtres */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex items-center mb-4">
              <Filter className="h-5 w-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employés
                </label>
                <div className="space-y-2">
                  {['Jean Dupont', 'Marie Martin', 'Pierre Durand'].map(name => (
                    <label key={name} className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendrier */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900">
                  {format(currentDate, 'MMMM yyyy', { locale: fr })}
                </h2>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Grille du calendrier */}
            <div className="grid grid-cols-7 gap-1">
              {/* En-têtes des jours */}
              {weekDays.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}

              {/* Jours du mois */}
              {daysInMonth.map(day => (
                <div
                  key={day}
                  className="min-h-24 p-1 border border-gray-200 cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                >
                  <div className="text-sm font-medium mb-1 text-gray-900">
                    {day}
                  </div>
                  
                  {/* Événements simulés */}
                  {day % 3 === 0 && (
                    <div className="text-xs px-1 py-0.5 rounded bg-blue-500 text-white truncate mb-1">
                      Jean 08:30
                    </div>
                  )}
                  {day % 5 === 0 && (
                    <div className="text-xs px-1 py-0.5 rounded bg-green-500 text-white truncate">
                      Marie 09:00
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Détails du jour sélectionné */}
      {selectedDate && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Événements du {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Jean Dupont</span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-600">Pointage Bureau</span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-600">08:30</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="h-3 w-3 text-blue-600" />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                    À l'heure
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}