import React, { useState, useEffect } from 'react';
import { Play, Square, LayoutGrid, ChevronLeft, Settings, FileText, Lock, Unlock, Plus, Users, ChevronDown, PenLine } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TeamMemberCard } from './components/TeamMemberCard';
import { DepartmentSettingsModal } from './components/DepartmentSettingsModal';
import { EditUserModal } from './components/EditUserModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Shift, User } from './types';
import { formatDuration, calculateShiftDuration, formatDate, formatTime, getRandomColor, isSameDay } from './utils';
import { db } from './services/db';

const App: React.FC = () => {
  // Global Data
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation & Selection
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Routing for Departments
  const location = useLocation();
  const navigate = useNavigate();

  // Multi-User State
  const [activeShifts, setActiveShifts] = useState<Record<string, Shift>>({});

  // Current User Detail State
  const [shifts, setShifts] = useState<Shift[]>([]);

  // User Creation State
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserDept, setNewUserDept] = useState('');

  // Admin & Settings State
  const [isAdminMode, setIsAdminMode] = useState(() => {
    const saved = localStorage.getItem('tempo_admin_mode');
    return saved === 'true';
  });
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isDeptSettingsOpen, setIsDeptSettingsOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Derived State from URL
  const getSelectedDeptFromUrl = () => {
    // pathname in HashRouter is the part after #
    // e.g. #/Engineering -> Engineering
    const path = location.pathname;
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    if (cleanPath === '' || cleanPath === '/') {
        return 'All Departments';
    }
    return decodeURIComponent(cleanPath);
  };

  const selectedDept = getSelectedDeptFromUrl();

  const setSelectedDept = (dept: string) => {
      if (dept === 'All Departments') {
          navigate('/');
      } else {
          // Navigate to /DepartmentName
          navigate(`/${encodeURIComponent(dept)}`);
      }
  };

  // 1. Initial Load
  useEffect(() => {
    const initData = async () => {
        setIsLoading(true);
        try {
            const [fetchedUsers, fetchedDepts, fetchedActiveShifts] = await Promise.all([
                db.getUsers(),
                db.getDepartments(),
                db.getActiveShifts()
            ]);

            // Deduplicate users and departments to prevent key collisions
            const uniqueUsers = Array.from(new Map(fetchedUsers.map(u => [u.id, u])).values());
            const uniqueDepts = Array.from(new Set(fetchedDepts));

            // Ensure sorted by rank
            uniqueUsers.sort((a, b) => (a.rank || 0) - (b.rank || 0));

            setUsers(uniqueUsers);
            setDepartments(uniqueDepts);
            setActiveShifts(fetchedActiveShifts);
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setIsLoading(false);
        }
    };
    initData();
  }, []);

  // 2. Global Timer (Updates UI every second)
  useEffect(() => {
    const interval = setInterval(() => {
        setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Persist Admin Mode
  useEffect(() => {
    localStorage.setItem('tempo_admin_mode', String(isAdminMode));
  }, [isAdminMode]);

  // 4. Load Detail Data
  useEffect(() => {
    const loadUserShifts = async () => {
        if (!currentUser) {
            setShifts([]);
            return;
        }
        const userShifts = await db.getShifts(currentUser.id);
        setShifts(userShifts);
    };
    loadUserShifts();
  }, [currentUser, activeShifts]); // Reload when activeShifts changes to reflect updates

  // 5. Auto-cleanup stale shifts from UI State (reset if not same day)
  useEffect(() => {
    const cleanupStaleShifts = async () => {
        const currentTimestamp = Date.now();
        
        // Identify stale shifts (shifts where start time is not on the same day as now)
        const staleEntries = Object.entries(activeShifts).filter(([_, shift]) => 
            !isSameDay((shift as Shift).startTime, currentTimestamp)
        );

        if (staleEntries.length === 0) return;

        // NOTE: We do NOT delete from DB anymore. We want to keep the record with null end time.
        // We just remove it from the 'activeShifts' UI state so the user status resets to "Out".

        // UI Update
        setActiveShifts(prev => {
            const next = { ...prev };
            let changed = false;
            staleEntries.forEach(([userId]) => {
                if (next[userId]) {
                    delete next[userId];
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    };

    // Run check periodically
    const timer = setInterval(cleanupStaleShifts, 60000); // Check every minute
    
    // Also run immediately on dependency change to catch page loads/updates
    cleanupStaleShifts();

    return () => clearInterval(timer);
  }, [activeShifts]);

  // --- Department Management ---
  const handleAddDepartment = async (name: string) => {
    if (departments.includes(name)) return;
    const newDepts = [...departments, name];
    setDepartments(newDepts);
    await db.saveDepartments(newDepts);
  };

  const handleRenameDepartment = async (oldName: string, newName: string) => {
    if (departments.includes(newName)) return;
    
    // Update list
    const newDepts = departments.map(d => d === oldName ? newName : d);
    setDepartments(newDepts);
    await db.saveDepartments(newDepts);
    await db.deleteDepartment(oldName); // Cleanup old key if using DB table logic

    // Update users
    const updatedUsers = users.map(u => ({
        ...u,
        department: u.department === oldName ? newName : u.department
    }));
    setUsers(updatedUsers);
    
    // Save all updated users
    await Promise.all(updatedUsers.map(u => db.saveUser(u)));
    
    // Update URL if we were on the renamed department page
    if (selectedDept === oldName) {
        setSelectedDept(newName);
    }
  };

  const handleDeleteDepartment = async (name: string) => {
    const newDepts = departments.filter(d => d !== name);
    setDepartments(newDepts);
    await db.saveDepartments(newDepts);
    await db.deleteDepartment(name);

    // Move users to General
    const fallbackDept = newDepts.length > 0 ? newDepts[0] : 'General';
    const updatedUsers = users.map(u => ({
        ...u,
        department: u.department === name ? fallbackDept : u.department
    }));
    setUsers(updatedUsers);
    await Promise.all(updatedUsers.map(u => db.saveUser(u)));

    // Navigate back to all if deleted
    if (selectedDept === name) {
        setSelectedDept('All Departments');
    }
  };

  const handleReorderDepartments = async (newOrder: string[]) => {
    setDepartments(newOrder);
    await db.saveDepartments(newOrder);
  };

  // --- User Management ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    // Use selected department from URL if available, otherwise fallback
    const defaultDept = selectedDept !== 'All Departments' ? selectedDept : (departments[0] || 'General');
    
    // Calculate next rank
    const maxRank = users.length > 0 ? Math.max(...users.map(u => u.rank || 0)) : 0;

    const newUser: User = {
        id: crypto.randomUUID(),
        name: newUserName.trim(),
        color: getRandomColor(),
        department: newUserDept || defaultDept,
        employeeId: Math.floor(1000 + Math.random() * 9000).toString(),
        rank: maxRank + 1
    };
    
    // Optimistic update
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setNewUserName('');
    setIsCreatingUser(false);
    
    await db.saveUser(newUser);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
        setCurrentUser(updatedUser);
    }
    await db.saveUser(updatedUser);
  };

  const handleDeleteUser = async (userId: string) => {
    // 1. Calculate new state first
    const updatedUsers = users.filter(u => u.id !== userId);
    
    // 2. Set UI state immediately
    setUsers(updatedUsers);
    setUserToDelete(null);
    setIsEditUserOpen(false); // Close edit modal if open
    
    // 3. If deleting the user we are currently viewing, go back to team view
    if (currentUser?.id === userId) {
        setCurrentUser(null);
    }

    // 4. Update Active Shifts State
    setActiveShifts(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
    });

    // 5. Persist changes
    await db.deleteUser(userId);
  };

  const handleMoveUser = async (user: User, direction: 'prev' | 'next') => {
    // Filter users in same department
    const dept = user.department || 'General';
    // Get users for this department, sorted by current rank
    const deptUsers = users
        .filter(u => (u.department || 'General') === dept)
        .sort((a, b) => (a.rank || 0) - (b.rank || 0));
    
    const currentIndex = deptUsers.findIndex(u => u.id === user.id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= deptUsers.length) return;
    
    // Create a copy for manipulation
    const newDeptUsers = [...deptUsers];
    // Swap
    [newDeptUsers[currentIndex], newDeptUsers[targetIndex]] = [newDeptUsers[targetIndex], newDeptUsers[currentIndex]];
    
    // Normalize ranks for the entire department to ensure consistency (1, 2, 3...)
    const usersToUpdate = newDeptUsers.map((u, index) => ({
        ...u,
        rank: index + 1 // 1-based rank
    }));

    // Update global state by merging updated users
    const updatedAllUsers = users.map(u => {
        const updated = usersToUpdate.find(up => up.id === u.id);
        return updated ? updated : u;
    });
    
    // Sort global list
    updatedAllUsers.sort((a, b) => (a.rank || 0) - (b.rank || 0));
    
    setUsers(updatedAllUsers);
    await db.saveUsersOrder(usersToUpdate);
  };

  // --- Time Tracking ---
  const handleClockIn = async (user: User) => {
    const userHistory = await db.getShifts(user.id);
    
    // Check for "First In" logic
    const todayShift = userHistory.find(s => isSameDay(s.startTime, Date.now()));
    
    let newShift: Shift;

    if (todayShift) {
        // Resume existing
        newShift = { ...todayShift, endTime: undefined };
        // Remove from history in UI immediately for smooth transition
        if (currentUser?.id === user.id) {
            setShifts(prev => prev.filter(s => s.id !== todayShift.id));
        }
        await db.resumeShift(user, todayShift.id);
    } else {
        // Start new
        newShift = {
            id: crypto.randomUUID(),
            startTime: Date.now(),
        };
        await db.startShift(user, newShift);
    }

    setActiveShifts(prev => ({ ...prev, [user.id]: newShift }));
  };

  const handleClockOut = async (user: User) => {
    const activeShift = activeShifts[user.id];
    if (!activeShift) return;

    const completedShift: Shift = {
      ...activeShift,
      endTime: Date.now(),
    };

    // Optimistic UI update: Update the specific shift in the list immediately
    if (currentUser?.id === user.id) {
        setShifts(prev => {
             const index = prev.findIndex(s => s.id === completedShift.id);
             if (index !== -1) {
                 // Replace existing entry (if it was somehow in the list)
                 const newShifts = [...prev];
                 newShifts[index] = completedShift;
                 return newShifts;
             }
             // Prepend new completed shift
             return [completedShift, ...prev];
        });
    }

    const finalize = async (shiftToSave: Shift) => {
        await db.endShift(user, shiftToSave);
        
        // Update global active shifts state AFTER DB save to ensure data consistency 
        setActiveShifts(prev => {
            const next = { ...prev };
            delete next[user.id];
            return next;
        });
    };

    finalize(completedShift);
  };

  const handleToggleStatus = (user: User) => {
    if (activeShifts[user.id]) {
        handleClockOut(user);
    } else {
        handleClockIn(user);
    }
  };

  const currentActiveShift = currentUser ? activeShifts[currentUser.id] : null;
  const currentElapsedTime = currentActiveShift ? now - currentActiveShift.startTime : 0;
  
  const userDepts = Array.from(new Set(users.map(u => u.department || 'General')));
  const displayDepartments = Array.from(new Set([...departments, ...userDepts]));

  const departmentsToRender = selectedDept === 'All Departments' 
    ? displayDepartments 
    : [selectedDept];

  const todayShifts = shifts.filter(shift => isSameDay(shift.startTime, Date.now()));

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-medium animate-pulse">Loading Tempo...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4">
        <button 
            onClick={() => {
                setShowAdminDashboard(false);
                setCurrentUser(null);
            }}
            className="flex items-center gap-4 group cursor-pointer"
        >
            <div className="bg-brand-600 rounded-lg p-2 shadow-md group-hover:bg-brand-700 transition-colors">
                <LayoutGrid size={24} className="text-white" />
            </div>
            <div className="text-left">
                <h1 className="text-xl font-bold text-slate-900 leading-none group-hover:text-brand-600 transition-colors">采醫醫師打卡</h1>
            </div>
        </button>

        <div className="flex items-center gap-3">
             {isAdminMode && (
                 <button
                    onClick={() => setShowAdminDashboard(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        showAdminDashboard 
                        ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                 >
                    <FileText size={18} /> Reports
                 </button>
             )}
             
             <button 
                onClick={() => isAdminMode ? setIsAdminMode(false) : setIsAdminLoginOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isAdminMode 
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                }`}
             >
                {isAdminMode ? <Unlock size={18} /> : <Lock size={18} />}
                <span className="hidden sm:inline">{isAdminMode ? 'Exit Admin' : 'Admin Mode'}</span>
             </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-6 md:p-10">
        
        {/* TEAM OVERVIEW MODE */}
        {!currentUser && (
            <div className="space-y-8 animate-in fade-in duration-500">
                
                {/* Controls Bar */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                    <div className="space-y-4 w-full">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold text-slate-800">看診醫師清單</h2>
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-slate-500 text-sm font-medium">
                                <Users size={14} />
                                <span>{Object.keys(activeShifts).length} / {users.length}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setSelectedDept('All Departments')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    selectedDept === 'All Departments'
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                All Departments
                            </button>
                            {departments.map(dept => (
                                <button
                                    key={dept}
                                    onClick={() => setSelectedDept(dept)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                        selectedDept === dept 
                                        ? 'bg-slate-900 text-white shadow-md' 
                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    {dept}
                                </button>
                            ))}
                            {isAdminMode && (
                                <button 
                                    onClick={() => setIsDeptSettingsOpen(true)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                    title="Manage Departments"
                                >
                                    <Settings size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="w-full xl:w-auto flex justify-end">
                         {isCreatingUser ? (
                             <form onSubmit={handleCreateUser} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto bg-white p-2 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-right-4 items-center">
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder="Employee Name"
                                    className="px-3 py-2 rounded-lg bg-slate-50 outline-none text-sm w-full sm:w-48 border border-transparent focus:border-brand-300 focus:bg-white transition-all"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                />
                                <div className="relative w-full sm:w-auto">
                                  <select
                                      value={newUserDept}
                                      onChange={(e) => setNewUserDept(e.target.value)}
                                      className="px-3 py-2 pr-8 rounded-lg bg-slate-50 outline-none text-sm w-full sm:w-40 cursor-pointer border border-transparent focus:border-brand-300 focus:bg-white hover:bg-slate-100 transition-all appearance-none"
                                  >
                                      <option value="" disabled>Select Dept</option>
                                      {departments.map(dept => (
                                          <option key={dept} value={dept}>{dept}</option>
                                      ))}
                                  </select>
                                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                  <button type="submit" className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">Add</button>
                                  <button type="button" onClick={() => setIsCreatingUser(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                      <ChevronLeft size={20} />
                                  </button>
                                </div>
                             </form>
                        ) : (
                            isAdminMode && (
                                <button 
                                    onClick={() => {
                                        setIsCreatingUser(true);
                                        // Default to the currently viewing department if possible, or the first available one
                                        const defaultDept = selectedDept !== 'All Departments' ? selectedDept : (departments[0] || '');
                                        setNewUserDept(defaultDept);
                                    }}
                                    className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:border-brand-300 text-slate-700 hover:text-brand-600 rounded-xl font-semibold shadow-sm transition-all whitespace-nowrap"
                                >
                                    <Plus size={18} />
                                    <span className="whitespace-nowrap">Add Employee</span>
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Users Grid - Grouped by Department */}
                <div className="space-y-12 pb-12">
                    {departmentsToRender.map(dept => {
                        const deptUsers = users.filter(u => (u.department || 'General') === dept);
                        if (deptUsers.length === 0) return null;
                        
                        return (
                            <section key={dept} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-3 mb-6">
                                    <h3 className="text-xl font-bold text-slate-800">{dept}</h3>
                                    <div className="h-px flex-1 bg-slate-200/80"></div>
                                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                        {deptUsers.length}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {deptUsers.map((user, index) => (
                                        <TeamMemberCard 
                                            key={user.id}
                                            user={user}
                                            activeShift={activeShifts[user.id]}
                                            elapsedTime={activeShifts[user.id] ? now - activeShifts[user.id].startTime : 0}
                                            onToggleStatus={handleToggleStatus}
                                            onViewDetails={(u) => setCurrentUser(u)}
                                            isAdminMode={isAdminMode}
                                            onMove={
                                                // Only show move controls if there's somewhere to move
                                                deptUsers.length > 1 
                                                ? (dir) => handleMoveUser(user, dir)
                                                : undefined
                                            }
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                    
                    {/* Empty State */}
                    {users.length === 0 && (
                         <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Users size={32} className="text-slate-300" />
                            </div>
                            <p className="font-medium">No employees found.</p>
                            <p className="text-sm mt-1">Admin Mode required to add employees.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* INDIVIDUAL DASHBOARD MODE */}
        {currentUser && (
            <div className="animate-in slide-in-from-bottom-8 duration-500">
                <button 
                    onClick={() => setCurrentUser(null)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors group"
                >
                    <div className="p-1 rounded-md group-hover:bg-slate-200 transition-colors">
                        <ChevronLeft size={24} />
                    </div>
                    <span className="font-semibold text-lg">Back to Team</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column: Profile & Actions */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center relative group">
                            
                            {isAdminMode && (
                                <button 
                                    onClick={() => setIsEditUserOpen(true)}
                                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                    title="Edit Profile"
                                >
                                    <PenLine size={20} />
                                </button>
                            )}

                            <div 
                                className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-5xl shadow-md mb-6 border-4 border-slate-50"
                                style={{ backgroundColor: currentUser.color }}
                            >
                                {currentUser.name.charAt(0).toUpperCase()}
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900">{currentUser.name}</h2>
                            <div className="flex items-center gap-2 mt-2 mb-6">
                                <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    {currentUser.department || 'General'}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-400 font-mono text-sm">#{currentUser.employeeId}</span>
                            </div>

                            {/* Main Action Button */}
                            {!currentActiveShift ? (
                                <button 
                                    onClick={() => handleClockIn(currentUser)}
                                    className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-xl shadow-lg shadow-brand-200 transition-transform active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Play fill="currentColor" size={24} /> 上診
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleClockOut(currentUser)}
                                    className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-xl shadow-lg shadow-rose-200 transition-transform active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Square fill="currentColor" size={24} /> 下診
                                </button>
                            )}

                             {currentActiveShift && (
                                <div className="mt-8">
                                    <div className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-2">Current Session</div>
                                    <div className="text-5xl font-mono font-bold text-slate-800 tracking-tighter">
                                        {formatDuration(currentElapsedTime)}
                                    </div>
                                    <div className="mt-2 text-green-600 flex items-center justify-center gap-1 text-sm font-medium bg-green-50 py-1 px-3 rounded-full w-fit mx-auto">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        Tracking Time
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Stats & History */}
                    <div className="lg:col-span-8 space-y-6">
                         <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-900">當日紀錄</h3>
                             </div>
                             <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Start</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">End</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {todayShifts.map((shift) => (
                                        <tr key={shift.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-medium text-slate-900">{formatDate(shift.startTime)}</td>
                                            <td className="px-6 py-4 text-slate-600">{formatTime(shift.startTime)}</td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {shift.endTime ? formatTime(shift.endTime) : (
                                                    isSameDay(shift.startTime, Date.now()) 
                                                    ? <span className="text-emerald-500 font-medium">Active</span>
                                                    : <span className="text-rose-500 font-medium bg-rose-50 px-2 py-1 rounded-full text-xs">No Clock Out</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-500">
                                                {shift.endTime ? formatDuration(calculateShiftDuration(shift)) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                             {todayShifts.length === 0 && (
                                 <div className="p-8 text-center text-slate-400">No shift history found for today.</div>
                             )}
                         </div>
                    </div>
                </div>
            </div>
        )}
      </main>

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLogin={() => setIsAdminMode(true)}
      />

      <DepartmentSettingsModal
        isOpen={isDeptSettingsOpen}
        onClose={() => setIsDeptSettingsOpen(false)}
        departments={departments}
        onAdd={handleAddDepartment}
        onRename={handleRenameDepartment}
        onDelete={handleDeleteDepartment}
        onReorder={handleReorderDepartments}
      />

      <EditUserModal 
        isOpen={isEditUserOpen}
        onClose={() => setIsEditUserOpen(false)}
        user={currentUser}
        departments={departments}
        onSave={handleUpdateUser}
        onDelete={handleDeleteUser}
        isAdminMode={isAdminMode}
      />

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Delete Employee"
        message={`Are you sure you want to delete ${userToDelete?.name}? This action cannot be undone and will remove all shift history.`}
        onConfirm={() => userToDelete && handleDeleteUser(userToDelete.id)}
        onCancel={() => setUserToDelete(null)}
      />

      {showAdminDashboard && (
          <AdminDashboard 
            users={users} 
            departments={departments} 
            onClose={() => setShowAdminDashboard(false)} 
          />
      )}
    </div>
  );
};

export default App;