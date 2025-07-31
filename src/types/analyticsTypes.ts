// Type pour représenter les données analytiques
export interface AnalyticsData {
  kpis: {
    attendanceRate: number;
    attendanceTrend: number;
    onTimeRate: number;
    onTimeTrend: number;
    lateRate: number;
    lateTrend: number;
    averageHoursWorked: number;
    hoursTrend: number;
    absenceRate: number;
    absenceTrend: number;
    upcomingLeaves: number;
  };
  latenessAlerts: Array<{
    id: number;
    userId: number;
    userName: string;
    department?: string;
    lateCount: number;
    lateMinutes: number;
    lastLateDate: string;
    streak: number;
  }>;
  // Autres données d'analyse que nous pourrions ajouter dans le futur
}
