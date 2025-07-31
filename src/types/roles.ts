// Import des permissions de congés et d'analytique
import { LEAVE_PERMISSIONS, LEAVE_ROLE_PERMISSIONS } from './leavePermissions';
import { ANALYTICS_PERMISSIONS, ANALYTICS_ROLE_PERMISSIONS } from './analyticsPermissions';

// Types pour le système de rôles étendu
export type UserRole = 
  | 'superadmin' 
  | 'admin_rh' 
  | 'chef_service' 
  | 'chef_projet' 
  | 'manager' 
  | 'employee' 
  | 'auditeur'

export interface Permission {
  id: string
  name: string
  description: string
  category: 'pointage' | 'gestion_equipe' | 'rapports' | 'administration' | 'missions' | 'audit' | 'analytics'
}

export interface RoleDefinition {
  id: UserRole
  name: string
  description: string
  level: number // Niveau hiérarchique (1 = plus élevé)
  permissions: string[]
  color: string
  icon: string
}

// Définition des permissions
export const PERMISSIONS: Record<string, Permission> = {
  // On ajoute également toutes les permissions de congés et d'analytique
  ...LEAVE_PERMISSIONS,
  ...ANALYTICS_PERMISSIONS,
  // Pointage
  'pointage.self': {
    id: 'pointage.self',
    name: 'Pointage personnel',
    description: 'Effectuer son propre pointage entrée/sortie',
    category: 'pointage'
  },
  'pointage.view_team': {
    id: 'pointage.view_team',
    name: 'Voir pointages équipe',
    description: 'Consulter les pointages de son équipe',
    category: 'pointage'
  },
  'pointage.validate': {
    id: 'pointage.validate',
    name: 'Valider pointages',
    description: 'Valider ou rejeter les pointages',
    category: 'pointage'
  },
  'pointage.edit_team': {
    id: 'pointage.edit_team',
    name: 'Modifier pointages équipe',
    description: 'Corriger les pointages de son équipe',
    category: 'pointage'
  },

  // Gestion d'équipe
  'team.view': {
    id: 'team.view',
    name: 'Voir équipe',
    description: 'Consulter les informations de son équipe',
    category: 'gestion_equipe'
  },
  'team.manage': {
    id: 'team.manage',
    name: 'Gérer équipe',
    description: 'Gérer les membres de son équipe',
    category: 'gestion_equipe'
  },
  'team.create_users': {
    id: 'team.create_users',
    name: 'Créer utilisateurs',
    description: 'Créer de nouveaux utilisateurs dans l\'entreprise',
    category: 'gestion_equipe'
  },
  'team.assign_roles': {
    id: 'team.assign_roles',
    name: 'Assigner rôles',
    description: 'Assigner des rôles aux utilisateurs (niveau inférieur ou égal uniquement)',
    category: 'gestion_equipe'
  },
  'team.create_company_users': {
    id: 'team.create_company_users',
    name: 'Créer utilisateurs entreprise',
    description: 'Créer des utilisateurs dans sa propre entreprise uniquement',
    category: 'gestion_equipe'
  },

  // Missions
  'missions.create': {
    id: 'missions.create',
    name: 'Créer missions',
    description: 'Créer des ordres de mission',
    category: 'missions'
  },
  'missions.validate': {
    id: 'missions.validate',
    name: 'Valider missions',
    description: 'Valider les demandes de mission',
    category: 'missions'
  },
  'missions.assign': {
    id: 'missions.assign',
    name: 'Assigner missions',
    description: 'Assigner des missions aux employés',
    category: 'missions'
  },
  'missions.track': {
    id: 'missions.track',
    name: 'Suivre missions',
    description: 'Suivre l\'avancement des missions',
    category: 'missions'
  },

  // Rapports
  'reports.personal': {
    id: 'reports.personal',
    name: 'Rapports personnels',
    description: 'Générer ses propres rapports',
    category: 'rapports'
  },
  'reports.team': {
    id: 'reports.team',
    name: 'Rapports équipe',
    description: 'Générer des rapports d\'équipe',
    category: 'rapports'
  },
  'reports.department': {
    id: 'reports.department',
    name: 'Rapports département',
    description: 'Générer des rapports départementaux',
    category: 'rapports'
  },
  'reports.company': {
    id: 'reports.company',
    name: 'Rapports entreprise',
    description: 'Générer des rapports d\'entreprise',
    category: 'rapports'
  },
  'reports.advanced': {
    id: 'reports.advanced',
    name: 'Rapports avancés',
    description: 'Accès aux rapports avancés et analytics',
    category: 'rapports'
  },

  // Administration
  'admin.company_settings': {
    id: 'admin.company_settings',
    name: 'Paramètres entreprise',
    description: 'Configurer les paramètres de l\'entreprise',
    category: 'administration'
  },
  'admin.system_config': {
    id: 'admin.system_config',
    name: 'Configuration système',
    description: 'Configurer les paramètres système',
    category: 'administration'
  },
  'admin.global_management': {
    id: 'admin.global_management',
    name: 'Gestion globale',
    description: 'Administration globale de la plateforme',
    category: 'administration'
  },

  // Audit
  'audit.read_all': {
    id: 'audit.read_all',
    name: 'Lecture audit complète',
    description: 'Accès en lecture à toutes les données pour audit',
    category: 'audit'
  },
  'audit.generate_reports': {
    id: 'audit.generate_reports',
    name: 'Rapports d\'audit',
    description: 'Générer des rapports d\'audit',
    category: 'audit'
  }
}

// Définition des rôles avec leurs permissions
export const ROLES: Record<UserRole, RoleDefinition> = {
  superadmin: {
    id: 'superadmin',
    name: 'Super-administrateur',
    description: 'Administration globale de la plateforme SaaS',
    level: 1,
    color: 'bg-red-100 text-red-800',
    icon: 'Crown',
    permissions: [
      'admin.global_management',
      'admin.system_config',
      'admin.company_settings',
      ...ANALYTICS_ROLE_PERMISSIONS.superadmin,
      'team.create_users', // Peut créer des utilisateurs globalement
      'team.assign_roles', // Peut assigner n'importe quel rôle
      'team.manage',
      'reports.advanced',
      'reports.company',
      'audit.read_all',
      'audit.generate_reports'
      // Pas de 'team.create_company_users' car le superadmin n'appartient pas à une entreprise spécifique
    ]
  },
  
  admin_rh: {
    id: 'admin_rh',
    name: 'Administrateur RH',
    description: 'Gestion complète des ressources humaines',
    level: 2,
    color: 'bg-purple-100 text-purple-800',
    icon: 'Users',
    permissions: [
      ...ANALYTICS_ROLE_PERMISSIONS.admin_rh,
      'pointage.self',
      'pointage.view_team',
      'pointage.validate',
      'pointage.edit_team',
      'team.create_users',
      ...ANALYTICS_ROLE_PERMISSIONS.admin_rh,
      'team.create_company_users', // Peut créer des utilisateurs dans sa propre entreprise
      'team.assign_roles',
      'team.manage',
      'missions.validate',
      'missions.assign',
      'reports.company',
      'reports.advanced',
      'admin.company_settings'
    ]
  },

  chef_service: {
    id: 'chef_service',
    name: 'Chef de service',
    description: 'Gestion d\'un service ou département',
    level: 3,
    color: 'bg-blue-100 text-blue-800',
    icon: 'Building',
    permissions: [
      ...ANALYTICS_ROLE_PERMISSIONS.chef_service,
      'pointage.self',
      'pointage.view_team',
      'pointage.validate',
      'team.view',
      'team.manage',
      'team.create_company_users', // Peut créer des utilisateurs dans sa propre entreprise
      'missions.create',
      'missions.assign',
      'missions.track',
      'reports.department',
      'reports.team'
    ]
  },

  chef_projet: {
    id: 'chef_projet',
    name: 'Chef de projet',
    description: 'Supervision d\'équipes projet',
    level: 4,
    color: 'bg-green-100 text-green-800',
    icon: 'Target',
    permissions: [
      ...ANALYTICS_ROLE_PERMISSIONS.chef_projet,
      'pointage.self',
      'pointage.view_team',
      'pointage.validate',
      'team.view',
      'missions.create',
      'missions.assign',
      'missions.track',
      'reports.team'
    ]
  },

  manager: {
    id: 'manager',
    name: 'Manager',
    description: 'Supervision d\'équipe restreinte',
    level: 5,
    color: 'bg-yellow-100 text-yellow-800',
    icon: 'UserCheck',
    permissions: [
      ...ANALYTICS_ROLE_PERMISSIONS.manager,
      'pointage.self',
      'pointage.view_team',
      'team.view',
      'missions.track',
      'reports.team'
    ]
  },

  employee: {
    id: 'employee',
    name: 'Employé',
    description: 'Utilisateur standard',
    level: 6,
    color: 'bg-gray-100 text-gray-800',
    icon: 'User',
    permissions: [
      ...ANALYTICS_ROLE_PERMISSIONS.employee,
      'pointage.self',
      'reports.personal'
    ]
  },

  auditeur: {
    id: 'auditeur',
    name: 'Auditeur',
    description: 'Accès en lecture pour audit',
    level: 7,
    color: 'bg-orange-100 text-orange-800',
    icon: 'Search',
    permissions: [
      ...ANALYTICS_ROLE_PERMISSIONS.auditeur,
      'audit.read_all',
      'audit.generate_reports',
      'reports.company',
      'reports.advanced'
    ]
  }
}

// Fonction utilitaire pour vérifier les permissions
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const role = ROLES[userRole]
  // Vérifier les permissions de base
  if (role?.permissions.includes(permission)) {
    return true
  }
  
  // Vérifier les permissions de congés
  if (LEAVE_ROLE_PERMISSIONS[userRole]?.includes(permission)) {
    return true
  }
  
  return false
}

// Fonction pour obtenir toutes les permissions d'un rôle
export function getRolePermissions(userRole: UserRole): Permission[] {
  const role = ROLES[userRole]
  if (!role) return []
  
  // Combiner les permissions standards et les permissions de congés
  const standardPermissions = role.permissions.map(permId => PERMISSIONS[permId]).filter(Boolean)
  
  // Ajouter les permissions de congés
  const leavePerms = LEAVE_ROLE_PERMISSIONS[userRole] || []
  const leavePermissions = leavePerms.map(permId => LEAVE_PERMISSIONS[permId]).filter(Boolean)
  
  return [...standardPermissions, ...leavePermissions]
}

// Fonction pour vérifier si un rôle peut gérer un autre rôle
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  const manager = ROLES[managerRole]
  const target = ROLES[targetRole]
  
  if (!manager || !target) return false
  
  // Le superadmin peut gérer tous les rôles
  if (managerRole === 'superadmin') return true;
  
  // Un rôle peut gérer uniquement les rôles de niveau inférieur au sien
  // Plus le niveau est élevé, moins le rôle est privilégié (inversé par rapport à l'intuition)
  return manager.level < target.level;
}

// Fonction pour vérifier si un utilisateur peut créer/modifier un utilisateur avec un certain rôle
export function canCreateUserWithRole(creatorRole: UserRole, targetRole: UserRole, sameCompany: boolean = true): boolean {
  const creator = ROLES[creatorRole]
  const target = ROLES[targetRole]
  
  if (!creator || !target) return false
  
  // Règle 1: Un utilisateur ne peut pas créer d'utilisateur avec un rôle supérieur au sien
  // Plus le niveau est bas, plus le rôle est privilégié
  if (creator.level >= target.level && creatorRole !== targetRole) return false;
  
  // Règle 2: Seuls le superadmin, l'admin RH et le chef de service peuvent créer des utilisateurs
  if (!['superadmin', 'admin_rh', 'chef_service'].includes(creatorRole)) return false;
  
  // Règle 3: Le superadmin n'appartient pas à une entreprise spécifique et peut tout faire
  if (creatorRole === 'superadmin') return true;
  
  // Règle 4: Les admins RH et chefs de service ne peuvent créer que des utilisateurs dans leur propre entreprise
  if (['admin_rh', 'chef_service'].includes(creatorRole)) {
    // Ils doivent avoir la permission de créer des utilisateurs dans leur entreprise
    const hasCreateCompanyUsersPerm = hasPermission(creatorRole, 'team.create_company_users');
    return sameCompany && hasCreateCompanyUsersPerm;
  }
  
  return false;
}