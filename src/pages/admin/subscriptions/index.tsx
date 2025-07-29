import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SubscriptionPlansManagement from './SubscriptionPlansManagement';
import CompanySubscriptionsManagement from './CompanySubscriptionsManagement';
import SubscriptionHistoryView from './SubscriptionHistoryView';
import SubscriptionPlansDisplay from './SubscriptionPlansDisplay';

/**
 * Module de gestion des abonnements pour les administrateurs
 * Inclut la gestion des plans d'abonnement, des abonnements des entreprises
 * et l'historique des changements d'abonnement
 */
const SubscriptionManagementModule: React.FC = () => {
  return (
    <Routes>
      <Route path="plans" element={<SubscriptionPlansManagement />} />
      <Route path="plans/display" element={<SubscriptionPlansDisplay />} />
      <Route path="companies" element={<CompanySubscriptionsManagement />} />
      <Route path="companies/:companyId/history" element={<SubscriptionHistoryView />} />
      <Route path="/" element={<Navigate to="plans" replace />} />
    </Routes>
  );
};

export default SubscriptionManagementModule;
