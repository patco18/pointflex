import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { superAdminService } from '../../../services/api';
import { History, ArrowLeft, Calendar } from 'lucide-react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Company {
  name: string;
  current_plan: string;
}

interface HistoryEntry {
  id: number;
  created_at: string;
  user_name: string;
  old_plan_name: string;
  new_plan_name: string;
  old_max_employees: number;
  new_max_employees: number;
  change_reason: string;
}

/**
 * Composant pour afficher l'historique des changements de plan d'abonnement d'une entreprise
 */
const SubscriptionHistoryView = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Charger l'historique des abonnements
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await superAdminService.getCompanySubscriptionHistory(Number(companyId));
        
        if (response.data.success) {
          setCompany({
            name: response.data.company_name,
            current_plan: response.data.current_plan
          });
          setHistory(response.data.history || []);
        } else {
          setError(response.data.message || 'Erreur lors du chargement de l\'historique');
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique des abonnements', error);
        setError('Erreur lors du chargement de l\'historique des abonnements');
        toast.error('Erreur lors du chargement de l\'historique des abonnements');
      } finally {
        setLoading(false);
      }
    };
    
    if (companyId) {
      fetchHistory();
    }
  }, [companyId]);
  
  // Formater une date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Inconnu';
    
    try {
      const date = parseISO(dateString);
      return format(date, 'PPP', { locale: fr });
    } catch (e) {
      return dateString;
    }
  };
  
  // Calculer le temps écoulé depuis un changement
  const timeAgo = (dateString?: string) => {
    if (!dateString) return '';
    
    try {
      const date = parseISO(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } catch (e) {
      return '';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="my-8">
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link to="/superadmin/subscription/companies" className="text-gray-700 hover:text-blue-600">
                Gestion des abonnements
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-500">
                  {company ? company.name : 'Chargement...'}
                </span>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-500">
                  Historique des abonnements
                </span>
              </div>
            </li>
          </ol>
        </nav>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <History className="h-6 w-6 mr-2 text-blue-600" />
            <h1 className="text-2xl font-bold">
              Historique des abonnements
            </h1>
          </div>
          
          <button
            className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 bg-white rounded hover:bg-blue-50"
            onClick={() => navigate('/superadmin/subscription/companies')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-md shadow mb-8 p-6">
              <h2 className="text-xl font-semibold mb-2">
                {company ? company.name : ''}
              </h2>
              <div className="flex items-center mt-2">
                <p className="mr-2 text-gray-700">
                  Plan actuel :
                </p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {company ? company.current_plan : 'Inconnu'}
                </span>
              </div>
            </div>
            
            <h2 className="text-xl font-semibold mt-6 mb-4">
              Historique des modifications
            </h2>
            
            {history.length === 0 ? (
              <div className="bg-white rounded-md shadow p-8 text-center">
                <p className="text-gray-600">
                  Aucun historique disponible
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-md shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ancien plan
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nouveau plan
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Changement d'employés max
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Raison
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(entry.created_at)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {timeAgo(entry.created_at)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.user_name || 'Système'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.old_plan_name || 'Pas de plan précédent'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                          {entry.new_plan_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {entry.old_max_employees !== entry.new_max_employees ? (
                            <p>
                              {entry.old_max_employees} → <strong>{entry.new_max_employees}</strong>
                            </p>
                          ) : (
                            <p className="text-gray-500">
                              Aucun changement
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.change_reason || 'Aucune raison spécifiée'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionHistoryView;
