import { Permission } from './roles';

// Définition des permissions liées à l'analytique
export const ANALYTICS_PERMISSIONS: Record<string, Permission> = {
  'analytics.access_basic': {
    id: 'analytics.access_basic',
    name: 'Accéder aux analyses basiques',
    description: 'Consulter les statistiques de base et les KPIs personnels',
    category: 'analytics'
  },
  'analytics.access_team': {
    id: 'analytics.access_team',
    name: 'Accéder aux analyses d\'équipe',
    description: 'Consulter les statistiques et KPIs de son équipe',
    category: 'analytics'
  },
  'analytics.access_department': {
    id: 'analytics.access_department',
    name: 'Accéder aux analyses de département',
    description: 'Consulter les statistiques et KPIs de son département',
    category: 'analytics'
  },
  'analytics.access_company': {
    id: 'analytics.access_company',
    name: 'Accéder aux analyses de l\'entreprise',
    description: 'Consulter les statistiques et KPIs de toute l\'entreprise',
    category: 'analytics'
  },
  'analytics.export_reports': {
    id: 'analytics.export_reports',
    name: 'Exporter les rapports',
    description: 'Télécharger et exporter les rapports analytiques',
    category: 'analytics'
  },
  'analytics.configure': {
    id: 'analytics.configure',
    name: 'Configurer les analyses',
    description: 'Configurer les tableaux de bord et les indicateurs de performance',
    category: 'analytics'
  },
  'analytics.view_alerts': {
    id: 'analytics.view_alerts',
    name: 'Voir les alertes',
    description: 'Consulter les alertes et notifications liées aux performances',
    category: 'analytics'
  },
  'analytics.manage_alerts': {
    id: 'analytics.manage_alerts',
    name: 'Gérer les alertes',
    description: 'Configurer les seuils et règles des alertes de performance',
    category: 'analytics'
  }
};

// Attribution des permissions analytiques à chaque rôle
export const ANALYTICS_ROLE_PERMISSIONS = {
  superadmin: [
    'analytics.access_basic',
    'analytics.access_team',
    'analytics.access_department',
    'analytics.access_company',
    'analytics.export_reports',
    'analytics.configure',
    'analytics.view_alerts',
    'analytics.manage_alerts'
  ],
  admin_rh: [
    'analytics.access_basic',
    'analytics.access_team',
    'analytics.access_department',
    'analytics.access_company',
    'analytics.export_reports',
    'analytics.configure',
    'analytics.view_alerts',
    'analytics.manage_alerts'
  ],
  chef_service: [
    'analytics.access_basic',
    'analytics.access_team',
    'analytics.access_department',
    'analytics.export_reports',
    'analytics.view_alerts'
  ],
  chef_projet: [
    'analytics.access_basic',
    'analytics.access_team',
    'analytics.export_reports',
    'analytics.view_alerts'
  ],
  manager: [
    'analytics.access_basic',
    'analytics.access_team',
    'analytics.view_alerts'
  ],
  employee: [
    'analytics.access_basic'
  ],
  auditeur: [
    'analytics.access_basic',
    'analytics.access_team',
    'analytics.access_department',
    'analytics.access_company',
    'analytics.export_reports'
  ]
};
