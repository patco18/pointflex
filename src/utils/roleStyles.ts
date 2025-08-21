import { Crown, Shield, Users, Briefcase, UserCheck, Eye, User } from 'lucide-react'

export const roleStyles = {
  superadmin: { label: 'Super Admin', icon: Crown, color: 'text-red-700', bg: 'bg-red-100' },
  admin_rh: { label: 'Admin RH', icon: Shield, color: 'text-blue-700', bg: 'bg-blue-100' },
  chef_service: { label: 'Chef Service', icon: Users, color: 'text-purple-700', bg: 'bg-purple-100' },
  chef_projet: { label: 'Chef Projet', icon: Briefcase, color: 'text-amber-700', bg: 'bg-amber-100' },
  manager: { label: 'Manager', icon: UserCheck, color: 'text-green-700', bg: 'bg-green-100' },
  auditeur: { label: 'Auditeur', icon: Eye, color: 'text-indigo-700', bg: 'bg-indigo-100' },
  employee: { label: 'Employé', icon: User, color: 'text-gray-700', bg: 'bg-gray-100' }
} as const

export type RoleKey = keyof typeof roleStyles

export function getRoleStyle(role?: string) {
  if (!role) return roleStyles.employee
  return roleStyles[role as RoleKey] || roleStyles.employee
}
