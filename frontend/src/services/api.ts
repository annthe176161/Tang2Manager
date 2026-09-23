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

export const invoiceApi = {
  getCategories: async () => {
    const res = await api.get('/invoices/categories');
    return res.data;
  },

  togglePayment: async (id: number) => {
    const res = await api.put(`/invoices/categories/${id}/toggle-payment`);
    return res.data;
  },

  updateCategory: async (id: number, data: any) => {
    const res = await api.put(`/invoices/categories/${id}`, data);
    return res.data;
  },

  getItemsByCategory: async (categoryId: number) => {
    const res = await api.get(`/invoices/items/${categoryId}`);
    return res.data;
  },

  createItem: async (item: any) => {
    const res = await api.post('/invoices/items', item);
    return res.data;
  },

  updateItem: async (id: number, item: any) => {
    const res = await api.put(`/invoices/items/${id}`, item);
    return res.data;
  },

  deleteItem: async (id: number) => {
    const res = await api.delete(`/invoices/items/${id}`);
    return res.data;
  },
};
