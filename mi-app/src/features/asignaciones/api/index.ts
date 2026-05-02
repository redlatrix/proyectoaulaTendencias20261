import api from '../../../services/api';
import type { Assignment, AssignmentFormData } from '../types';

export const asignacionesApi = {
  list: () =>
    api.get<Assignment[]>('/api/resource/assignments/'),

  create: (data: AssignmentFormData) =>
    api.post<Assignment>('/api/resource/assignments/', data),

  return: (id: number, returnedAt: string) =>
    api.patch<Assignment>(`/api/resource/assignments/${id}/`, { returned_at: returnedAt }),

  delete: (id: number) =>
    api.delete(`/api/resource/assignments/${id}/`),
};
