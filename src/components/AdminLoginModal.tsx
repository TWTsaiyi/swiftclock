import React, { useState } from 'react';
import { X, Lock, ArrowRight } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hardcoded demo PIN
    if (pin === '1234') {
      onLogin();
      setPin('');
      setError(false);
      onClose();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Admin Access</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-slate-500 mb-4">Enter the administrator PIN to manage employees and settings.</p>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              autoFocus
              type="password"
              className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-brand-500'} rounded-xl focus:outline-none focus:bg-white transition-all font-mono text-center text-lg tracking-widest text-slate-900`}
              placeholder="••••"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
              }}
            />
          </div>
          {error && <p className="text-xs text-rose-500 mt-2 font-medium text-center">Incorrect PIN. Try 1234.</p>}
          <button 
            type="submit" 
            className="w-full mt-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            Access Dashboard <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};