import { accrueAnnualLeaves, calculateLeaveStatistics } from './leaveUtils';
import { LeaveBalance, LeaveRequest } from '../types/leaveTypes';

const balance: LeaveBalance = {
  id: 1,
  user_id: 1,
  leave_type_id: 1,
  leave_type_name: 'Vacances',
  balance_days: 10,
  initial_balance_days: 10,
  used_days: 0,
  pending_days: 0,
  accrual_rate: 2,
};

const requests: LeaveRequest[] = [
  {
    id: 1,
    user: { id: 1, name: 'Alice', email: 'a@b.c' },
    leave_type: { id: 1, name: 'Vacances', is_paid: true },
    start_date: '2099-01-01',
    end_date: '2099-01-05',
    start_day_period: 'full_day',
    end_day_period: 'full_day',
    requested_days: 5,
    reason: 'repos',
    status: 'approved',
    created_at: '2024-01-01',
    team_notified: true,
  },
  {
    id: 2,
    user: { id: 1, name: 'Alice', email: 'a@b.c' },
    leave_type: { id: 2, name: 'Maladie', is_paid: false },
    start_date: '2099-02-01',
    end_date: '2099-02-02',
    start_day_period: 'full_day',
    end_day_period: 'full_day',
    requested_days: 2,
    status: 'pending',
    created_at: '2024-02-01',
    team_notified: true,
  },
];

 test('accrueAnnualLeaves ajoute les jours correctement', () => {
  const [updated] = accrueAnnualLeaves([balance], 2024);
  expect(updated.balance_days).toBe(34);
  expect(updated.year).toBe(2024);
});

 test('calculateLeaveStatistics retourne les bonnes totaux', () => {
  const stats = calculateLeaveStatistics(requests);
  expect(stats.total_leave_days_taken).toBe(5);
  expect(stats.total_leave_days_pending).toBe(2);
  expect(stats.upcoming_leaves.length).toBe(2);
});
