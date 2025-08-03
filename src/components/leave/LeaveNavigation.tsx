import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, CalendarCheck, CalendarClock, Settings, BarChart, FileText, ChevronDown } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * Composant de menu de navigation pour la gestion des congés,
 * adapté en fonction du rôle de l'utilisateur connecté
 */
export default function LeaveNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkPermission } = usePermissions();

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

  // Définition des catégories et éléments de menu en fonction des permissions
  const categories = [
    {
      id: 'my-requests',
      label: 'Mes demandes',
      items: [
        {
          id: 'request',
          label: 'Demander un congé',
          path: '/leave/request',
          icon: <CalendarClock className="h-5 w-5" />,
          show: canRequestLeave
        },
        {
          id: 'my-history',
          label: 'Mes congés',
          path: '/leave/my-history',
          icon: <CalendarDays className="h-5 w-5" />,
          show: canViewPersonalLeave
        }
      ]
    },
    {
      id: 'team',
      label: 'Équipe',
      items: [
        {
          id: 'team-calendar',
          label: 'Calendrier d\'équipe',
          path: '/leave/team-calendar',
          icon: <CalendarCheck className="h-5 w-5" />,
          show: canViewTeamLeave || canViewDepartmentLeave || canViewAllLeave
        },
        {
          id: 'approvals',
          label: 'Approbation des congés',
          path: '/leave/approvals',
          icon: <FileText className="h-5 w-5" />,
          show: canApproveLeave
        },
        {
          id: 'balances',
          label: 'Gestion des soldes',
          path: '/leave/balances',
          icon: <BarChart className="h-5 w-5" />,
          show: canManageBalances
        }
      ]
    },
    {
      id: 'administration',
      label: 'Administration',
      items: [
        {
          id: 'admin',
          label: 'Administration des congés',
          path: '/leave/admin',
          icon: <Settings className="h-5 w-5" />,
          show: canManageLeaveTypes || canManageLeavePolicy
        }
      ]
    },
    {
      id: 'reports',
      label: 'Rapports',
      items: [
        {
          id: 'reports',
          label: 'Rapports de congés',
          path: '/leave/reports',
          icon: <BarChart className="h-5 w-5" />,
          show: canViewLeaveReports
        }
      ]
    }
  ];

  // Filtrer les éléments de menu selon les permissions
  const visibleCategories = categories
    .map(category => ({
      ...category,
      items: category.items.filter(item => item.show)
    }))
    .filter(category => category.items.length > 0);

  // Gestion de l'état des catégories collapsibles
  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    visibleCategories.forEach(category => {
      initial[category.id] = category.items.some(item => location.pathname === item.path);
    });
    return initial;
  });

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
      <div className="px-6 py-4 bg-primary-600 text-white">
        <h2 className="text-lg font-semibold flex items-center">
          <CalendarDays className="mr-2 h-5 w-5" />
          Gestion des Congés
        </h2>
      </div>
      
      <nav className="p-4">
        {visibleCategories.map((category) => (
          <div key={category.id} className="mb-4">
            <button
              onClick={() => toggleCategory(category.id)}
              className="flex w-full items-center justify-between px-4 py-2 text-left text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium">{category.label}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  openCategories[category.id] ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openCategories[category.id] && (
              <ul className="mt-2 space-y-2 pl-4">
                {category.items.map((item) => (
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
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
