import React, { useState } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import { ROLES, PERMISSIONS, UserRole, RoleDefinition } from '../types/roles'
import RoleBasedAccess from './RoleBasedAccess'
import { 
  Shield, 
  Users, 
  Crown, 
  Building, 
  Target, 
  UserCheck, 
  User, 
  Search,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const ROLE_ICONS = {
  Crown,
  Users,
  Building,
  Target,
  UserCheck,
  User,
  Search,
  Shield
}

export default function RoleManagement() {
  const { permissions, userRole } = usePermissions()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [showPermissionDetails, setShowPermissionDetails] = useState(false)

  const getRoleIcon = (iconName: string) => {
    const IconComponent = ROLE_ICONS[iconName as keyof typeof ROLE_ICONS] || Shield
    return IconComponent
  }

  const getPermissionsByCategory = (role: RoleDefinition) => {
    const rolePermissions = role.permissions.map(permId => PERMISSIONS[permId]).filter(Boolean)
    
    const categories = {
      pointage: rolePermissions.filter(p => p.category === 'pointage'),
      gestion_equipe: rolePermissions.filter(p => p.category === 'gestion_equipe'),
      missions: rolePermissions.filter(p => p.category === 'missions'),
      rapports: rolePermissions.filter(p => p.category === 'rapports'),
      administration: rolePermissions.filter(p => p.category === 'administration'),
      audit: rolePermissions.filter(p => p.category === 'audit')
    }
    
    return categories
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      pointage: '⏰',
      gestion_equipe: '👥',
      missions: '🎯',
      rapports: '📊',
      administration: '⚙️',
      audit: '🔍'
    }
    return icons[category as keyof typeof icons] || '📋'
  }

  const getCategoryName = (category: string) => {
    const names = {
      pointage: 'Pointage',
      gestion_equipe: 'Gestion d\'équipe',
      missions: 'Missions',
      rapports: 'Rapports',
      administration: 'Administration',
      audit: 'Audit'
    }
    return names[category as keyof typeof names] || category
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Rôles et Privilèges</h1>
          <p className="text-gray-600">
            Système de permissions hiérarchique pour PointFlex
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-gray-700">
            Votre rôle: {ROLES[userRole]?.name}
          </span>
        </div>
      </div>

      {/* Vue d'ensemble des rôles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.values(ROLES).map((role) => {
          const IconComponent = getRoleIcon(role.icon)
          const isCurrentRole = userRole === role.id
          const canView = permissions.canGlobalManagement || permissions.canManageCompanySettings || isCurrentRole
          
          if (!canView) return null
          
          return (
            <div
              key={role.id}
              className={`card cursor-pointer transition-all hover:shadow-lg ${
                selectedRole === role.id ? 'ring-2 ring-primary-500' : ''
              } ${isCurrentRole ? 'bg-primary-50 border-primary-200' : ''}`}
              onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className={`p-2 rounded-lg ${role.color.replace('text-', 'bg-').replace('-800', '-100')}`}>
                  <IconComponent className={`h-5 w-5 ${role.color.replace('bg-', 'text-').replace('-100', '-600')}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{role.name}</h3>
                  <p className="text-xs text-gray-500">Niveau {role.level}</p>
                </div>
                {isCurrentRole && (
                  <CheckCircle className="h-4 w-4 text-primary-600" />
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{role.description}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{role.permissions.length} permissions</span>
                <span className={`px-2 py-1 rounded-full ${role.color}`}>
                  {role.id}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Détails du rôle sélectionné */}
      {selectedRole && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {(() => {
                const role = ROLES[selectedRole]
                const IconComponent = getRoleIcon(role.icon)
                return (
                  <>
                    <div className={`p-3 rounded-lg ${role.color.replace('text-', 'bg-').replace('-800', '-100')}`}>
                      <IconComponent className={`h-6 w-6 ${role.color.replace('bg-', 'text-').replace('-100', '-600')}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{role.name}</h2>
                      <p className="text-gray-600">{role.description}</p>
                    </div>
                  </>
                )
              })()}
            </div>
            <button
              onClick={() => setSelectedRole(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(getPermissionsByCategory(ROLES[selectedRole])).map(([category, perms]) => {
              if (perms.length === 0) return null
              
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getCategoryIcon(category)}</span>
                    <h3 className="font-semibold text-gray-900">{getCategoryName(category)}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {perms.length}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {perms.map((permission) => (
                      <div key={permission.id} className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{permission.name}</p>
                          <p className="text-xs text-gray-600">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Matrice des permissions (pour les super admins) */}
      <RoleBasedAccess permission="admin.global_management">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Matrice des Permissions</h2>
            <button
              onClick={() => setShowPermissionDetails(!showPermissionDetails)}
              className="btn-secondary"
            >
              {showPermissionDetails ? 'Masquer détails' : 'Voir détails'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Permission</th>
                  {Object.values(ROLES).map((role) => (
                    <th key={role.id} className="text-center py-3 px-2 font-semibold text-gray-900">
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs">{role.name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${role.color}`}>
                          L{role.level}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(PERMISSIONS).map((permission) => (
                  <tr key={permission.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{permission.name}</p>
                        {showPermissionDetails && (
                          <p className="text-xs text-gray-600">{permission.description}</p>
                        )}
                      </div>
                    </td>
                    {Object.values(ROLES).map((role) => (
                      <td key={`${permission.id}-${role.id}`} className="text-center py-3 px-2">
                        {role.permissions.includes(permission.id) ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <div className="h-4 w-4 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </RoleBasedAccess>
    </div>
  )
}