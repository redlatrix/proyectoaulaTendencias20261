import api from '../../../services/api';
import type { LoginRequest, AuthTokens, User, RegisterRequest } from '../types';

export const authApi = {
  login: (credentials: LoginRequest) =>
    api.post<AuthTokens>('/api/authentication/login/', credentials),

  getMe: () =>
    api.get<User>('/api/authentication/me/'),

  refresh: (refresh: string) =>
    api.post<{ access: string }>('/api/authentication/refresh/', { refresh }),

  register: (data: RegisterRequest) =>
    api.post<User>('/api/authentication/register/', data),

  listUsers: () =>
    api.get<User[]>('/api/authentication/users/'),

  deleteUser: (id: number) =>
    api.delete(`/api/authentication/users/${id}/`),
};
