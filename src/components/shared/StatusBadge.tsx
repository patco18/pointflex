import React from 'react'
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'warning'
  text?: string
}

export default function StatusBadge({ status, text }: StatusBadgeProps) {
  const configs = {
    active: {
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800',
      defaultText: 'Actif'
    },
    inactive: {
      icon: XCircle,
      className: 'bg-red-100 text-red-800',
      defaultText: 'Inactif'
    },
    pending: {
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-800',
      defaultText: 'En attente'
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-orange-100 text-orange-800',
      defaultText: 'Attention'
    }
  }

  const config = configs[status]
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {text || config.defaultText}
    </span>
  )
}