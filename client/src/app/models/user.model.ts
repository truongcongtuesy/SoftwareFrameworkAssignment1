export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  groups: number[];
  createdAt: Date;
  isActive: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message: string;
}
