import { addDays, daysBetween, formatDateOnly, toDateOnly } from '../lib/dates.js';

const SUPERVISOR_BACKDATE_LIMIT = 1;

export function getCurrentPayPeriod(worker, referenceDate = new Date()) {
  const anchor = toDateOnly(worker.payCycleAnchor);
  const ref = toDateOnly(referenceDate);
  const interval = worker.payoutIntervalDays;

  if (ref < anchor) {
    return {
      periodStart: anchor,
      periodEnd: addDays(anchor, interval - 1),
    };
  }

  const elapsed = daysBetween(anchor, ref);
  const periodIndex = Math.floor(elapsed / interval);
  const periodStart = addDays(anchor, periodIndex * interval);
  const periodEnd = addDays(periodStart, interval - 1);

  return { periodStart, periodEnd };
}

export function isPeriodEnded(worker, referenceDate = new Date()) {
  const { periodEnd } = getCurrentPayPeriod(worker, referenceDate);
  return toDateOnly(referenceDate) > periodEnd;
}

export function calculateAccrualAmount(dailyRate, status) {
  const rate = Number(dailyRate);
  if (status === 'PRESENT') return rate;
  if (status === 'HALF_DAY') return rate / 2;
  return 0;
}

export function getAttendanceEditState(worker, attendance, accrual) {
  if (!attendance) {
    return { isEditable: true, lockReason: null, paymentStatus: 'NONE' };
  }

  if (attendance.isLocked) {
    return { isEditable: false, lockReason: 'PERIOD_LOCKED', paymentStatus: 'LOCKED' };
  }

  if (!accrual || accrual.status === 'VOIDED') {
    return { isEditable: true, lockReason: null, paymentStatus: 'NONE' };
  }

  if (accrual.status === 'PAID') {
    return { isEditable: false, lockReason: 'PAID', paymentStatus: 'PAID' };
  }

  const expected = calculateAccrualAmount(worker.dailyRate, attendance.status);
  const current = Number(accrual.amount);
  if (current < expected - 0.001) {
    return { isEditable: false, lockReason: 'PARTIAL_PAID', paymentStatus: 'PARTIAL' };
  }

  return { isEditable: true, lockReason: null, paymentStatus: 'UNPAID' };
}

export function validateAttendanceDate(workDate, userRole) {
  const today = toDateOnly(new Date());
  const target = toDateOnly(workDate);
  const diff = daysBetween(target, today);

  if (diff < 0) {
    return { valid: false, message: 'Cannot mark attendance for future dates' };
  }

  if (userRole === 'SUPERVISOR' && diff > SUPERVISOR_BACKDATE_LIMIT) {
    return {
      valid: false,
      message: `Supervisors can only backdate up to ${SUPERVISOR_BACKDATE_LIMIT} day(s)`,
    };
  }

  return { valid: true };
}

export function validateSupervisorAssignment(assignments, workerId) {
  return assignments.some((a) => a.workerId === workerId);
}

export { formatDateOnly, toDateOnly };
