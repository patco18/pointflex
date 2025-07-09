import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { adminService } from '../services/api'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import AttendanceHistory from '../components/AttendanceHistory'

export default function EmployeeDetailsPage() {
  const { id } = useParams()
  const employeeId = parseInt(id || '0', 10)

  const [employee, setEmployee] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await adminService.getEmployeeAttendance(employeeId)
        setEmployee(resp.data.employee)
        setRecords(resp.data.records)
      } catch (err) {
        console.error('Error loading employee details', err)
      } finally {
        setLoading(false)
      }
    }
    if (employeeId) fetchData()
  }, [employeeId])

  if (loading) return <LoadingSpinner size="lg" text="Chargement..." />
  if (!employee) return <div className="p-4">Employé non trouvé</div>

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-2">{employee.prenom} {employee.nom}</h2>
        <p className="text-gray-600">{employee.email}</p>
        <p className="text-gray-600">Rôle: {employee.role}</p>
      </div>
      <AttendanceHistory records={records} hideFilters />
    </div>
  )
}

