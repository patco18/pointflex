import React from 'react'
import { usePermissions } from '../hooks/usePermissions'
import { UserRole } from '../types/roles'

interface RoleBasedAccessProps {
  children: React.ReactNode
  permission?: string
  role?: UserRole
  fallback?: React.ReactNode
}

export default function RoleBasedAccess({ 
  children, 
  permission, 
  role, 
  fallback = null 
}: RoleBasedAccessProps) {
  const { checkPermission, userRole } = usePermissions()
  
  // Vérification par permission
  if (permission && !checkPermission(permission)) {
    return <>{fallback}</>
  }
  
  // Vérification par rôle exact
  if (role && userRole !== role) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Composants spécialisés pour les rôles
export function SuperAdminOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess role="superadmin" fallback={fallback}>
      {children}
    </RoleBasedAccess>
  )
}

export function AdminRHOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess role="admin_rh" fallback={fallback}>
      {children}
    </RoleBasedAccess>
  )
}

export function ChefServiceOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess role="chef_service" fallback={fallback}>
      {children}
    </RoleBasedAccess>
  )
}

export function ChefProjetOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess role="chef_projet" fallback={fallback}>
      {children}
    </RoleBasedAccess>
  )
}

export function ManagerOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess role="manager" fallback={fallback}>
      {children}
    </RoleBasedAccess>
  )
}

export function AuditeurOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess role="auditeur" fallback={fallback}>
      {children}
    </RoleBasedAccess>
  )
}