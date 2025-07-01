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
  category: 'pointage' | 'gestion_equipe' | 'rapports' | 'administration' | 'missions' | 'audit'
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
    description: 'Créer de nouveaux utilisateurs',
    category: 'gestion_equipe'
  },
  'team.assign_roles': {
    id: 'team.assign_roles',
    name: 'Assigner rôles',
    description: 'Assigner des rôles aux utilisateurs',
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
      'team.create_users',
      'team.assign_roles',
      'team.manage',
      'reports.advanced',
      'reports.company',
      'audit.read_all',
      'audit.generate_reports'
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
      'pointage.self',
      'pointage.view_team',
      'pointage.validate',
      'pointage.edit_team',
      'team.create_users',
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
      'pointage.self',
      'pointage.view_team',
      'pointage.validate',
      'team.view',
      'team.manage',
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
  return role?.permissions.includes(permission) || false
}

// Fonction pour obtenir toutes les permissions d'un rôle
export function getRolePermissions(userRole: UserRole): Permission[] {
  const role = ROLES[userRole]
  if (!role) return []
  
  return role.permissions.map(permId => PERMISSIONS[permId]).filter(Boolean)
}

// Fonction pour vérifier si un rôle peut gérer un autre rôle
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  const manager = ROLES[managerRole]
  const target = ROLES[targetRole]
  
  if (!manager || !target) return false
  
  // Un rôle peut gérer les rôles de niveau inférieur
  return manager.level < target.level
}