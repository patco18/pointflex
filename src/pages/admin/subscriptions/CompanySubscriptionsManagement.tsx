import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminService } from '../../../services/api';
import { History, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Company {
  id: number;
  name: string;
  subscription_plan_id?: number;
  subscription_plan?: string;
  subscription_status?: string;
  subscription_expiration_date?: string;
  max_employees?: number;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  max_employees: number;
  price: number;
}

/**
 * Composant pour gérer les abonnements des entreprises
 */
const CompanySubscriptionsManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Charger les données initiales
  useEffect(() => {
    Promise.all([
      fetchCompanies(),
      fetchSubscriptionPlans()
    ]).then(() => {
      setLoading(false);
    });
  }, []);

  // Récupérer les entreprises
  const fetchCompanies = async () => {
    try {
      const response = await superAdminService.getCompanies();
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des entreprises', error);
      toast.error('Erreur lors de la récupération des entreprises');
    }
  };

  // Récupérer les plans d'abonnement
  const fetchSubscriptionPlans = async () => {
    try {
      const response = await superAdminService.getSubscriptionPlans();
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des plans d\'abonnement', error);
      toast.error('Erreur lors de la récupération des plans d\'abonnement');
    }
  };

  // Ouvrir la boîte de dialogue pour changer le plan d'une entreprise
  const handleOpenDialog = (company: Company) => {
    setSelectedCompany(company);
    setDialogOpen(true);
  };

  // Fermer la boîte de dialogue
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCompany(null);
  };

  // Mettre à jour le plan d'abonnement d'une entreprise
  const handleUpdateSubscription = async (companyId: number, planId: number) => {
    try {
      setLoading(true);
      await superAdminService.updateCompanySubscription(companyId, planId);
      
      toast.success('Plan d\'abonnement mis à jour avec succès');
      await fetchCompanies();
      handleCloseDialog();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'abonnement', error);
      toast.error('Erreur lors de la mise à jour du plan d\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  // Trouver le nom du plan pour un ID donné
  const getPlanNameById = (planId: number) => {
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : 'Plan inconnu';
  };

  // Formater la date d'expiration
  const formatExpirationDate = (date?: string) => {
    if (!date) return 'Pas de date d\'expiration';
    return new Date(date).toLocaleDateString();
  };

  // Vérifier l'état de l'abonnement
  const getSubscriptionStatusClass = (status?: string) => {
    if (!status) return 'text-gray-500';
    return status.toLowerCase() === 'active' ? 'text-green-600' : 'text-yellow-600';
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="my-8">
        <h1 className="text-2xl font-bold mb-4">
          Gestion des abonnements d'entreprises
        </h1>

        {loading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-md shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom de l'entreprise
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan actuel
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut de l'abonnement
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date d'expiration
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employés max
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Aucune entreprise trouvée
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {company.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.subscription_plan_id ? 
                          getPlanNameById(company.subscription_plan_id) : 
                          company.subscription_plan || 'Aucun plan'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-bold ${company.subscription_status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {company.subscription_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatExpirationDate(company.subscription_expiration_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.max_employees}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button 
                            className="inline-flex items-center px-3 py-1 border border-blue-600 text-sm font-medium rounded text-blue-600 bg-white hover:bg-blue-50"
                            onClick={() => handleOpenDialog(company)}
                          >
                            Changer de plan
                          </button>
                          <button
                            className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded text-blue-600 bg-white hover:bg-blue-50"
                            onClick={() => navigate(`/superadmin/subscription/companies/${company.id}/history`)}
                          >
                            <History className="h-4 w-4 mr-1" />
                            Historique
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal pour changer le plan d'abonnement */}
      {dialogOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleCloseDialog}></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Changer le plan d'abonnement
                    </h3>
                    {selectedCompany && (
                      <>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            Changer le plan d'abonnement pour {selectedCompany.name}
                          </p>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Plan d'abonnement
                          </label>
                          <select
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            value={selectedCompany.subscription_plan_id || ''}
                            onChange={(e) => setSelectedCompany({
                              ...selectedCompany,
                              subscription_plan_id: Number(e.target.value)
                            })}
                          >
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name} - Max {plan.max_employees} employés
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                  onClick={() => selectedCompany && handleUpdateSubscription(
                    selectedCompany.id, 
                    selectedCompany.subscription_plan_id || 0
                  )}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="inline-block h-4 w-4 mr-2 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                  ) : 'Enregistrer'}
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseDialog}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySubscriptionsManagement;
