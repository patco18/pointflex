import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../services/api';

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  duration_months: number;
  max_employees: number;
  description: string;
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  stripe_price_id?: string;
  display_order?: number;
}

const SubscriptionPlansDisplay: React.FC = () => {
  // Utilise notre hook useApi pour récupérer les plans
  const { data: plansResp, loading, error } = useApi(() => api.get('/subscription/plans'));
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Utilise notre hook useApi pour récupérer les plans admin (pour comparer)
  const { data: adminPlansResp } = useApi(() => api.get('/superadmin/subscription-plans'));

  useEffect(() => {
    if (plansResp) {
      const plansData = plansResp as any;
      if (plansData.plans) {
        setPlans(plansData.plans);
      }
    }
  }, [plansResp]);

  const adminPlansData = adminPlansResp as any;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h2 className="font-bold">Erreur</h2>
        <p>Impossible de charger les plans d'abonnement</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Plans d'abonnement actuels</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Informations système</h2>
        <ul className="list-disc pl-5">
          <li>Nombre de plans dans la base: {plans.length}</li>
          <li>Plans administrateur: {adminPlansData?.plans?.length || 'Non disponible'}</li>
        </ul>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="overflow-hidden border rounded-lg shadow-sm">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex justify-between items-center">
              <div className="text-xl font-semibold">{plan.name}</div>
              <div className="flex space-x-2">
                {plan.is_featured && (
                  <span className="px-2 py-1 text-xs bg-yellow-400 text-white rounded-full">Mis en avant</span>
                )}
                {plan.is_active ? (
                  <span className="px-2 py-1 text-xs bg-green-500 text-white rounded-full">Actif</span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">Inactif</span>
                )}
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-800">
                  {plan.price} €<span className="text-sm text-gray-600">/mois</span>
                </div>
                <div className="text-gray-500">
                  Durée: {plan.duration_months} mois
                </div>
                <div className="text-gray-500">
                  Max employés: {plan.max_employees > 999 ? 'Illimité' : plan.max_employees}
                </div>
              </div>
              
              {plan.description && (
                <div className="mb-4 text-gray-700">
                  {plan.description}
                </div>
              )}
              
              {plan.features && plan.features.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Fonctionnalités</h3>
                  <ul className="list-disc pl-5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="text-gray-700">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">ID: {plan.id}</span>
                {plan.stripe_price_id && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    Stripe: {plan.stripe_price_id.substring(0, 8)}...
                  </span>
                )}
                {plan.display_order !== undefined && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Ordre: {plan.display_order}</span>
                )}
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                <div>Créé: {new Date(plan.created_at).toLocaleString()}</div>
                <div>Mis à jour: {new Date(plan.updated_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {plans.length === 0 && (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-500">
            Aucun plan d'abonnement trouvé dans la base de données
          </h3>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlansDisplay;
