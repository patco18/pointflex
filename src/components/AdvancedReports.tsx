import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Download, TrendingUp, Users, Clock, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { adminService } from '../services/api'

export default function AdvancedReports() {
  const { isAdmin } = useAuth()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportType, setReportType] = useState<'company' | 'employee'>('company')
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [employees, setEmployees] = useState<any[]>([])

  useEffect(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(start.toISOString().slice(0, 10))
    setEndDate(today.toISOString().slice(0, 10))

    const loadEmployees = async () => {
      try {
        const res = await adminService.getEmployees()
        setEmployees(res.data.employees || [])
      } catch (err) {
        console.error('Erreur chargement employés', err)
      }
    }
    loadEmployees()
  }, [])

  const downloadPdf = async () => {
    try {
      let response
      if (reportType === 'employee') {
        if (!employeeId) {
          toast.error('Sélectionnez un employé')
          return
        }
        response = await adminService.downloadEmployeeAttendancePdf(employeeId, {
          startDate,
          endDate,
        })
      } else {
        response = await adminService.downloadAttendancePdf({ 
          startDate, 
          endDate 
        })
      }

      // La réponse contient déjà les données binaires dans response.data
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        reportType === 'employee' && employeeId
          ? `attendance_${employeeId}.pdf`
          : 'attendance_report.pdf'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Rapport téléchargé')
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF', error)
      toast.error('Erreur lors du téléchargement du PDF')
    }
  }

  if (!isAdmin) {
    return (
      <div className="card text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès restreint
        </h3>
        <p className="text-gray-600">
          Seuls les administrateurs peuvent générer des rapports.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports Avancés</h1>
          <p className="text-gray-600">Analyses détaillées des données de pointage</p>
        </div>
        <div className="flex space-x-2">
          <button className="btn-secondary" onClick={downloadPdf}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </button>
          <button className="btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employés</p>
              <p className="text-2xl font-bold text-gray-900">45</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pointages</p>
              <p className="text-2xl font-bold text-gray-900">892</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Heures Moyennes</p>
              <p className="text-2xl font-bold text-gray-900">8.2h</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Génération de Rapports</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
            <input
              type="date"
              className="input-field"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
            <input
              type="date"
              className="input-field"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="input-field"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'company' | 'employee')}
            >
              <option value="company">Entreprise</option>
              <option value="employee">Employé</option>
            </select>
          </div>
          {reportType === 'employee' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
              <select
                className="input-field"
                value={employeeId ?? ''}
                onChange={(e) => setEmployeeId(Number(e.target.value))}
              >
                <option value="">Sélectionner</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.prenom} {emp.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="mt-4">
          <button className="btn-primary" onClick={downloadPdf}>
            <FileText className="h-4 w-4 mr-2" />
            Télécharger le PDF
          </button>
        </div>
      </div>
    </div>
  )
}