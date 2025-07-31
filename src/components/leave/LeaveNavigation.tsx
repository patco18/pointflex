import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, CalendarCheck, CalendarClock, Users, Settings, BarChart, FileText } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import RoleBasedAccess from '../../components/RoleBasedAccess';

/**
 * Composant de menu de navigation pour la gestion des congés,
 * adapté en fonction du rôle de l'utilisateur connecté
 */
export default function LeaveNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkPermission, userRole } = usePermissions();

  // Obtention des permissions spécifiques aux congés
  const canRequestLeave = checkPermission('leave.request');
  const canViewPersonalLeave = checkPermission('leave.view_personal');
  const canViewTeamLeave = checkPermission('leave.view_team');
  const canViewDepartmentLeave = checkPermission('leave.view_department');
  const canViewAllLeave = checkPermission('leave.view_all');
  const canApproveLeave = checkPermission('leave.approve_team') || 
                          checkPermission('leave.approve_department') || 
                          checkPermission('leave.approve_all');
  const canManageLeaveTypes = checkPermission('leave.manage_types');
  const canManageLeavePolicy = checkPermission('leave.manage_policy');
  const canViewLeaveReports = checkPermission('leave.view_reports');
  const canManageBalances = checkPermission('leave.manage_balances_team') || 
                            checkPermission('leave.manage_balances_department') || 
                            checkPermission('leave.manage_balances_all');

  // Définition des éléments de menu en fonction des permissions
  const menuItems = [
    // Demande de congés - disponible pour tous sauf auditeurs
    {
      id: 'request',
      label: 'Demander un congé',
      path: '/leave/request',
      icon: <CalendarClock className="h-5 w-5" />,
      show: canRequestLeave
    },
    // Mes congés - disponible pour tous sauf auditeurs
    {
      id: 'my-history',
      label: 'Mes congés',
      path: '/leave/my-history',
      icon: <CalendarDays className="h-5 w-5" />,
      show: canViewPersonalLeave
    },
    // Calendrier d'équipe - pour managers et au-dessus
    {
      id: 'team-calendar',
      label: 'Calendrier d\'équipe',
      path: '/leave/team-calendar',
      icon: <CalendarCheck className="h-5 w-5" />,
      show: canViewTeamLeave || canViewDepartmentLeave || canViewAllLeave
    },
    // Approbation des congés - pour managers et au-dessus
    {
      id: 'approvals',
      label: 'Approbation des congés',
      path: '/leave/approvals',
      icon: <FileText className="h-5 w-5" />,
      show: canApproveLeave
    },
    // Gestion des soldes - pour managers et au-dessus
    {
      id: 'balances',
      label: 'Gestion des soldes',
      path: '/leave/balances',
      icon: <BarChart className="h-5 w-5" />,
      show: canManageBalances
    },
    // Administration des congés - pour admins uniquement
    {
      id: 'admin',
      label: 'Administration des congés',
      path: '/leave/admin',
      icon: <Settings className="h-5 w-5" />,
      show: canManageLeaveTypes || canManageLeavePolicy
    },
    // Rapports de congés - pour managers et au-dessus
    {
      id: 'reports',
      label: 'Rapports de congés',
      path: '/leave/reports',
      icon: <BarChart className="h-5 w-5" />,
      show: canViewLeaveReports
    }
  ];

  // Filtrer les éléments de menu selon les permissions
  const visibleMenuItems = menuItems.filter(item => item.show);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
      <div className="px-6 py-4 bg-primary-600 text-white">
        <h2 className="text-lg font-semibold flex items-center">
          <CalendarDays className="mr-2 h-5 w-5" />
          Gestion des Congés
        </h2>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {visibleMenuItems.map((item) => (
            <li key={item.id}>
              <a
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3 text-gray-500">{item.icon}</span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
