// Types pour les permissions liées à la gestion des congés
import { Permission } from './roles';

// Nouvelles permissions spécifiques pour la gestion des congés
export const LEAVE_PERMISSIONS: Record<string, Permission> = {
  // Permissions pour les demandes de congés
  'leave.request': {
    id: 'leave.request',
    name: 'Demander congé',
    description: 'Soumettre des demandes de congés pour soi-même',
    category: 'gestion_equipe'
  },
  'leave.view_personal': {
    id: 'leave.view_personal',
    name: 'Voir congés personnels',
    description: 'Consulter son historique de congés et soldes',
    category: 'gestion_equipe'
  },
  'leave.view_team': {
    id: 'leave.view_team',
    name: 'Voir congés équipe',
    description: 'Consulter les congés des membres de son équipe',
    category: 'gestion_equipe'
  },
  'leave.view_department': {
    id: 'leave.view_department',
    name: 'Voir congés département',
    description: 'Consulter les congés de tout un département',
    category: 'gestion_equipe'
  },
  'leave.view_all': {
    id: 'leave.view_all',
    name: 'Voir tous les congés',
    description: 'Consulter les congés de toute l\'entreprise',
    category: 'gestion_equipe'
  },
  
  // Permissions pour l'approbation des congés
  'leave.approve_team': {
    id: 'leave.approve_team',
    name: 'Approuver congés équipe',
    description: 'Approuver/rejeter les demandes de congés de son équipe',
    category: 'gestion_equipe'
  },
  'leave.approve_department': {
    id: 'leave.approve_department',
    name: 'Approuver congés département',
    description: 'Approuver/rejeter les demandes de congés de son département',
    category: 'gestion_equipe'
  },
  'leave.approve_all': {
    id: 'leave.approve_all',
    name: 'Approuver tous congés',
    description: 'Approuver/rejeter les demandes de congés de toute l\'entreprise',
    category: 'gestion_equipe'
  },
  
  // Permissions pour la gestion des soldes de congés
  'leave.manage_balances_team': {
    id: 'leave.manage_balances_team',
    name: 'Gérer soldes équipe',
    description: 'Ajuster les soldes de congés de son équipe',
    category: 'gestion_equipe'
  },
  'leave.manage_balances_department': {
    id: 'leave.manage_balances_department',
    name: 'Gérer soldes département',
    description: 'Ajuster les soldes de congés de son département',
    category: 'gestion_equipe'
  },
  'leave.manage_balances_all': {
    id: 'leave.manage_balances_all',
    name: 'Gérer tous soldes',
    description: 'Ajuster les soldes de congés de toute l\'entreprise',
    category: 'gestion_equipe'
  },
  
  // Permissions pour la configuration du système de congés
  'leave.manage_types': {
    id: 'leave.manage_types',
    name: 'Gérer types de congés',
    description: 'Créer et modifier les types de congés',
    category: 'administration'
  },
  'leave.manage_policy': {
    id: 'leave.manage_policy',
    name: 'Gérer politique de congés',
    description: 'Configurer les règles et paramètres de congés',
    category: 'administration'
  },
  'leave.view_reports': {
    id: 'leave.view_reports',
    name: 'Rapports de congés',
    description: 'Générer et consulter des rapports sur les congés',
    category: 'rapports'
  },
};

// Attribution des permissions de congés aux rôles existants
export const LEAVE_ROLE_PERMISSIONS = {
  superadmin: [
    'leave.request',
    'leave.view_personal',
    'leave.view_all',
    'leave.approve_all',
    'leave.manage_balances_all',
    'leave.manage_types',
    'leave.manage_policy',
    'leave.view_reports'
  ],
  admin_rh: [
    'leave.request',
    'leave.view_personal',
    'leave.view_all',
    'leave.approve_all',
    'leave.manage_balances_all',
    'leave.manage_types',
    'leave.manage_policy',
    'leave.view_reports'
  ],
  chef_service: [
    'leave.request',
    'leave.view_personal',
    'leave.view_department',
    'leave.approve_department',
    'leave.manage_balances_team',
    'leave.view_reports'
  ],
  chef_projet: [
    'leave.request',
    'leave.view_personal',
    'leave.view_team',
    'leave.approve_team',
    'leave.view_reports'
  ],
  manager: [
    'leave.request',
    'leave.view_personal',
    'leave.view_team',
    'leave.approve_team'
  ],
  employee: [
    'leave.request',
    'leave.view_personal'
  ],
  auditeur: [
    'leave.view_all',
    'leave.view_reports'
  ]
};
