import React, { useState, useEffect } from 'react';
import { X, Save, User as UserIcon, Briefcase, Hash, Trash2, AlertTriangle } from 'lucide-react';
import { User } from '../types';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  departments: string[];
  onSave: (updatedUser: User) => void;
  onDelete?: (userId: string) => void;
  isAdminMode?: boolean;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  departments,
  onSave,
  onDelete,
  isAdminMode = false
}) => {
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmployeeId(user.employeeId || '');
      setDepartment(user.department || 'General');
      setIsDeleting(false);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({
        ...user,
        name: name.trim(),
        employeeId: employeeId.trim(),
        department: department
      });
      onClose();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDeleting(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
        onDelete(user.id);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Edit Employee</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <UserIcon size={14} /> Full Name
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-medium text-slate-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Hash size={14} /> ID Number
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-mono text-slate-900"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={14} /> Department
                </label>
                <div className="relative">
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all appearance-none font-medium text-slate-900 cursor-pointer"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>
              </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
              {!isDeleting ? (
                <>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-100 transition-all flex items-center justify-center gap-2"
                  >
                      <Save size={18} /> Save Changes
                  </button>
                  
                  {isAdminMode && onDelete && (
                      <button 
                        type="button"
                        onClick={handleDeleteClick}
                        className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                      >
                          <Trash2 size={18} /> Delete Employee
                      </button>
                  )}
                </>
              ) : (
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-bottom-2">
                   <div className="flex items-center gap-2 text-rose-700 font-bold mb-1">
                      <AlertTriangle size={18} />
                      Confirm Deletion?
                   </div>
                   <p className="text-xs text-rose-600/80 mb-3">
                      This action cannot be undone. All shift history for this user will be lost.
                   </p>
                   <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDeleting(false)}
                        className="flex-1 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg font-bold text-sm hover:bg-rose-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold text-sm hover:bg-rose-700 shadow-md shadow-rose-200 transition-colors"
                      >
                        Yes, Delete
                      </button>
                   </div>
                </div>
              )}
          </div>
        </form>
      </div>
    </div>
  );
};