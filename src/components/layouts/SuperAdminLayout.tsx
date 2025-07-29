import React, { ReactNode } from 'react'
import { usePermissions } from '../../hooks/usePermissions'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

interface SuperAdminLayoutProps {
  children: ReactNode
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { permissions } = usePermissions()
  const navigate = useNavigate()

  // Rediriger si l'utilisateur n'est pas superadmin
  useEffect(() => {
    if (!permissions.canGlobalManagement) {
      navigate('/')
    }
  }, [permissions, navigate])

  if (!permissions.canGlobalManagement) {
    return (
      <div className="card text-center py-10">
        <p className="text-gray-600">Accès non autorisé</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {children}
    </div>
  )
}
