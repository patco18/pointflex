import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// Import des modules sous forme de composants autonomes pour éviter les imports dynamiques
const SubscriptionPlansManagement = () => {
  return <div>Chargement du module de gestion des plans...</div>;
};

const CompanySubscriptionsManagement = () => {
  return <div>Chargement du module de gestion des abonnements...</div>;
};

/**
 * Module de gestion des abonnements pour les administrateurs
 * Inclut la gestion des plans d'abonnement et des abonnements des entreprises
 */
const SubscriptionManagementModule = () => {
  return (
    <Routes>
      <Route path="plans" element={<SubscriptionPlansManagement />} />
      <Route path="companies" element={<CompanySubscriptionsManagement />} />
      <Route path="/" element={<Navigate to="plans" replace />} />
    </Routes>
  );
};

export default SubscriptionManagementModule;
