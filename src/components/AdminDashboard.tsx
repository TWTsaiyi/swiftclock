import React, { useState, useEffect } from 'react';
import { User, Shift } from '../types';
import { Search, Download, Filter } from 'lucide-react';
import { formatDate, formatTime, formatDuration } from '../utils';
import { db } from '../services/db';

interface AdminDashboardProps {
  users: User[];
  departments: string[];
  onClose: () => void;
}

interface EnrichedShift {
  id: string;
  userId: string;
  userName: string;
  userIdNumber: string;
  department: string;
  startTime: number;
  endTime?: number;
  duration: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, departments, onClose }) => {
  const [shifts, setShifts] = useState<EnrichedShift[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  
  // Initialize with current local date in YYYY-MM-DD format
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadAllShifts = async () => {
        setIsLoading(true);
        try {
            const results = await Promise.all(users.map(async (user) => {
                const userShifts = await db.getShifts(user.id);
                return userShifts.map(s => ({
                    id: s.id,
                    userId: user.id,
                    userName: user.name,
                    userIdNumber: user.employeeId || '',
                    department: user.department || 'General',
                    startTime: s.startTime,
                    endTime: s.endTime,
                    duration: s.endTime ? s.endTime - s.startTime : (Date.now() - s.startTime)
                }));
            }));
            
            const allShifts = results.flat();
            allShifts.sort((a, b) => b.startTime - a.startTime);
            setShifts(allShifts);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    loadAllShifts();
  }, [users]);

  // Filtering Logic
  const filteredShifts = shifts.filter(s => {
    const matchesSearch = 
        s.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.userIdNumber.includes(searchTerm);
    const matchesDept = selectedDept === 'All' || s.department === selectedDept;

    let matchesDate = true;
    if (startDate) {
        const [y, m, d] = startDate.split('-').map(Number);
        const startTimestamp = new Date(y, m - 1, d).getTime(); // Local midnight
        if (s.startTime < startTimestamp) matchesDate = false;
    }
    if (endDate) {
        const [y, m, d] = endDate.split('-').map(Number);
        const endTimestamp = new Date(y, m - 1, d, 23, 59, 59, 999).getTime(); // Local end of day
        if (s.startTime > endTimestamp) matchesDate = false;
    }
    
    return matchesSearch && matchesDept && matchesDate;
  });

  const handleExport = () => {
    const headers = ['Employee Name', 'ID', 'Department', 'Date', 'Start Time', 'End Time', 'Duration'];
    const rows = filteredShifts.map(s => {
      // Format date as YYYY/MM/DD
      const dateObj = new Date(s.startTime);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const formattedDateCSV = `${year}/${month}/${day}`;

      return [
        `"${s.userName}"`,
        `"${s.userIdNumber}"`,
        `"${s.department}"`,
        formattedDateCSV,
        formatTime(s.startTime),
        s.endTime ? formatTime(s.endTime) : '',
        s.endTime ? formatDuration(s.duration) : '-'
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Add BOM for correct display of UTF-8 characters (like Traditional Chinese) in Excel
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[40] bg-slate-50 flex flex-col pt-24 animate-in slide-in-from-bottom-4 duration-300">
      
      <div className="flex-1 overflow-hidden flex flex-col max-w-[1600px] w-full mx-auto p-6">
        
        {/* Controls Toolbar */}
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between mb-6">
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                <div className="relative flex-1 md:w-64 h-[42px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search employee name or ID..."
                        className="w-full h-full pl-10 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 transition-all text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="relative md:w-48 h-[42px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                        className="w-full h-full pl-10 pr-8 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 appearance-none text-sm font-medium cursor-pointer"
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                    >
                        <option value="All">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-[42px]">
                  <div className="relative">
                     <input 
                        type="date" 
                        className="bg-transparent border-none outline-none text-sm font-medium text-slate-600 focus:ring-0 p-0"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="Start Date"
                     />
                  </div>
                  <span className="text-slate-400">-</span>
                  <div className="relative">
                     <input 
                        type="date" 
                        className="bg-transparent border-none outline-none text-sm font-medium text-slate-600 focus:ring-0 p-0"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="End Date"
                     />
                  </div>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95 whitespace-nowrap"
                >
                    <Download size={18} /> Export CSV
                </button>
            </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time In</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time Out</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Duration</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                                        <span>Loading records...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredShifts.length > 0 ? (
                            filteredShifts.map((shift) => (
                                <tr key={`${shift.userId}-${shift.id}`} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{shift.userName}</div>
                                        <div className="text-xs text-slate-400 font-mono">#{shift.userIdNumber}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-500">
                                            {shift.department}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 font-medium">
                                        {formatDate(shift.startTime)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-mono">
                                        {formatTime(shift.startTime)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-mono">
                                        {shift.endTime ? formatTime(shift.endTime) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-600">
                                        {shift.endTime ? formatDuration(shift.duration) : '-'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                    No records found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};
