import React from 'react';
import { User, Shift } from '../types';
import { Clock, CircleDot, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDuration } from '../utils';

interface TeamMemberCardProps {
  user: User;
  activeShift?: Shift;
  elapsedTime: number;
  onToggleStatus: (user: User) => void;
  onViewDetails: (user: User) => void;
  isAdminMode?: boolean;
  onMove?: (direction: 'prev' | 'next') => void;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ 
  user, 
  activeShift, 
  elapsedTime, 
  onViewDetails,
  isAdminMode,
  onMove
}) => {
  const isActive = !!activeShift;

  return (
    <div 
        onClick={(e) => {
           // Prevent navigating if clicking controls
           if ((e.target as HTMLElement).closest('button')) return;
           onViewDetails(user);
        }}
        className={`group relative rounded-[32px] p-8 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer border-2 hover:scale-[1.02] ${
            isActive 
            ? 'bg-emerald-50/40 border-emerald-100 shadow-sm' 
            : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
        }`}
    >
        {/* Admin Reorder Controls */}
        {isAdminMode && onMove && (
            <div className="absolute top-4 left-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => onMove('prev')}
                    className="p-1.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 hover:border-slate-300 shadow-sm transition-colors"
                    title="Move Left"
                >
                    <ChevronLeft size={14} />
                </button>
                <button 
                    onClick={() => onMove('next')}
                    className="p-1.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 hover:border-slate-300 shadow-sm transition-colors"
                    title="Move Right"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        )}

        {/* Status Light (Visual decoration) */}
        {isActive && (
            <div className="absolute top-6 right-6">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
            </div>
        )}

        {/* Avatar */}
        <div 
            className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-sm mb-4 border-4 border-white"
            style={{ backgroundColor: user.color }}
        >
            {user.name.charAt(0).toUpperCase()}
        </div>

        {/* Name & ID */}
        <h3 className="text-xl font-bold text-slate-900 mb-1">{user.name}</h3>
        <p className="text-xs text-slate-400 font-mono mb-4">
            #{user.employeeId || user.id.slice(0, 6)}
        </p>

        {/* Department Pill */}
        <div className="bg-slate-100 px-4 py-1.5 rounded-full text-slate-500 text-xs font-semibold mb-6 lowercase">
            {user.department || 'General'}
        </div>

        {/* Status Indicator */}
        <div className="flex flex-col items-center gap-2">
            <div className={`flex items-center gap-2 font-medium ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isActive ? (
                    <Clock size={18} className="text-emerald-500" />
                ) : (
                    <CircleDot size={18} className="text-slate-300" />
                )}
                <span>{isActive ? 'Working' : 'Out'}</span>
            </div>
            
            {/* Timer (Only visible if active) */}
            <div className={`text-sm font-medium transition-opacity ${isActive ? 'opacity-100 text-slate-500' : 'opacity-0 h-5'}`}>
                {isActive ? formatDuration(elapsedTime) : '00:00:00'}
            </div>
        </div>
    </div>
  );
};