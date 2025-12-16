import React, { useState } from 'react';
import { X, Calendar, Clock, Save, AlertCircle } from 'lucide-react';
import { formatDuration } from '../utils';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (startTime: number, endTime: number) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const calculateDuration = () => {
    if (!startDateTime || !endDateTime) return null;
    const start = new Date(startDateTime).getTime();
    const end = new Date(endDateTime).getTime();
    if (end <= start) return null;
    return end - start;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startDateTime || !endDateTime) {
      setError('Please select both start and end times.');
      return;
    }

    const start = new Date(startDateTime).getTime();
    const end = new Date(endDateTime).getTime();

    if (end <= start) {
      setError('End time must be after start time.');
      return;
    }

    onSave(start, end);
    // Reset form
    setStartDateTime('');
    setEndDateTime('');
    onClose();
  };

  const duration = calculateDuration();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-brand-50 p-2 rounded-lg text-brand-600">
                <Calendar size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Add Attendance Record</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                Start Time
              </label>
              <input
                type="datetime-local"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-medium text-slate-900"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                End Time
              </label>
              <input
                type="datetime-local"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-medium text-slate-900"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
              />
            </div>

            {duration && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-sm font-medium animate-in fade-in">
                    <span className="flex items-center gap-2"><Clock size={16} /> Total Duration</span>
                    <span className="font-mono text-base font-bold">{formatDuration(duration)}</span>
                </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-rose-500 text-sm font-medium bg-rose-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-100 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} /> Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};