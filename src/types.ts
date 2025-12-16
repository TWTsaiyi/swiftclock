export interface Shift {
  id: string;
  startTime: number; // Unix timestamp
  endTime?: number; // Unix timestamp
  note?: string;
}

export interface DailyStat {
  date: string;
  hours: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  department?: string;
  employeeId?: string;
  rank?: number;
}