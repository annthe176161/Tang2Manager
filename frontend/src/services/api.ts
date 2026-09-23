import axios from 'axios';
import type { Employee, ShiftTemplate, WeeklySchedule, Assignment } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const scheduleApi = {
  getShiftTemplates: async (): Promise<ShiftTemplate[]> => {
    const res = await api.get<ShiftTemplate[]>('/schedules/shift-templates');
    return res.data;
  },

  getScheduleByDate: async (dateStr?: string): Promise<WeeklySchedule> => {
    const res = await api.get<WeeklySchedule>('/schedules/by-date', {
      params: dateStr ? { date: dateStr } : {},
    });
    return res.data;
  },

  saveSchedule: async (data: {
    weekStartDate: string;
    note?: string;
    assignments: Assignment[];
  }): Promise<WeeklySchedule> => {
    const res = await api.post<WeeklySchedule>('/schedules/save', data);
    return res.data;
  },

  getEmployees: async (): Promise<Employee[]> => {
    const res = await api.get<Employee[]>('/employees');
    return res.data;
  },
};
