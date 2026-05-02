import api from '../../../services/api';
import type { Resource, ResourceType, ResourceFormData, ResourceUpdateData, TipoRecursoFormData } from '../types';

export const recursosApi = {
  // ── Tipos de recurso ──────────────────────────────────────────────────────
  listTipos: () =>
    api.get<ResourceType[]>('/api/resource/resource-types/'),

  createTipo: (data: TipoRecursoFormData) =>
    api.post<ResourceType>('/api/resource/resource-types/', data),

  updateTipo: (id: number, data: Partial<TipoRecursoFormData>) =>
    api.patch<ResourceType>(`/api/resource/resource-types/${id}/`, data),

  deleteTipo: (id: number) =>
    api.delete(`/api/resource/resource-types/${id}/`),

  // ── Recursos ──────────────────────────────────────────────────────────────
  listRecursos: () =>
    api.get<Resource[]>('/api/resource/resources/'),

  createRecurso: (data: ResourceFormData) =>
    api.post<Resource>('/api/resource/resources/', data),

  updateRecurso: (id: number, data: Partial<ResourceUpdateData>) =>
    api.patch<Resource>(`/api/resource/resources/${id}/`, data),

  deleteRecurso: (id: number) =>
    api.delete(`/api/resource/resources/${id}/`),
};
