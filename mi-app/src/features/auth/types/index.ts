export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  cargo: string;
  area: string;
  groups: string[];
  is_superuser: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
  cargo?: string;
  area?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
