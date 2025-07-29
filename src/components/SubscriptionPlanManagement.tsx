import React, { useState, useEffect } from 'react'
import { superAdminService } from '../services/api'
import LoadingSpinner from './shared/LoadingSpinner'
import { usePermissions } from '../hooks/usePermissions'
import toast from 'react-hot-toast'
import { PlusCircle, Edit2, Trash2, Star, Check, XCircle, DollarSign, UserPlus, Calendar } from 'lucide-react'

interface SubscriptionPlan {
  id: number
  name: string
  stripe_price_id?: string
  duration_months: number
  price: number
  total_price?: number
  max_employees: number
  description?: string
  features?: string[]
  is_active: boolean
  is_featured: boolean
}

export default function SubscriptionPlanManagement() {
  const { permissions } = usePermissions()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  
  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    duration_months: 1,
    price: 0,
    max_employees: 10,
    description: '',
    features: '',
    is_active: true,
    is_featured: false,
    create_in_stripe: false
  })
  
  // Chargement des plans
  useEffect(() => {
    loadPlans()
  }, [])
  
  const loadPlans = async () => {
    try {
      setLoading(true)
      const response = await superAdminService.getSubscriptionPlans()
      setPlans(response.data.plans || [])
    } catch (error) {
      console.error('Erreur chargement plans:', error)
      toast.error('Erreur lors du chargement des plans d\'abonnement')
    } finally {
      setLoading(false)
    }
  }
  
  // Éditer un plan
  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      duration_months: plan.duration_months,
      price: plan.price,
      max_employees: plan.max_employees,
      description: plan.description || '',
      features: plan.features ? plan.features.join('\n') : '',
      is_active: plan.is_active,
      is_featured: plan.is_featured,
      create_in_stripe: false
    })
    setShowForm(true)
  }
  
  // Ouvrir le formulaire pour un nouveau plan
  const handleNewPlan = () => {
    setEditingPlan(null)
    setFormData({
      name: '',
      duration_months: 1,
      price: 0,
      max_employees: 10,
      description: '',
      features: '',
      is_active: true,
      is_featured: false,
      create_in_stripe: true
    })
    setShowForm(true)
  }
  
  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Préparer les données
      const planData = {
        ...formData,
        features: formData.features.split('\n').filter(f => f.trim() !== '')
      }
      
      if (editingPlan) {
        // Mise à jour d'un plan existant
        const response = await superAdminService.updateSubscriptionPlan(editingPlan.id, planData)
        toast.success('Plan d\'abonnement mis à jour')
        
        // Mettre à jour l'état local
        setPlans(plans.map(p => p.id === editingPlan.id ? response.data.plan : p))
      } else {
        // Création d'un nouveau plan
        const response = await superAdminService.createSubscriptionPlan(planData)
        toast.success('Plan d\'abonnement créé')
        
        // Ajouter à l'état local
        setPlans([...plans, response.data.plan])
      }
      
      // Fermer le formulaire
      setShowForm(false)
      setEditingPlan(null)
      
      // Recharger pour être sûr d'avoir les données les plus récentes
      loadPlans()
    } catch (error) {
      console.error('Erreur soumission plan:', error)
      toast.error('Erreur lors de l\'enregistrement du plan')
    }
  }
  
  // Supprimer un plan
  const handleDelete = async (planId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plan d\'abonnement ?')) {
      return
    }
    
    try {
      await superAdminService.deleteSubscriptionPlan(planId)
      toast.success('Plan d\'abonnement supprimé')
      
      // Mettre à jour l'état local
      setPlans(plans.filter(p => p.id !== planId))
    } catch (error) {
      console.error('Erreur suppression plan:', error)
      toast.error('Erreur lors de la suppression du plan')
    }
  }
  
  // Si l'utilisateur n'est pas superadmin
  if (!permissions.canGlobalManagement) {
    return (
      <div className="card text-center">
        <p className="text-gray-600">Accès SuperAdmin requis</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des plans d'abonnement</h1>
        <div className="flex space-x-2">
          <a 
            href="/debug" 
            target="_blank"
            className="btn-outline flex items-center text-amber-600 hover:text-amber-700"
          >
            Déboguer
          </a>
          <button 
            onClick={handleNewPlan}
            className="btn-primary flex items-center"
          >
            <PlusCircle className="h-4 w-4 mr-1" /> Nouveau plan
          </button>
        </div>
      </div>
      
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">
            {editingPlan ? 'Modifier le plan' : 'Créer un nouveau plan'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du plan
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field w-full"
                  placeholder="ex: Starter, Premium, Enterprise"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durée (mois)
                </label>
                <select
                  value={formData.duration_months}
                  onChange={(e) => setFormData({...formData, duration_months: parseInt(e.target.value)})}
                  className="input-field w-full"
                  required
                >
                  <option value={1}>1 mois</option>
                  <option value={3}>3 mois</option>
                  <option value={6}>6 mois</option>
                  <option value={12}>12 mois</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix (€/mois)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                  className="input-field w-full"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre maximum d'employés
                </label>
                <input
                  type="number"
                  value={formData.max_employees}
                  onChange={(e) => setFormData({...formData, max_employees: parseInt(e.target.value)})}
                  className="input-field w-full"
                  min="1"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-field w-full"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fonctionnalités (une par ligne)
                </label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({...formData, features: e.target.value})}
                  className="input-field w-full"
                  rows={5}
                  placeholder="Pointage illimité&#10;Exports PDF&#10;Notifications email&#10;etc."
                ></textarea>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Actif
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                  />
                  <label htmlFor="is_featured" className="ml-2 block text-sm text-gray-900">
                    Mis en avant
                  </label>
                </div>
                
                {!editingPlan && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="create_in_stripe"
                      checked={formData.create_in_stripe}
                      onChange={(e) => setFormData({...formData, create_in_stripe: e.target.checked})}
                      className="h-4 w-4 text-primary border-gray-300 rounded"
                    />
                    <label htmlFor="create_in_stripe" className="ml-2 block text-sm text-gray-900">
                      Créer dans Stripe
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-outline"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {editingPlan ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading ? (
        <LoadingSpinner text="Chargement des plans..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`bg-white shadow rounded-lg overflow-hidden border ${plan.is_featured ? 'border-blue-500' : 'border-gray-200'}`}
            >
              <div className={`px-4 py-5 border-b ${plan.is_featured ? 'bg-blue-50 border-blue-100' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {plan.name} {plan.is_featured && <Star className="h-4 w-4 text-blue-500 inline ml-1" />}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="text-gray-500 hover:text-blue-600"
                      title="Modifier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="text-gray-500 hover:text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {plan.duration_months} {plan.duration_months > 1 ? 'mois' : 'mois'}
                  </span>
                  {!plan.is_active && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactif
                    </span>
                  )}
                </div>
              </div>
              
              <div className="px-4 py-4">
                <div className="flex items-center text-2xl font-bold text-gray-900 mb-2">
                  {plan.price} € <span className="text-sm font-normal text-gray-500 ml-1">/ mois</span>
                </div>
                
                <div className="text-sm text-gray-600 mb-3">
                  <div className="flex items-center mb-1">
                    <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                    Prix total : {(plan.price * plan.duration_months).toFixed(2)} €
                  </div>
                  <div className="flex items-center mb-1">
                    <UserPlus className="h-4 w-4 mr-1 text-gray-500" />
                    Max {plan.max_employees} employés
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                    Durée : {plan.duration_months} mois
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                
                <div className="space-y-2">
                  {plan.features && plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {plan.stripe_price_id && (
                <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500">
                  ID Stripe: {plan.stripe_price_id}
                </div>
              )}
            </div>
          ))}
          
          {plans.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 text-center py-12">
              <p className="text-gray-500">Aucun plan d'abonnement défini</p>
              <button 
                onClick={handleNewPlan}
                className="btn-primary flex items-center mx-auto mt-4"
              >
                <PlusCircle className="h-4 w-4 mr-1" /> Créer un premier plan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
