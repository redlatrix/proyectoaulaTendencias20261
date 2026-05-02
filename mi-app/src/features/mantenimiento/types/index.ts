export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Maintenance {
  id: number;
  resource: number;
  resource_code: string;
  resource_name: string;
  maintenance_type: MaintenanceType;
  scheduled_date: string;
  technician: string;
  description: string;
  estimated_cost: string | null;
  status: MaintenanceStatus;
  start_date: string | null;
  end_date: string | null;
  actual_cost: string | null;
  notes: string;
}

export interface MantenimientoFormData {
  resource: number | '';
  maintenance_type: MaintenanceType | '';
  scheduled_date: string;
  technician: string;
  description: string;
  estimated_cost: string;
}

export const MAINTENANCE_TYPE_LABEL: Record<MaintenanceType, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
};

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

export const MAINTENANCE_STATUS_COLOR: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
