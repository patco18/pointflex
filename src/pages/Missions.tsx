import React, { useEffect, useState } from 'react'
import { missionService } from '../services/api'
import { Plus, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface Mission {
  id: number
  order_number: string
  title: string
  description?: string
  status: string
}

export default function Missions() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ order_number: '', title: '', description: '' })

  const fetchMissions = async () => {
    setLoading(true)
    try {
      const resp = await missionService.getMissions()
      setMissions(resp.data.missions)
    } catch (error) {
      toast.error('Erreur lors du chargement des missions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMissions()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.order_number.trim() || !form.title.trim()) {
      toast.error('Numéro et titre requis')
      return
    }
    try {
      await missionService.createMission(form)
      toast.success('Mission créée')
      setForm({ order_number: '', title: '', description: '' })
      fetchMissions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Missions</h1>

      <form onSubmit={handleCreate} className="bg-white p-4 rounded shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Numéro d'ordre</label>
          <input
            className="input-field"
            value={form.order_number}
            onChange={e => setForm({ ...form, order_number: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Titre</label>
          <input
            className="input-field"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="input-field"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary flex items-center"><Plus className="h-4 w-4 mr-1" />Créer</button>
      </form>

      <div className="bg-white rounded shadow">
        {loading ? (
          <div className="p-4 text-center"><Loader className="animate-spin inline-block" /></div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-semibold">Numéro</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Titre</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {missions.map(m => (
                <tr key={m.id}>
                  <td className="px-4 py-2">{m.order_number}</td>
                  <td className="px-4 py-2">{m.title}</td>
                  <td className="px-4 py-2">{m.status}</td>
                </tr>
              ))}
              {missions.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">Aucune mission</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
