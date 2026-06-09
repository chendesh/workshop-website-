import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { DAYS_OF_WEEK, MONTHS } from '../utils/constants';

const AttendanceCalendar = ({ attendance = [], month, year, onMonthChange, onDayClick, readOnly = false }) => {
  const [currentDate, setCurrentDate] = useState(
    month !== undefined && year !== undefined
      ? new Date(year, month, 1)
      : new Date()
  );

  const handlePrev = () => {
    const newDate = subMonths(currentDate, 1);
    setCurrentDate(newDate);
    onMonthChange?.(newDate.getMonth(), newDate.getFullYear());
  };

  const handleNext = () => {
    const newDate = addMonths(currentDate, 1);
    setCurrentDate(newDate);
    onMonthChange?.(newDate.getMonth(), newDate.getFullYear());
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const getAttendanceForDay = (day) => {
    const yyyy_mm_dd = format(day, 'yyyy-MM-dd');
    const dd_mm_yyyy = format(day, 'dd/MM/yyyy');
    return attendance.find(
      (a) => a.date === yyyy_mm_dd || a.date === dd_mm_yyyy || a.date?.startsWith(yyyy_mm_dd) || a.date?.startsWith(dd_mm_yyyy)
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-500/30 border-green-500/50 text-green-300';
      case 'absent':
        return 'bg-red-500/30 border-red-500/50 text-red-300';
      case 'half_day':
        return 'bg-amber-500/30 border-amber-500/50 text-amber-300';
      case 'on_leave':
        return 'bg-blue-500/30 border-blue-500/50 text-blue-300';
      case 'on_camp':
        return 'bg-purple-500/30 border-purple-500/50 text-purple-300';
      default:
        return '';
    }
  };

  return (
    <div className="glass-card p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-heading font-semibold text-gray-100">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button
          onClick={handleNext}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-gray-500 uppercase py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const record = getAttendanceForDay(day);
          const statusColor = record ? getStatusColor(record.status) : '';

          return (
            <button
              key={day.toISOString()}
              onClick={() => !readOnly && inMonth && onDayClick?.(day, record)}
              disabled={readOnly || !inMonth}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-lg
                text-sm font-medium transition-all duration-200 border border-transparent
                ${!inMonth ? 'text-gray-700 cursor-default' : ''}
                ${inMonth && !record ? 'text-gray-400 hover:bg-slate-700/30' : ''}
                ${inMonth && record ? statusColor : ''}
                ${today ? 'ring-2 ring-amber-500/50' : ''}
                ${!readOnly && inMonth ? 'cursor-pointer' : ''}
              `}
            >
              <span className="text-sm">{format(day, 'd')}</span>
              {record && inMonth && (
                <span className="text-[10px] mt-0.5 opacity-80">
                  {record.status === 'present'
                    ? 'P'
                    : record.status === 'absent'
                    ? 'A'
                    : record.status === 'half_day'
                    ? 'H'
                    : record.status === 'on_camp'
                    ? 'C'
                    : 'L'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500/40 border border-green-500/50" />
          <span className="text-xs text-gray-400">Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/40 border border-red-500/50" />
          <span className="text-xs text-gray-400">Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500/40 border border-amber-500/50" />
          <span className="text-xs text-gray-400">Half Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500/40 border border-blue-500/50" />
          <span className="text-xs text-gray-400">On Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-purple-500/40 border border-purple-500/50" />
          <span className="text-xs text-gray-400">On Camp</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
