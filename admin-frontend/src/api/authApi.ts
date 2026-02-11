import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AuthStatus {
  setupRequired: boolean;
}

export interface SetupQRResponse {
  qrCodeUrl: string;
  manualEntryCode: string;
  sessionId: string;
}

export interface SetupRequest {
  password: string;
  totpCode: string;
  sessionId: string;
}

export interface SetupResponse {
  token: string;
  backupCodes: string[];
  message: string;
}

export interface LoginRequest {
  password: string;
  totpCode: string;
}

export interface LoginResponse {
  token: string;
}

export const authApi = {
  // Check if setup is required
  checkStatus: async (): Promise<AuthStatus> => {
    const response = await api.get<AuthStatus>('/auth/status');
    return response.data;
  },

  // Get QR code for setup
  getSetupQR: async (): Promise<SetupQRResponse> => {
    const response = await api.get<SetupQRResponse>('/auth/setup/qr');
    return response.data;
  },

  // Complete setup
  completeSetup: async (data: SetupRequest): Promise<SetupResponse> => {
    const response = await api.post<SetupResponse>('/auth/setup', data);
    return response.data;
  },

  // Login
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  // Verify token
  verifyToken: async (): Promise<{ valid: boolean; adminId: number }> => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  // Logout (optional)
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  }
};
