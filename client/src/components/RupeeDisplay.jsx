import { formatCurrency } from '../utils/formatters';

const RupeeDisplay = ({ amount, size = 'md', showSign = false, className = '' }) => {
  const num = Number(amount) || 0;
  const isNegative = num < 0;
  const isPositive = num > 0;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
    xl: 'text-2xl font-bold',
  };

  const colorClass = showSign
    ? isNegative
      ? 'text-red-400'
      : isPositive
      ? 'text-green-400'
      : 'text-gray-300'
    : 'text-gray-100';

  return (
    <span className={`${sizeClasses[size]} ${colorClass} ${className} font-mono tabular-nums`}>
      {showSign && isPositive && '+'}
      {formatCurrency(num)}
    </span>
  );
};

export default RupeeDisplay;
