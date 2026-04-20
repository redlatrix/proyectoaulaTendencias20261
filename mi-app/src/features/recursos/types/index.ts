export type ResourceCategory = 'PHYSICAL' | 'DIGITAL' | 'SPACE';
export type ResourceStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'RETIRED';

export interface ResourceType {
  id: number;
  name: string;
  description: string;
  category: ResourceCategory;
}

export interface Resource {
  id: number;
  name: string;
  code: string;
  type: number | null;
  type_name: string;
  technical_description: string;
  acquisition_date: string | null;
  value: string;
  status: ResourceStatus;
  responsible_area: string;
  has_active_assignment: boolean;
}

export interface ResourceFormData {
  name: string;
  code: string;
  type: number | '';
  technical_description: string;
  acquisition_date: string;
  value: string;
  responsible_area: string;
}

export interface ResourceUpdateData extends ResourceFormData {
  status: ResourceStatus;
}

export interface TipoRecursoFormData {
  name: string;
  description: string;
  category: ResourceCategory | '';
}

export const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  PHYSICAL: 'Físico',
  DIGITAL: 'Digital',
  SPACE: 'Espacio',
};

export const STATUS_LABEL: Record<ResourceStatus, string> = {
  AVAILABLE: 'Disponible',
  ASSIGNED: 'Asignado',
  MAINTENANCE: 'En mantenimiento',
  RETIRED: 'Dado de baja',
};

export const STATUS_COLOR: Record<ResourceStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  RETIRED: 'bg-gray-100 text-gray-500',
};
