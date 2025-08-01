import { LeaveBalance, LeaveRequest, LeaveStatistics } from '../types/leaveTypes';

/**
 * Accumule les jours de congé annuels pour chaque solde.
 * @param balances Liste des soldes existants
 * @param year Année d'accumulation (par défaut l'année en cours)
 * @returns Nouveaux soldes avec jours accumulés
 */
export function accrueAnnualLeaves(balances: LeaveBalance[], year: number = new Date().getFullYear()): LeaveBalance[] {
  return balances.map((balance) => {
    const accrualRate = balance.accrual_rate || 0;
    const accruedDays = accrualRate * 12; // accumulate on a yearly basis
    return {
      ...balance,
      balance_days: balance.balance_days + accruedDays,
      year,
    };
  });
}

/**
 * Calcule diverses statistiques à partir des demandes de congés.
 * @param requests Liste des demandes de congé
 */
export function calculateLeaveStatistics(requests: LeaveRequest[]): LeaveStatistics {
  let totalTaken = 0;
  let totalPending = 0;
  const byType: { [id: number]: { leave_type_id: number; leave_type_name: string; days_taken: number; days_pending: number } } = {};
  const upcoming: LeaveStatistics['upcoming_leaves'] = [];
  const today = new Date();

  for (const req of requests) {
    const days = req.requested_days;
    const typeId = req.leave_type.id;
    if (!byType[typeId]) {
      byType[typeId] = { leave_type_id: typeId, leave_type_name: req.leave_type.name, days_taken: 0, days_pending: 0 };
    }

    if (req.status === 'approved') {
      totalTaken += days;
      byType[typeId].days_taken += days;
      const start = new Date(req.start_date);
      if (start >= today) {
        upcoming.push({
          id: req.id,
          user_name: req.user.name,
          start_date: req.start_date,
          end_date: req.end_date,
          days,
        });
      }
    } else if (req.status === 'pending') {
      totalPending += days;
      byType[typeId].days_pending += days;
    }
  }

  const leaveDaysByType = Object.values(byType);
  const mostCommon = leaveDaysByType.reduce<{ id: number; name: string; count: number } | null>((acc, lt) => {
    if (!acc || lt.days_taken > acc.count) {
      return { id: lt.leave_type_id, name: lt.leave_type_name, count: lt.days_taken };
    }
    return acc;
  }, null);

  return {
    total_leave_days_taken: totalTaken,
    total_leave_days_pending: totalPending,
    leave_days_by_type: leaveDaysByType,
    most_common_leave_type: mostCommon || undefined,
    upcoming_leaves: upcoming.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
  };
}
