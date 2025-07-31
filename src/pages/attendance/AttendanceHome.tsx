import React, { useState, useEffect } from 'react'
import { attendanceService } from '../../services/api'
import AttendanceStatus from '../../components/attendance/AttendanceStatus'
import CheckInMethods from '../../components/attendance/CheckInMethods'
import AttendanceStats from '../../components/attendance/AttendanceStats'
import MissionTracker from '../../components/attendance/MissionTracker'
import PauseManager from '../../components/attendance/PauseManager'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { MapPin } from 'lucide-react'

// Types temporaires - à remplacer par les types réels du service API
interface Attendance {
  id: number
  date_pointage: string
  heure_arrivee: string
  heure_depart: string | null
  statut: 'present' | 'retard' | 'absent'
  type: 'office' | 'mission'
  delay_minutes?: number
  worked_hours?: number
}

interface Pause {
  id: number
  type: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
}

export default function AttendanceHome() {
  const { user } = useAuth()
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<any>(null)
  const [activeMissions, setActiveMissions] = useState<any[]>([])
  const [activePause, setActivePause] = useState<Pause | null>(null)
  const [todayPauses, setTodayPauses] = useState<Pause[]>([])
  const [loading, setLoading] = useState({
    attendance: true,
    stats: true,
    missions: true,
    pauses: true
  })
  
  useEffect(() => {
    fetchAttendanceData()
  }, [])

  // Récupération de l'état du pointage du jour
  const fetchAttendanceData = async () => {
    try {
      // Chargement du pointage du jour
      try {
        const todayResult = await attendanceService.getTodayAttendance()
        setTodayAttendance(todayResult.data)
      } catch (error) {
        console.error("Erreur lors du chargement du pointage:", error)
        // Données de pointage par défaut pour éviter les erreurs
        setTodayAttendance({
          id: 0,
          date_pointage: format(new Date(), 'yyyy-MM-dd'),
          heure_arrivee: "",
          heure_depart: null,
          statut: 'absent',
          type: 'office',
          delay_minutes: 0,
          worked_hours: 0
        })
      } finally {
        setLoading(prev => ({ ...prev, attendance: false }))
      }
      
      // Chargement des statistiques hebdomadaires
      try {
        const statsResult = await attendanceService.getWeeklyStats()
        setWeeklyStats(statsResult.data)
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques:", error)
        // Données de statistiques par défaut pour éviter les erreurs
        setWeeklyStats({
          days: [],
          summary: {
            present_days: 0,
            late_days: 0,
            absent_days: 0,
            total_days: 5,
            average_hours: 0,
            trend: 'stable',
            trend_percentage: 0
          }
        })
      } finally {
        setLoading(prev => ({ ...prev, stats: false }))
      }
      
      // Chargement des missions actives
      try {
        const missionsResult = await attendanceService.getActiveMissions()
        // Assurer la transformation correcte des données pour correspondre à l'interface attendue
        const transformedMissions = (missionsResult.data.missions || []).map((m: any) => ({
          id: m.id,
          title: m.name || "Sans titre",
          order_number: m.id.toString(),
          start_date: m.start_date,
          end_date: m.end_date || "",
          location: m.location || "Non spécifié",
          status: m.status === "active" ? "ongoing" : "upcoming",
          checked_in: false
        }));
        setActiveMissions(transformedMissions)
      } catch (error) {
        console.error("Erreur lors du chargement des missions:", error)
        // En cas d'erreur, définir un tableau vide pour éviter les erreurs
        setActiveMissions([])
      } finally {
        setLoading(prev => ({ ...prev, missions: false }))
      }
      
      // Chargement des pauses du jour
      try {
        const pausesResult = await attendanceService.getPauses()
        const pauses = pausesResult.data.pauses || []
        
        // Trouver la pause active (sans heure de fin)
        const activeP = pauses.find((p: any) => p.end_time === null)
        if (activeP) {
          setActivePause(activeP)
        }
        
        setTodayPauses(pauses)
      } catch (error) {
        console.error("Erreur lors du chargement des pauses:", error)
        // Pauses vides en cas d'erreur
        setTodayPauses([])
        setActivePause(null)
      } finally {
        setLoading(prev => ({ ...prev, pauses: false }))
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      toast.error('Impossible de charger certaines données')
      
      // Désactiver les indicateurs de chargement même en cas d'erreur
      setLoading({
        attendance: false,
        stats: false,
        missions: false,
        pauses: false
      })
    }
  }
  
  // Gestion des pauses
  const handleStartPause = async (pauseType: string) => {
    try {
      setLoading(prev => ({ ...prev, pauses: true }))
      await attendanceService.startPause(pauseType)
      toast.success('Pause démarrée')
      
      // Rafraîchir les données de pause
      const pausesResult = await attendanceService.getPauses()
      const pauses = pausesResult.data.pauses || []
      const activeP = pauses.find((p: any) => p.end_time === null)
      
      setActivePause(activeP || null)
      setTodayPauses(pauses)
    } catch (error) {
      console.error('Erreur lors du démarrage de la pause:', error)
      toast.error("Impossible de démarrer la pause")
    } finally {
      setLoading(prev => ({ ...prev, pauses: false }))
    }
  }
  
  const handleEndPause = async (pauseId: number) => {
    try {
      setLoading(prev => ({ ...prev, pauses: true }))
      await attendanceService.endPause(pauseId)
      toast.success('Pause terminée')
      
      // Rafraîchir les données de pause
      const pausesResult = await attendanceService.getPauses()
      setActivePause(null)
      setTodayPauses(pausesResult.data.pauses || [])
    } catch (error) {
      console.error('Erreur lors de la fin de la pause:', error)
      toast.error("Impossible de terminer la pause")
    } finally {
      setLoading(prev => ({ ...prev, pauses: false }))
    }
  }
  
  const handleMissionCheckIn = async (missionId: number) => {
    try {
      setLoading(prev => ({ ...prev, missions: true }))
      
      // Rechercher la mission dans la liste
      const mission = activeMissions.find(m => m.id === missionId)
      if (!mission) {
        toast.error("Mission introuvable")
        return
      }
      
      // Obtenir la position actuelle
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })
      
      // Faire le pointage mission
      await attendanceService.checkInMission(
        mission.order_number,
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      )
      
      toast.success('Pointage mission effectué')
      
      // Rafraîchir les données
      fetchAttendanceData()
      
    } catch (error: any) {
      console.error('Erreur lors du pointage mission:', error)
      
      if (error.name === 'GeolocationPositionError') {
        toast.error("Impossible d'obtenir votre position")
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error("Une erreur est survenue lors du pointage")
      }
    } finally {
      setLoading(prev => ({ ...prev, missions: false }))
    }
  }
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pointage</h1>
          <p className="text-gray-600">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {!todayAttendance?.heure_arrivee && (
            <a href="/checkin" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
              <MapPin className="h-5 w-5 mr-2" />
              Enregistrer un pointage
            </a>
          )}
          
          {todayAttendance?.heure_arrivee && (
            <div className="text-right">
              <span className="text-sm text-gray-500">Arrivée aujourd'hui</span>
              <p className="text-lg font-semibold">
                {format(new Date(`2000-01-01T${todayAttendance.heure_arrivee}`), 'HH:mm')}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Statut du pointage du jour */}
      <AttendanceStatus 
        attendance={todayAttendance} 
        loading={loading.attendance} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche */}
        <div className="space-y-6">
          {/* Méthodes de pointage */}
          {!todayAttendance?.heure_arrivee ? (
            <CheckInMethods />
          ) : !todayAttendance?.heure_depart ? (
            <div className="card p-6 text-center">
              <h3 className="text-lg font-medium mb-4">
                Fin de journée
              </h3>
              <button 
                className="btn-primary"
                onClick={() => {
                  attendanceService.checkout()
                    .then(() => {
                      toast.success("Heure de départ enregistrée")
                      fetchAttendanceData()
                    })
                    .catch(error => {
                      console.error('Erreur lors de la fin de journée:', error)
                      toast.error("Impossible d'enregistrer l'heure de départ")
                    })
                }}
              >
                Enregistrer mon départ
              </button>
            </div>
          ) : null}
          
          {/* Missions actives */}
          <MissionTracker 
            missions={activeMissions}
            loading={loading.missions}
            onCheckInMission={handleMissionCheckIn}
          />
        </div>
        
        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Gestion des pauses (seulement si pointage fait et journée non terminée) */}
          {todayAttendance?.heure_arrivee && !todayAttendance?.heure_depart && (
            <PauseManager 
              activePause={activePause}
              todayPauses={todayPauses}
              loading={loading.pauses}
              onStartPause={handleStartPause}
              onEndPause={handleEndPause}
            />
          )}
          
          {/* Statistiques hebdomadaires */}
          {weeklyStats && (
            <AttendanceStats stats={weeklyStats} />
          )}
        </div>
      </div>
    </div>
  )
}
