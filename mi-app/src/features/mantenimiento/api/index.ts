import api from '../../../services/api';
import type { Maintenance, MantenimientoFormData, MaintenanceStatus } from '../types';

export const mantenimientoApi = {
  list: () =>
    api.get<Maintenance[]>('/api/maintenance/maintenances/'),

  create: (data: MantenimientoFormData) =>
    api.post<Maintenance>('/api/maintenance/maintenances/', data),

  updateStatus: (id: number, status: MaintenanceStatus) =>
    api.patch<Maintenance>(`/api/maintenance/maintenances/${id}/`, { status }),

  delete: (id: number) =>
    api.delete(`/api/maintenance/maintenances/${id}/`),

  getAlerts: (days = 7) =>
    api.get<Maintenance[]>(`/api/maintenance/maintenances/alerts/?days=${days}`),
};
