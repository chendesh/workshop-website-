import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatsCard = ({ title, value, icon: Icon, trend, trendValue, color = 'amber', className = '' }) => {
  const colorMap = {
    amber: {
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      glow: 'shadow-amber-500/5',
    },
    green: {
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
      glow: 'shadow-green-500/5',
    },
    red: {
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      glow: 'shadow-red-500/5',
    },
    blue: {
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      glow: 'shadow-blue-500/5',
    },
    purple: {
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      glow: 'shadow-purple-500/5',
    },
  };

  const colors = colorMap[color] || colorMap.amber;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className={`glass-card p-6 hover:border-slate-600 transition-all duration-300 group ${colors.glow} shadow-lg ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold font-heading text-gray-100 group-hover:text-white transition-colors">
            {value}
          </p>
          {trendValue !== undefined && (
            <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colors.iconBg}`}>
          {Icon && <Icon className={`w-6 h-6 ${colors.iconColor}`} />}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
