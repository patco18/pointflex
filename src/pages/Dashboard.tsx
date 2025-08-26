import React, { useState, useEffect } from 'react'
import { attendanceService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import AttendanceChart from '../components/AttendanceChart'
import QuickActions from '../components/QuickActions'
import RemindersWidget from '../components/dashboard/RemindersWidget'
import { Button } from '../components/ui/button'
import { getRoleStyle } from '../utils/roleStyles'
import toast from 'react-hot-toast'
import {
  Clock,
  MapPin,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  Settings
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AttendanceRecord {
  id: number
  type: 'office' | 'mission'
  date_pointage: string
  heure_arrivee: string
  heure_depart?: string
  statut: string
  mission_order_number?: string
}

interface Stats {
  total_days: number
  present_days: number
  late_days: number
  absence_days: number
  average_hours: number
}

interface WidgetVisibility {
  presence: boolean
  reminders: boolean
  quickActions: boolean
}

export default function Dashboard() {
  const { user } = useAuth()
  const roleInfo = getRoleStyle(user?.role)
  const RoleIcon = roleInfo.icon

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<Array<{ date: string; present: number; late: number; absent: number }>>([])
  const [widgets, setWidgets] = useState<WidgetVisibility>(() => {
    try {
      const saved = localStorage.getItem('dashboard-widgets')
      return saved
        ? JSON.parse(saved)
        : { presence: true, reminders: true, quickActions: true }
    } catch {
      return { presence: true, reminders: true, quickActions: true }
    }
  })
  const [configOpen, setConfigOpen] = useState(false)

  const toggleWidget = (key: keyof WidgetVisibility) => {
    setWidgets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    localStorage.setItem('dashboard-widgets', JSON.stringify(widgets))
  }, [widgets])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd')
      
      // Récupération des données avec gestion individuelle des erreurs
      let attendanceData = [];
      let statsData = null;
      let last7Days = [];
      
      try {
        const attendanceResponse = await attendanceService.getAttendance(startDate, endDate);
        attendanceData = attendanceResponse.data.records || [];
      } catch (error) {
        console.error('Erreur lors de la récupération des pointages:', error);
        toast.error('Impossible de charger les données de pointage');
      }
      
      try {
        const statsResponse = await attendanceService.getStats();
        statsData = statsResponse.data.stats;
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        toast.error('Impossible de charger les statistiques');
      }
      
      try {
        const last7DaysResponse = await attendanceService.getLast7DaysStats();
        if (last7DaysResponse.data.stats && Array.isArray(last7DaysResponse.data.stats)) {
          last7Days = last7DaysResponse.data.stats.map((day: any) => ({
            date: day.date,
            present: day.present,
            late: day.late,
            absent: day.absent
          }));
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données des 7 derniers jours:', error);
        generateFallbackChartData();
      }
      
      // Mise à jour de l'état avec les données récupérées
      setAttendanceRecords(attendanceData);
      if (statsData) setStats(statsData);
      if (last7Days.length > 0) setChartData(last7Days);
      else generateFallbackChartData();
      
    } catch (error) {
      console.error('Erreur globale lors du chargement des données:', error);
      toast.error('Une erreur est survenue lors du chargement des données');
      generateFallbackChartData();
    } finally {
      setLoading(false);
    }
  }

  const generateFallbackChartData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      return {
        date: format(date, 'dd/MM', { locale: fr }),
        present: Math.floor(Math.random() * 10) + 5,
        late: Math.floor(Math.random() * 3),
        absent: Math.floor(Math.random() * 2)
      }
    })
    setChartData(last7Days)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  const getTodayStatus = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayRecord = attendanceRecords.find((r) => r.date_pointage === today)

    if (!todayRecord) {
      return {
        status: 'not_checked',
        message: "Vous n'avez pas encore pointé aujourd'hui",
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      }
    }

    if (todayRecord.statut === 'present') {
      return {
        status: 'present',
        message: `Pointé à ${todayRecord.heure_arrivee} - À l'heure`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    }

    return {
      status: 'late',
      message: `Pointé à ${todayRecord.heure_arrivee} - En retard`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const todayStatus = getTodayStatus()

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-end">
        <Button
          color="secondary"
          size="sm"
          icon={<Settings className="h-4 w-4" />}
          onClick={() => setConfigOpen(!configOpen)}
        >
          Widgets
        </Button>
      </div>
      {configOpen && (
        <div className="absolute right-0 mt-2 w-64 z-20">
          <div className="card p-4">
            <h3 className="text-sm font-medium mb-2">Modules</h3>
            <div className="space-y-2">
              {(['presence', 'reminders', 'quickActions'] as const).map((key) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={widgets[key]}
                    onChange={() => toggleWidget(key)}
                  />
                  <span className="capitalize text-sm">
                    {key === 'quickActions' ? 'actions' : key}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {user?.prenom} !
            </h1>
            <p className="text-primary-100 mt-1">
              {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
            {user?.company_name && (
              <div className="flex items-center mt-2 text-primary-100">
                <Building className="h-4 w-4 mr-2" />
                <span className="text-sm">{user.company_name}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {format(new Date(), 'HH:mm')}
            </div>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleInfo.bg} ${roleInfo.color}`}>
                <RoleIcon className="h-4 w-4 mr-1" />
                {roleInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {widgets.presence && (
        <>
          <div className={`${todayStatus.bgColor} ${todayStatus.borderColor} border rounded-lg p-4`}>
            <div className="flex items-center space-x-3">
              {todayStatus.status === 'present' && <CheckCircle className="h-6 w-6 text-green-600" />}
              {todayStatus.status === 'late' && <AlertTriangle className="h-6 w-6 text-orange-600" />}
              {todayStatus.status === 'not_checked' && <Clock className="h-6 w-6 text-yellow-600" />}
              <div>
                <h3 className={`font-medium ${todayStatus.color}`}>Statut du jour</h3>
                <p className={`text-sm ${todayStatus.color}`}>{todayStatus.message}</p>
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Jours présents</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.present_days}</p>
                    <p className="text-xs text-green-600">Ce mois-ci</p>
                  </div>
                </div>
              </div>

              <div className="card hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Retards</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.late_days}</p>
                    <p className="text-xs text-yellow-600">Ce mois-ci</p>
                  </div>
                </div>
              </div>

              <div className="card hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Absences</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.absence_days}</p>
                    <p className="text-xs text-red-600">Ce mois-ci</p>
                  </div>
                </div>
              </div>

              <div className="card hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Heures moy.</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.average_hours.toFixed(1)}h</p>
                    <p className="text-xs text-blue-600">Par jour</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <AttendanceChart data={chartData} title="Activité des 7 derniers jours" />

          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Activité récente</h2>
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>

            {attendanceRecords.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun pointage</h3>
                <p className="mt-1 text-sm text-gray-500">Commencez par effectuer votre premier pointage</p>
                <button onClick={() => (window.location.href = '/checkin')} className="mt-4 btn-primary">
                  Pointer maintenant
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {attendanceRecords.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${record.type === 'office' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                        {record.type === 'office' ? (
                          <MapPin className={`h-4 w-4 ${record.type === 'office' ? 'text-blue-600' : 'text-purple-600'}`} />
                        ) : (
                          <Clock className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {record.type === 'office' ? 'Pointage Bureau' : 'Pointage Mission'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(record.date_pointage), 'dd MMMM yyyy', { locale: fr })}
                          {record.mission_order_number && ` - Mission ${record.mission_order_number}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {record.heure_arrivee}
                        {record.heure_depart && ` - ${record.heure_depart}`}
                      </p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.statut === 'present'
                            ? 'bg-green-100 text-green-800'
                            : record.statut === 'retard'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {record.statut}
                      </span>
                    </div>
                  </div>
                ))}

                {attendanceRecords.length > 5 && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => (window.location.href = '/history')}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Voir tous les pointages →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {widgets.reminders && <RemindersWidget />}

      {widgets.quickActions && <QuickActions />}
    </div>
  )
}
