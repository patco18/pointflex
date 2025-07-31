import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { PlusCircle, MinusCircle, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import axios from 'axios';
import { LeaveBalance as BaseLeaveBalance, LeaveType } from '../../types/leaveTypes';

// Étendre l'interface LeaveBalance pour notre utilisation avec des informations d'affichage
interface ExtendedLeaveBalance extends BaseLeaveBalance {
  user_name: string;
  department_name: string;
}

/**
 * Composant pour la gestion des soldes de congés
 * Accessible pour les managers, chefs de service et administrateurs RH
 */
export default function LeaveBalancesPage() {
  const { checkPermission } = usePermissions();
  
  // Vérification des permissions
  const canManageBalancesTeam = checkPermission('leave.manage_balances_team');
  const canManageBalancesDepartment = checkPermission('leave.manage_balances_department');
  const canManageBalancesAll = checkPermission('leave.manage_balances_all');
  
  // Données des soldes et filtres
  const [balances, setBalances] = useState<ExtendedLeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('all');
  
  // Modal pour ajuster les soldes
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [selectedBalance, setSelectedBalance] = useState<ExtendedLeaveBalance | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  
  // Chargement initial des données
  useEffect(() => {
    // Vérifier si l'utilisateur a les permissions nécessaires
    if (!canManageBalancesTeam && !canManageBalancesDepartment && !canManageBalancesAll) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simuler un délai d'API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Générer des données de test pour les types de congés
        const mockLeaveTypes: LeaveType[] = [
          { id: 1, name: 'Congés payés', is_paid: true, is_active: true, color: '#4CAF50', default_limit_days: 25 },
          { id: 2, name: 'RTT', is_paid: true, is_active: true, color: '#2196F3', default_limit_days: 12 },
          { id: 3, name: 'Congé maladie', is_paid: true, is_active: true, color: '#F44336' },
          { id: 4, name: 'Congé sans solde', is_paid: false, is_active: true, color: '#FF9800' }
        ];
        
        setLeaveTypes(mockLeaveTypes);
        
        // Générer des données de test pour les soldes
        const mockBalances = generateMockBalances(mockLeaveTypes);
        setBalances(mockBalances);
        
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError('Erreur lors du chargement des données des soldes de congés');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [canManageBalancesTeam, canManageBalancesDepartment, canManageBalancesAll]);
  
  // Générer des données de test pour les soldes
  const generateMockBalances = (types: LeaveType[]): ExtendedLeaveBalance[] => {
    const departments = ['IT', 'Marketing', 'Finance', 'RH', 'Commercial'];
    const users = [
      { id: 1, name: 'Jean Dupont', department: 'IT' },
      { id: 2, name: 'Marie Martin', department: 'Marketing' },
      { id: 3, name: 'Pierre Durand', department: 'Finance' },
      { id: 4, name: 'Sophie Petit', department: 'RH' },
      { id: 5, name: 'Lucas Moreau', department: 'IT' },
      { id: 6, name: 'Emma Bernard', department: 'Marketing' },
      { id: 7, name: 'Léo Thomas', department: 'Finance' },
      { id: 8, name: 'Chloé Richard', department: 'Commercial' },
      { id: 9, name: 'Hugo Robert', department: 'IT' },
      { id: 10, name: 'Alice Simon', department: 'RH' }
    ];
    
    // Générer des balances pour chaque utilisateur et type de congé
    let balances: ExtendedLeaveBalance[] = [];
    let balanceId = 1;
    
    users.forEach(user => {
      types.forEach(type => {
        if (type.id <= 2) { // Seulement les types avec limite par défaut
          const initialBalance = type.default_limit_days || Math.floor(Math.random() * 20) + 5;
          const used = Math.floor(Math.random() * initialBalance * 0.7);
          const pending = Math.floor(Math.random() * 5);
          
          balances.push({
            id: balanceId++,
            user_id: user.id,
            user_name: user.name,
            department_name: user.department,
            leave_type_id: type.id,
            leave_type_name: type.name,
            balance_days: initialBalance - used,
            initial_balance_days: initialBalance,
            used_days: used,
            pending_days: pending,
            accrual_rate: type.id === 1 ? 2.08 : undefined, // 25 jours par an pour CP
            balance_expiry_date: type.id === 1 ? `${new Date().getFullYear()}-12-31` : undefined,
            year: new Date().getFullYear()
          });
        }
      });
    });
    
    return balances;
  };
  
  // Filtrer les soldes selon les critères
  const filteredBalances = balances.filter(balance => {
    // Filtrer par recherche (nom d'utilisateur)
    const matchesSearch = balance.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtrer par département
    const matchesDepartment = selectedDepartment === 'all' || balance.department_name === selectedDepartment;
    
    // Filtrer par type de congé
    const matchesLeaveType = selectedLeaveType === 'all' || balance.leave_type_id.toString() === selectedLeaveType;
    
    return matchesSearch && matchesDepartment && matchesLeaveType;
  });
  
  // Liste unique des départements pour le filtre
  const departments = Array.from(new Set(balances.map(balance => balance.department_name)));
  
  // Ouvrir le modal pour ajuster un solde
  const openAdjustModal = (balance: ExtendedLeaveBalance) => {
    setSelectedBalance(balance);
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setShowAdjustModal(true);
  };
  
  // Soumettre l'ajustement du solde
  const handleAdjustBalance = async () => {
    if (!selectedBalance || !adjustmentAmount) return;
    
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount)) return;
    
    try {
      setLoading(true);
      
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mettre à jour localement
      setBalances(prevBalances => 
        prevBalances.map(balance => {
          if (balance.id === selectedBalance.id) {
            const newBalance = balance.balance_days + amount;
            return {
              ...balance,
              balance_days: newBalance < 0 ? 0 : newBalance
            };
          }
          return balance;
        })
      );
      
      // Fermer le modal
      setShowAdjustModal(false);
      setSelectedBalance(null);
      
    } catch (error) {
      console.error('Erreur lors de l\'ajustement du solde:', error);
      setError('Erreur lors de l\'ajustement du solde');
    } finally {
      setLoading(false);
    }
  };
  
  // Si l'utilisateur n'a pas les permissions nécessaires
  if (!canManageBalancesTeam && !canManageBalancesDepartment && !canManageBalancesAll) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Accès non autorisé</h2>
        <p className="text-gray-600">
          Vous n'avez pas les permissions nécessaires pour gérer les soldes de congés.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Gestion des Soldes de Congés</h2>
        
        <button
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          onClick={() => alert("Fonctionnalité: Rechargement annuel des soldes")}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Recharger les soldes
        </button>
      </div>
      
      {/* Filtres et recherche */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche par nom */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher un employé
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Nom de l'employé"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Filtre par département */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              Département
            </label>
            <select
              id="department"
              name="department"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="all">Tous les départements</option>
              {departments.map((dept, index) => (
                <option key={index} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filtre par type de congé */}
          <div>
            <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-1">
              Type de congé
            </label>
            <select
              id="leaveType"
              name="leaveType"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
            >
              <option value="all">Tous les types</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Afficher le message d'erreur */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}
      
      {/* Tableau des soldes */}
      {loading && balances.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredBalances.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucun solde ne correspond à vos critères</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Département
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type de congé
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solde actuel
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solde initial
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisé
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  En attente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBalances.map((balance) => (
                <tr key={balance.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {balance.user_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {balance.department_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" style={{ 
                      backgroundColor: leaveTypes.find(t => t.id === balance.leave_type_id)?.color + '20',
                      color: leaveTypes.find(t => t.id === balance.leave_type_id)?.color
                    }}>
                      {balance.leave_type_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={`${balance.balance_days < 5 ? 'text-red-600' : 'text-gray-900'}`}>
                      {balance.balance_days.toFixed(1)} jour{balance.balance_days !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {balance.initial_balance_days.toFixed(1)} jour{balance.initial_balance_days !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {balance.used_days.toFixed(1)} jour{balance.used_days !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {balance.pending_days > 0 ? (
                      <span className="text-yellow-600">
                        {balance.pending_days.toFixed(1)} jour{balance.pending_days !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => openAdjustModal(balance)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Ajuster le solde"
                      >
                        <PlusCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBalance(balance);
                          setAdjustmentAmount('-1');
                          setShowAdjustModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Déduire du solde"
                      >
                        <MinusCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal pour ajuster le solde */}
      {showAdjustModal && selectedBalance && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="relative bg-white rounded-lg max-w-md w-full m-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {parseFloat(adjustmentAmount || '0') >= 0 ? 'Ajouter' : 'Déduire'} des jours de congés
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Employé: <span className="font-medium">{selectedBalance.user_name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Type de congé: <span className="font-medium">{selectedBalance.leave_type_name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Solde actuel: <span className="font-medium">{selectedBalance.balance_days.toFixed(1)} jours</span>
              </p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="adjustment-amount" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de jours à {parseFloat(adjustmentAmount || '0') >= 0 ? 'ajouter' : 'déduire'}
              </label>
              <input
                type="number"
                id="adjustment-amount"
                step="0.5"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="Nombre de jours"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="adjustment-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Motif de l'ajustement
              </label>
              <textarea
                id="adjustment-reason"
                rows={3}
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="Raison de l'ajustement..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAdjustBalance}
                disabled={!adjustmentAmount}
                className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  parseFloat(adjustmentAmount || '0') >= 0
                    ? 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                } ${!adjustmentAmount ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {parseFloat(adjustmentAmount || '0') >= 0 ? 'Ajouter' : 'Déduire'} des jours
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
