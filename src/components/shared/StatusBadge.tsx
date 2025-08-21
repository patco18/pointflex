import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import Badge from '../ui/badge';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'warning';
  text?: string;
}

const configs = {
  active: {
    icon: CheckCircle,
    color: 'success',
    defaultText: 'Actif',
  },
  inactive: {
    icon: XCircle,
    color: 'danger',
    defaultText: 'Inactif',
  },
  pending: {
    icon: Clock,
    color: 'pending',
    defaultText: 'En attente',
  },
  warning: {
    icon: AlertTriangle,
    color: 'warning',
    defaultText: 'Attention',
  },
};

export default function StatusBadge({ status, text }: StatusBadgeProps) {
  const config = configs[status];
  const Icon = config.icon;

  return (
    <Badge color={config.color as any} className="inline-flex items-center">
      <Icon className="h-3 w-3 mr-1" />
      {text || config.defaultText}
    </Badge>
  );
}
