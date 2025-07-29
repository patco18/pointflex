import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function DebugPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true)
        // Utiliser une route de débogage qui ne nécessite pas d'authentification
        const response = await axios.get('/api/subscription/debug/plans')
        setPlans(response.data.plans || [])
        setError(null)
      } catch (err: any) {
        console.error('Erreur débogage plans:', err)
        setError(err.response?.data?.message || err.message || 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }
    
    fetchPlans()
  }, [])
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Page de débogage</h1>
        <button 
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300" 
          onClick={() => navigate(-1)}
        >
          Retour
        </button>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-800">
          Cette page est destinée uniquement au débogage et sera supprimée en production.
        </p>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Plans d'abonnement (debug)</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-500">Chargement des plans...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-red-700">Erreur: {error}</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-green-600">{plans.length} plans récupérés avec succès</p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durée</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fonctionnalités</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.duration_months} mois</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.price} €</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {Array.isArray(plan.features) ? (
                          <ul className="list-disc list-inside">
                            {plan.features.map((feature: string, idx: number) => (
                              <li key={idx}>{feature}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-red-500">Format invalide</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  {plans.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Aucun plan trouvé</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
