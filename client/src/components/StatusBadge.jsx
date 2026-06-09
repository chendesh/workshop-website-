import { STATUS_COLORS } from '../utils/constants';
import { capitalize } from '../utils/formatters';

const StatusBadge = ({ status, size = 'sm' }) => {
  const colorClass = STATUS_COLORS[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${colorClass} ${sizeClass}`}>
      {capitalize(status?.replace('-', ' ') || 'unknown')}
    </span>
  );
};

export default StatusBadge;
