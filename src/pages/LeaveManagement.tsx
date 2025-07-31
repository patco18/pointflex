import React from 'react';
import { Outlet } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import LeaveNavigation from '../components/leave/LeaveNavigation';

/**
 * Page principale de gestion des congés
 * Affiche le menu de navigation et le contenu spécifique à la route actuelle
 */
export default function LeaveManagement() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <CalendarClock className="h-8 w-8 text-primary-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Congés</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar avec le menu de navigation */}
        <div className="md:col-span-1">
          <LeaveNavigation />
        </div>

        {/* Contenu principal qui change en fonction de la route */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
