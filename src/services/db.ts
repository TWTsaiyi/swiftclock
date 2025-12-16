import { supabase } from './supabaseClient';
import { User, Shift } from '../types';

// Hybrid Service: Uses Supabase if available, falls back to LocalStorage
const isSupabaseEnabled = !!supabase;

const isToday = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  return date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
};

export const db = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase!.from('users').select('*');
      if (error) {
        console.error('Supabase error:', error);
        return [];
      }
      return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        color: u.color,
        department: u.department,
        employeeId: u.employee_id
      })) as User[];
    } else {
      const stored = localStorage.getItem('tempo_users');
      return stored ? JSON.parse(stored) as User[] : [];
    }
  },

  saveUser: async (user: User) => {
    if (isSupabaseEnabled) {
      const { error } = await supabase!.from('users').upsert({
        id: user.id,
        name: user.name,
        color: user.color,
        department: user.department,
        employee_id: user.employeeId
      });
      if (error) console.error('Save user error:', error);
    } else {
      const users = await db.getUsers();
      const existingIndex = users.findIndex(u => u.id === user.id);
      const newUsers = existingIndex >= 0 
        ? users.map(u => u.id === user.id ? user : u) 
        : [...users, user];
      localStorage.setItem('tempo_users', JSON.stringify(newUsers));
    }
  },

  deleteUser: async (userId: string) => {
    if (isSupabaseEnabled) {
      await supabase!.from('users').delete().eq('id', userId);
    } else {
      const users = await db.getUsers();
      const newUsers = users.filter(u => u.id !== userId);
      localStorage.setItem('tempo_users', JSON.stringify(newUsers));
      // Clean up LS specific keys
      localStorage.removeItem(`tempo_shifts_${userId}`);
      localStorage.removeItem(`tempo_current_shift_${userId}`);
    }
  },

  // --- DEPARTMENTS ---
  getDepartments: async (): Promise<string[]> => {
    if (isSupabaseEnabled) {
        const { data } = await supabase!.from('departments').select('name').order('rank', { ascending: true });
        return data ? data.map((d: any) => d.name) as string[] : [];
    } else {
        const stored = localStorage.getItem('tempo_departments');
        return stored ? JSON.parse(stored) as string[] : [];
    }
  },

  saveDepartments: async (departments: string[]) => {
    if (isSupabaseEnabled) {
        // Full replace logic is tricky in SQL, so we'll upsert loop for simplicity in this demo
        // Ideally: Delete not in list, Upsert list
        for (let i = 0; i < departments.length; i++) {
             await supabase!.from('departments').upsert({ name: departments[i], rank: i });
        }
        // Basic delete of old ones not in list could be added here
    } else {
        localStorage.setItem('tempo_departments', JSON.stringify(departments));
    }
  },
  
  deleteDepartment: async (name: string) => {
      if (isSupabaseEnabled) {
          await supabase!.from('departments').delete().eq('name', name);
      } else {
          // Handled by saveDepartments logic in LS usually, but helper here
          const depts = await db.getDepartments();
          const newDepts = depts.filter(d => d !== name);
          localStorage.setItem('tempo_departments', JSON.stringify(newDepts));
      }
  },

  // --- SHIFTS ---
  getShifts: async (userId: string): Promise<Shift[]> => {
    if (isSupabaseEnabled) {
      const { data } = await supabase!
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });
      
      return data ? data.map((s: any) => ({
        id: s.id,
        startTime: s.start_time,
        endTime: s.end_time || undefined,
        note: s.note
      })) as Shift[] : [];
    } else {
      const stored = localStorage.getItem(`tempo_shifts_${userId}`);
      const history: Shift[] = stored ? JSON.parse(stored) : [];
      
      const activeStr = localStorage.getItem(`tempo_current_shift_${userId}`);
      if (activeStr) {
          const active: Shift = JSON.parse(activeStr);
          // Return active shift first if it belongs to this history
          return [active, ...history];
      }
      return history;
    }
  },

  getActiveShifts: async (): Promise<Record<string, Shift>> => {
      if (isSupabaseEnabled) {
          const { data } = await supabase!
            .from('shifts')
            .select('*')
            .is('end_time', null);
          
          const map: Record<string, Shift> = {};
          data?.forEach((s: any) => {
             // Only include shifts that started TODAY. 
             // Stale shifts (yesterday's forgotten clockouts) should not be considered "Active" for the dashboard status.
             if (isToday(s.start_time)) {
                map[s.user_id] = {
                    id: s.id,
                    startTime: s.start_time,
                    note: s.note
                } as Shift;
             }
          });
          return map;
      } else {
         const users = await db.getUsers();
         const map: Record<string, Shift> = {};
         users.forEach(u => {
             const saved = localStorage.getItem(`tempo_current_shift_${u.id}`);
             if (saved) {
                 const shift = JSON.parse(saved) as Shift;
                 // Only include if start time is today
                 if (isToday(shift.startTime)) {
                    map[u.id] = shift;
                 }
             }
         });
         return map;
      }
  },

  startShift: async (user: User, shift: Shift) => {
    if (isSupabaseEnabled) {
      await supabase!.from('shifts').insert({
        id: shift.id,
        user_id: user.id,
        start_time: shift.startTime,
      });
    } else {
      localStorage.setItem(`tempo_current_shift_${user.id}`, JSON.stringify(shift));
    }
  },

  resumeShift: async (user: User, shiftId: string) => {
      if (isSupabaseEnabled) {
          await supabase!.from('shifts').update({ end_time: null }).eq('id', shiftId);
      } else {
          // Logic handled in App.tsx for LS mostly, but for consistency:
          const history = await db.getShifts(user.id);
          const shift = history.find(s => s.id === shiftId);
          if (shift) {
             const active = { ...shift, endTime: undefined };
             localStorage.setItem(`tempo_current_shift_${user.id}`, JSON.stringify(active));
             const newHistory = history.filter(s => s.id !== shiftId);
             localStorage.setItem(`tempo_shifts_${user.id}`, JSON.stringify(newHistory));
          }
      }
  },

  endShift: async (user: User, shift: Shift) => {
    if (isSupabaseEnabled) {
      await supabase!.from('shifts').update({
        end_time: shift.endTime,
      }).eq('id', shift.id);
    } else {
      // Get current history
      const stored = localStorage.getItem(`tempo_shifts_${user.id}`);
      const history = stored ? JSON.parse(stored) : [];
      const updatedHistory = [shift, ...history];
      localStorage.setItem(`tempo_shifts_${user.id}`, JSON.stringify(updatedHistory));
      localStorage.removeItem(`tempo_current_shift_${user.id}`);
    }
  },

  deleteShift: async (userId: string, shiftId: string) => {
    if (isSupabaseEnabled) {
      await supabase!.from('shifts').delete().eq('id', shiftId);
    } else {
      // Check active
      const activeStr = localStorage.getItem(`tempo_current_shift_${userId}`);
      if (activeStr) {
          const active = JSON.parse(activeStr) as Shift;
          if (active.id === shiftId) {
              localStorage.removeItem(`tempo_current_shift_${userId}`);
              return; 
          }
      }
      // Check history
      const histStr = localStorage.getItem(`tempo_shifts_${userId}`);
      if (histStr) {
          const hist = JSON.parse(histStr) as Shift[];
          const newHist = hist.filter((s: Shift) => s.id !== shiftId);
          localStorage.setItem(`tempo_shifts_${userId}`, JSON.stringify(newHist));
      }
    }
  }
};