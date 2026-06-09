export const WORK_TYPES = [
  { value: 'excavation', label: 'Excavation' },
  { value: 'welding', label: 'Welding' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'demolition', label: 'Demolition' },
  { value: 'transport', label: 'Transport' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_STATUS = [
  { value: 'pending', label: 'Pending', color: 'amber' },
  { value: 'partial', label: 'Partial', color: 'amber' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
];

export const ATTENDANCE_STATUS = [
  { value: 'present', label: 'Present', color: 'green' },
  { value: 'absent', label: 'Absent', color: 'red' },
  { value: 'half-day', label: 'Half Day', color: 'amber' },
  { value: 'leave', label: 'Leave', color: 'blue' },
];

export const CAMP_STATUS = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'completed', label: 'Completed', color: 'blue' },
  { value: 'upcoming', label: 'Upcoming', color: 'amber' },
];

export const WORKER_STATUS = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'inactive', label: 'Inactive', color: 'red' },
];

export const REPORT_TYPES = [
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'monthly', label: 'Monthly Report' },
];

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const STATUS_COLORS = {
  // Payment
  paid: 'bg-green-500/20 text-green-400 border-green-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  overdue: 'bg-red-500/20 text-red-400 border-red-500/30',

  // Attendance
  present: 'bg-green-500/20 text-green-400 border-green-500/30',
  absent: 'bg-red-500/20 text-red-400 border-red-500/30',
  'half-day': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  leave: 'bg-blue-500/20 text-blue-400 border-blue-500/30',

  // Workers / Camps
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  inactive: 'bg-red-500/20 text-red-400 border-red-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  upcoming: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export const PER_PAGE_OPTIONS = [10, 25, 50, 100];
