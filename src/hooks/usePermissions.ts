import { useAuth } from '../contexts/AuthContext'
import { hasPermission, getRolePermissions, canManageRole, UserRole } from '../types/roles'

export function usePermissions() {
  const { user } = useAuth()
  
  const checkPermission = (permission: string): boolean => {
    if (!user?.role) return false
    return hasPermission(user.role as UserRole, permission)
  }
  
  const getUserPermissions = () => {
    if (!user?.role) return []
    return getRolePermissions(user.role as UserRole)
  }
  
  const canManage = (targetRole: UserRole): boolean => {
    if (!user?.role) return false
    return canManageRole(user.role as UserRole, targetRole)
  }
  
  // Permissions spécifiques
  const permissions = {
    // Pointage
    canSelfCheckIn: checkPermission('pointage.self'),
    canViewTeamAttendance: checkPermission('pointage.view_team'),
    canValidateAttendance: checkPermission('pointage.validate'),
    canEditTeamAttendance: checkPermission('pointage.edit_team'),
    
    // Gestion d'équipe
    canViewTeam: checkPermission('team.view'),
    canManageTeam: checkPermission('team.manage'),
    canCreateUsers: checkPermission('team.create_users'),
    canAssignRoles: checkPermission('team.assign_roles'),
    
    // Missions
    canCreateMissions: checkPermission('missions.create'),
    canValidateMissions: checkPermission('missions.validate'),
    canAssignMissions: checkPermission('missions.assign'),
    canTrackMissions: checkPermission('missions.track'),
    
    // Rapports
    canViewPersonalReports: checkPermission('reports.personal'),
    canViewTeamReports: checkPermission('reports.team'),
    canViewDepartmentReports: checkPermission('reports.department'),
    canViewCompanyReports: checkPermission('reports.company'),
    canViewAdvancedReports: checkPermission('reports.advanced'),
    
    // Administration
    canManageCompanySettings: checkPermission('admin.company_settings'),
    canManageSystemConfig: checkPermission('admin.system_config'),
    canGlobalManagement: checkPermission('admin.global_management'),
    
    // Audit
    canAuditReadAll: checkPermission('audit.read_all'),
    canGenerateAuditReports: checkPermission('audit.generate_reports')
  }
  
  return {
    checkPermission,
    getUserPermissions,
    canManage,
    permissions,
    userRole: user?.role as UserRole
  }
}