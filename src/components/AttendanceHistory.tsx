import React, { useState, useEffect } from 'react'
import { attendanceService } from '../services/api'
import { Calendar, Clock, MapPin, Filter, Download, Search } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface AttendanceRecord {
  id: number
  type: 'office' | 'mission'
  date_pointage: string
  heure_arrivee: string
  heure_depart?: string
  statut: string
  mission_order_number?: string
  latitude?: number
  longitude?: number
}

interface Props {
  records?: AttendanceRecord[]
  hideFilters?: boolean
  fetchRecords?: (startDate: string, endDate: string) => Promise<{ data: { records: AttendanceRecord[] } }>
}

export default function AttendanceHistory({ records: propRecords, hideFilters, fetchRecords }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>(propRecords || [])
  const [loading, setLoading] = useState(!propRecords)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })

  useEffect(() => {
    if (fetchRecords) {
      loadAttendanceHistory()
    } else if (!propRecords) {
      loadAttendanceHistory()
    } else {
      setLoading(false)
    }
  }, [dateRange, propRecords, fetchRecords])

  const loadAttendanceHistory = async () => {
    setLoading(true)
    try {
      const response = fetchRecords
        ? await fetchRecords(dateRange.start, dateRange.end)
        : await attendanceService.getAttendance(dateRange.start, dateRange.end)
      setRecords(response.data.records)
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (propRecords && !fetchRecords) {
      setRecords(propRecords)
    }
  }, [propRecords, fetchRecords])

  const filteredRecords = records.filter(record => {
    const matchesSearch = searchTerm === '' || 
      record.mission_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.date_pointage.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || record.statut === statusFilter
    const matchesType = typeFilter === 'all' || record.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Arrivée', 'Départ', 'Statut', 'Mission']
    const csvData = filteredRecords.map(record => [
      record.date_pointage,
      record.type,
      record.heure_arrivee,
      record.heure_depart || '',
      record.statut,
      record.mission_order_number || ''
    ])
    
    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pointages_${dateRange.start}_${dateRange.end}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const setQuickDateRange = (months: number) => {
    const end = new Date()
    const start = subMonths(end, months)
    setDateRange({
      start: format(startOfMonth(start), 'yyyy-MM-dd'),
      end: format(endOfMonth(end), 'yyyy-MM-dd')
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      present: 'bg-green-100 text-green-800',
      retard: 'bg-yellow-100 text-yellow-800',
      absent: 'bg-red-100 text-red-800'
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  const getTypeIcon = (type: string) => {
    return type === 'office' ? (
      <MapPin className="h-4 w-4 text-blue-600" />
    ) : (
      <Clock className="h-4 w-4 text-purple-600" />
    )
  }

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Historique des pointages</h1>
          <p className="text-gray-600">Consultez et exportez vos données de pointage</p>
        </div>
        <button
          onClick={exportToCSV}
          className="btn-secondary"
        >
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      {!hideFilters && (
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Mission, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Filtre par statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">Tous les statuts</option>
              <option value="present">Présent</option>
              <option value="retard">Retard</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          {/* Filtre par type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">Tous les types</option>
              <option value="office">Bureau</option>
              <option value="mission">Mission</option>
            </select>
          </div>

          {/* Période rapide */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Période rapide
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setQuickDateRange(1)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                1 mois
              </button>
              <button
                onClick={() => setQuickDateRange(3)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                3 mois
              </button>
              <button
                onClick={() => setQuickDateRange(6)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                6 mois
              </button>
            </div>
          </div>
        </div>

        {/* Sélection de dates personnalisée */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="input-field"
            />
          </div>
        </div>
      </div>
      )}

      {/* Résultats */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Résultats ({filteredRecords.length})
          </h3>
          <Filter className="h-5 w-5 text-gray-400" />
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun pointage trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aucun pointage ne correspond aux critères sélectionnés
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horaires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coordonnées
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(record.date_pointage), 'd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(record.type)}
                        <span className="text-sm text-gray-900 capitalize">
                          {record.type === 'office' ? 'Bureau' : 'Mission'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{record.heure_arrivee}</span>
                        {record.heure_depart && (
                          <>
                            <span className="text-gray-400">-</span>
                            <span>{record.heure_depart}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(record.statut)}`}>
                        {record.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.mission_order_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {record.latitude && record.longitude ? (
                        <a
                          href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}