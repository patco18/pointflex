import { useState } from 'react'
import toast from 'react-hot-toast'
import { 
  BarChart3, 
  Download, 
  TrendingUp,
  Users,
  Clock,
  FileText
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { adminService } from '../services/api'

export default function AdvancedReports() {
  const { isAdmin } = useAuth()

  const downloadPdf = async () => {
    try {
      const response = await adminService.downloadAttendancePdf()
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'attendance_report.pdf'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Rapport téléchargé')
    } catch (error) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de rapport
            </label>
            <select className="input-field">
              <option>Rapport mensuel</option>
              <option>Rapport hebdomadaire</option>
              <option>Rapport personnalisé</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <select className="input-field">
              <option>PDF</option>
              <option>Excel</option>
              <option>CSV</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button className="btn-primary">
            <BarChart3 className="h-4 w-4 mr-2" />
            Générer le rapport
          </button>
        </div>
      </div>
    </div>
  )
}