import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import EmployeeProfile from '../components/EmployeeProfile'
import AdminProfile from '../components/AdminProfile'

export default function Profile() {
  const { user, isAdmin, isSuperAdmin } = useAuth()

  if (!user) {
    return <div className="text-center py-8">Chargement du profil...</div>
  }

  return (
    <div>
      {isAdmin || isSuperAdmin ? <AdminProfile /> : <EmployeeProfile />}
    </div>
  )
}