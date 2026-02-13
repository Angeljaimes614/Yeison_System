export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'supervisor' | 'cajero';
  branchId?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginError {
  message: string;
  error: string;
  statusCode: number;
}
