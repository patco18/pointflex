// Types communs pour les périodes de journée de congé
export type DayPeriod = 'full_day' | 'half_day_morning' | 'half_day_afternoon';

// Types pour les statuts de demande
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// Interface pour les types de congés
export interface LeaveType {
  id: number;
  name: string;
  is_paid: boolean;
  color?: string;
  icon?: string;
  description?: string;
  default_limit_days?: number;  // Limite par défaut en jours pour ce type de congé
  requires_approval?: boolean;  // Si ce type de congé nécessite une approbation
  requires_documents?: boolean; // Si ce type de congé nécessite des documents justificatifs
  is_active: boolean;          // Si ce type de congé est actif ou non
}

// Interface pour les soldes de congés
export interface LeaveBalance {
  id: number;
  user_id: number;
  leave_type_id: number;
  leave_type_name: string;
  balance_days: number;         // Solde actuel
  initial_balance_days: number;  // Solde initial pour la période
  used_days: number;            // Jours utilisés
  pending_days: number;         // Jours en attente d'approbation
  accrual_rate?: number;        // Taux d'accumulation (jours par mois)
  balance_expiry_date?: string; // Date d'expiration du solde actuel
  year?: number;                // Année de référence du solde
}

// Interface pour les membres d'équipe (utilisable comme remplaçants)
export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id?: number;
  department_name?: string;
  avatar?: string;
  position?: string;
  is_available?: boolean;      // Si le membre est disponible comme remplaçant
}

// Interface pour les documents justificatifs
export interface SupportingDocument {
  id: number;
  leave_request_id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  url: string;
  uploaded_at: string;
}

// Interface pour une demande de congé complète
export interface LeaveRequest {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    department?: string;
    department_id?: number;
    position?: string;
  };
  leave_type: {
    id: number;
    name: string;
    color?: string;
    is_paid: boolean;
  };
  start_date: string;
  end_date: string;
  start_day_period: DayPeriod;
  end_day_period: DayPeriod;
  requested_days: number;
  reason?: string;
  status: LeaveRequestStatus;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: {
    id: number;
    name: string;
  };
  approval_comment?: string;
  substitute_user?: {
    id: number;
    name: string;
    email?: string;
  };
  supporting_documents?: SupportingDocument[];
  team_notified: boolean;
  custom_email_message?: string;
}

// Interface pour les données du formulaire de demande de congé
export interface LeaveRequestFormData {
  leave_type_id: string | number;
  start_date: string;
  end_date: string;
  start_day_period: DayPeriod;
  end_day_period: DayPeriod;
  reason: string;
  substitute_user_id?: string | number;
  supporting_documents?: FileList;
  notify_team: boolean;
  custom_email_message?: string;
}

// Interface pour les événements de congé dans le calendrier
export interface LeaveCalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  user: {
    id: number;
    name: string;
    avatar?: string;
    department?: string;
    department_id?: number;
  };
  leaveType: {
    id: number;
    name: string;
    color: string;
    is_paid: boolean;
  };
  status: LeaveRequestStatus;
  requested_days: number;
  substitute_name?: string;
}

// Interface pour le département
export interface Department {
  id: number;
  name: string;
  manager_id?: number;
  manager_name?: string;
}

// Interface pour les statistiques de congés
export interface LeaveStatistics {
  total_leave_days_taken: number;
  total_leave_days_pending: number;
  leave_days_by_type: {
    leave_type_id: number;
    leave_type_name: string;
    days_taken: number;
    days_pending: number;
  }[];
  most_common_leave_type?: {
    id: number;
    name: string;
    count: number;
  };
  upcoming_leaves: {
    id: number;
    user_name: string;
    start_date: string;
    end_date: string;
    days: number;
  }[];
}

// Interface pour l'historique des modifications de congés
export interface LeaveHistory {
  id: number;
  leave_request_id: number;
  user_id: number;
  user_name: string;
  action: 'created' | 'updated' | 'approved' | 'rejected' | 'cancelled';
  previous_status?: LeaveRequestStatus;
  new_status?: LeaveRequestStatus;
  details?: string;
  timestamp: string;
}

// Interface pour les paramètres du système de congés
export interface LeaveSettings {
  default_approval_required: boolean;
  allow_self_approval: boolean;
  max_consecutive_leave_days: number;
  min_days_before_request: number;
  max_days_in_advance: number;
  holidays_count_as_leave: boolean;
  allow_negative_balance: boolean;
  auto_approve_types: number[];  // IDs des types de congés à approuver automatiquement
}
