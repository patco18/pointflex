import React from 'react'
import CompanySettings from '../components/CompanySettings'
import EnhancedSettings from '../components/EnhancedSettings'
import { usePermissions } from '../hooks/usePermissions'

export default function Settings() {
  const { permissions } = usePermissions()

  if (permissions.canGlobalManagement) {
    return <EnhancedSettings />
  }

  if (permissions.canManageCompanySettings) {
    return <CompanySettings />
  }

  return (
    <div className="card text-center">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
      <p className="text-gray-600">
        Vous n'avez pas les permissions nécessaires pour accéder aux paramètres.
      </p>
    </div>
  )
}
