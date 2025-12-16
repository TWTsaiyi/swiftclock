import { Shift } from './types';

export const formatDuration = (ms: number): string => {
  const safeMs = Math.max(0, ms); // Prevent negative numbers
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const calculateShiftDuration = (shift: Shift): number => {
  const end = shift.endTime || Date.now();
  return end - shift.startTime;
};

export const getWeekData = (shifts: Shift[]) => {
  const daysMap = new Map<string, number>();
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString(undefined, { weekday: 'short' });
    daysMap.set(dateStr, 0);
  }

  shifts.forEach(shift => {
    if (!shift.endTime) return;
    const dateStr = new Date(shift.startTime).toLocaleDateString(undefined, { weekday: 'short' });
    if (daysMap.has(dateStr)) {
      const hours = (shift.endTime - shift.startTime) / (1000 * 60 * 60);
      daysMap.set(dateStr, (daysMap.get(dateStr) || 0) + hours);
    }
  });

  return Array.from(daysMap.entries()).map(([name, hours]) => ({
    name,
    hours: parseFloat(hours.toFixed(2))
  }));
};

export const getRandomColor = (): string => {
  const colors = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#f59e0b', // amber-500
    '#84cc16', // lime-500
    '#10b981', // emerald-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#d946ef', // fuchsia-500
    '#f43f5e', // rose-500
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const isSameDay = (d1: number, d2: number): boolean => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export const downloadShiftsCSV = (shifts: Shift[], userName: string) => {
  const headers = ['Date', 'Start Time', 'End Time', 'Duration', 'Note'];
  const rows = shifts.map(shift => {
    // Format date as YYYY/MM/DD
    const dateObj = new Date(shift.startTime);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedDateCSV = `${year}/${month}/${day}`;

    // Determine status string
    const isShiftToday = isSameDay(shift.startTime, Date.now());
    const endTimeStr = shift.endTime ? formatTime(shift.endTime) : (isShiftToday ? 'Active' : 'Missing');

    return [
      formattedDateCSV,
      formatTime(shift.startTime),
      endTimeStr,
      shift.endTime ? formatDuration(calculateShiftDuration(shift)) : '-',
      shift.note || ''
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Add BOM for correct display of UTF-8 characters (like Traditional Chinese) in Excel
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${userName.replace(/\s+/g, '_')}_attendance_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};