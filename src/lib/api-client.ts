// API Client for Backend Server
import axios from 'axios';

// Use relative URL so it works on any port/domain
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  timeout: 300000, // 5 minutes timeout for large uploads
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if 401 and NOT on login endpoint
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  username: string;
  password?: string;
  full_name?: string;
  role: 'admin' | 'teacher' | 'user';
  profile_picture?: string;
  assigned_subject_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Content {
  id: string;
  title: string;
  body?: string;
  type: 'news' | 'preparation' | 'material';
  subject_id?: string;
  author_id?: string;
  author_name?: string;
  author_full_name?: string;
  media_urls: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUTH API
// ============================================================================

export const authAPI = {
  login: async (username: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { username, password });
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('current_user', JSON.stringify(data.user));
    return data;
  },

  register: async (userData: {
    username: string;
    password: string;
    full_name?: string;
    role?: string;
  }) => {
    const { data } = await apiClient.post('/auth/register', userData);
    return data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return data;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('current_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// ============================================================================
// USER API
// ============================================================================

export const userAPI = {
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get('/users');
    return data;
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await apiClient.get(`/users/${id}`);
    return data;
  },

  update: async (id: string, updates: Partial<User>): Promise<User> => {
    const { data } = await apiClient.put(`/users/${id}`, updates);
    // Update current user in localStorage if updating self
    const currentUser = authAPI.getCurrentUser();
    if (currentUser && currentUser.id === id) {
      localStorage.setItem('current_user', JSON.stringify(data));
    }
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};

// ============================================================================
// SUBJECT API
// ============================================================================

export const subjectAPI = {
  getAll: async (): Promise<Subject[]> => {
    const { data } = await apiClient.get('/subjects');
    return data;
  },

  create: async (subject: { name: string; description?: string }): Promise<Subject> => {
    const { data } = await apiClient.post('/subjects', subject);
    return data;
  },

  update: async (id: string, updates: Partial<Subject>): Promise<Subject> => {
    const { data } = await apiClient.put(`/subjects/${id}`, updates);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/subjects/${id}`);
  },
};

// ============================================================================
// CONTENT API
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export const contentAPI = {
  getAll: async (filters?: { 
    type?: string; 
    subject_id?: string;
    page?: number;
    limit?: number;
  }): Promise<Content[] | PaginatedResponse<Content>> => {
    const { data } = await apiClient.get('/content', { params: filters });
    // Return paginated response if pagination params were provided
    if (filters?.page || filters?.limit) {
      return data as PaginatedResponse<Content>;
    }
    // For backward compatibility, return data array if it's paginated response
    return Array.isArray(data) ? data : data.data;
  },

  getById: async (id: string): Promise<Content> => {
    const { data } = await apiClient.get(`/content/${id}`);
    return data;
  },

  create: async (content: {
    title: string;
    body?: string;
    type: 'news' | 'preparation' | 'material';
    subject_id?: string;
    urls?: string[];
  }): Promise<Content> => {
    const { data } = await apiClient.post('/content', content);
    return data;
  },

  update: async (id: string, updates: Partial<Content>): Promise<Content> => {
    const { data } = await apiClient.put(`/content/${id}`, updates);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/content/${id}`);
  },
};

// Alias for backward compatibility
export const contentApi = contentAPI;

// File operations
export const fileApi = {
  upload: async (contentId: string, files: File[], onProgress?: (progress: number) => void): Promise<any> => {
    const formData = new FormData();
    formData.append('content_id', contentId);
    
    files.forEach(file => {
      formData.append('files', file);
    });

    const { data } = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return data;
  },

  getByContentId: async (contentId: string): Promise<any[]> => {
    const { data } = await apiClient.get(`/files/content/${contentId}`);
    return data;
  },

  download: async (fileId: string): Promise<Blob> => {
    const { data } = await apiClient.get(`/files/download/${fileId}`, {
      responseType: 'blob',
    });
    return data;
  },

  delete: async (fileId: string): Promise<void> => {
    await apiClient.delete(`/files/${fileId}`);
  },

  getDownloadUrl: (fileId: string): string => {
    return `${API_BASE_URL}/files/download/${fileId}`;
  },
};

export default apiClient;
