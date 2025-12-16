import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface DepartmentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: string[];
  onAdd: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  onReorder: (departments: string[]) => void;
}

export const DepartmentSettingsModal: React.FC<DepartmentSettingsModalProps> = ({
  isOpen,
  onClose,
  departments,
  onAdd,
  onRename,
  onDelete,
  onReorder
}) => {
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDeptName.trim()) {
      onAdd(newDeptName.trim());
      setNewDeptName('');
    }
  };

  const startEdit = (dept: string) => {
    setEditingDept(dept);
    setEditValue(dept);
  };

  const saveEdit = () => {
    if (editingDept && editValue.trim() && editValue !== editingDept) {
      onRename(editingDept, editValue.trim());
    }
    setEditingDept(null);
    setEditValue('');
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newDepts = [...departments];
    [newDepts[index - 1], newDepts[index]] = [newDepts[index], newDepts[index - 1]];
    onReorder(newDepts);
  };

  const moveDown = (index: number) => {
    if (index === departments.length - 1) return;
    const newDepts = [...departments];
    [newDepts[index + 1], newDepts[index]] = [newDepts[index], newDepts[index + 1]];
    onReorder(newDepts);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
        <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Manage Departments</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Add New */}
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                placeholder="New Department Name"
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!newDeptName.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
              >
                <Plus size={18} /> Add
              </button>
            </form>

            {/* List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {departments.map((dept, index) => (
                <div key={dept} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg group hover:border-slate-200 transition-colors">
                  {editingDept === dept ? (
                    <div className="flex-1 flex items-center gap-2 mr-2">
                      <input
                        autoFocus
                        type="text"
                        className="flex-1 px-2 py-1 bg-slate-50 border border-brand-300 rounded focus:outline-none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') setEditingDept(null);
                        }}
                      />
                      <button onClick={saveEdit} className="text-emerald-500 hover:text-emerald-600">
                          <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <span className="font-medium text-slate-700 flex-1">{dept}</span>
                  )}
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingDept !== dept && (
                        <>
                          <div className="flex flex-col gap-0.5 mr-2 border-r border-slate-100 pr-2">
                            <button 
                                onClick={() => moveUp(index)} 
                                disabled={index === 0}
                                className="text-slate-300 hover:text-slate-600 disabled:opacity-20 hover:bg-slate-50 rounded"
                                title="Move Up"
                            >
                                <ArrowUp size={12} />
                            </button>
                            <button 
                                onClick={() => moveDown(index)} 
                                disabled={index === departments.length - 1}
                                className="text-slate-300 hover:text-slate-600 disabled:opacity-20 hover:bg-slate-50 rounded"
                                title="Move Down"
                            >
                                <ArrowDown size={12} />
                            </button>
                         </div>
                          <button 
                              onClick={() => startEdit(dept)}
                              className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                          >
                              <Edit2 size={16} />
                          </button>
                          <button 
                              onClick={() => setDeptToDelete(dept)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                              <Trash2 size={16} />
                          </button>
                        </>
                    )}
                  </div>
                </div>
              ))}

              {departments.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm flex flex-col items-center gap-2">
                      <AlertCircle size={24} className="opacity-50" />
                      No departments found. Add one above.
                  </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 text-center">
              Renaming or deleting a department will update all associated employees automatically.
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deptToDelete}
        title="Delete Department?"
        message={`Are you sure you want to delete "${deptToDelete}"? Associated employees will be moved to the default department.`}
        onConfirm={() => {
          if (deptToDelete) onDelete(deptToDelete);
          setDeptToDelete(null);
        }}
        onCancel={() => setDeptToDelete(null)}
      />
    </>
  );
};