export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  refreshToken: string;
  id: number;
  username: string;
  email: string;
  type: string;
}

export interface AdminRefreshRequest {
  refreshToken: string;
}

export interface AdminRefreshResponse {
  token: string;
  refreshToken: string;
}

export interface AdminSession {
  id: number;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}
