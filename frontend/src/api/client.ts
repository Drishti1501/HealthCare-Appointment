import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token to every request if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export const authAPI = {
  login: (email: string, password: string) => apiClient.post('/auth/login/', { email, password }),
  register: (data: any) => apiClient.post('/auth/register/', data),
  getMe: () => apiClient.get('/auth/me/'),
  getUsers: (role?: string) => apiClient.get(`/auth/users/${role ? `?role=${role}` : ''}`),
};

export const doctorAPI = {
  list: (params?: { specialization?: string; search?: string }) => apiClient.get('/appointments/doctors/', { params }),
  get: (id: number) => apiClient.get(`/appointments/doctors/${id}/`),
  create: (data: any) => apiClient.post('/appointments/doctors/', data),
  update: (id: number, data: any) => apiClient.patch(`/appointments/doctors/${id}/`, data),
  getSlots: (doctorId: number, date: string) => apiClient.get(`/appointments/doctors/${doctorId}/slots/?date=${date}`),
};

export const appointmentAPI = {
  holdSlot: (doctorId: number, date: string, startTime: string) =>
    apiClient.post('/appointments/hold-slot/', { doctor_id: doctorId, date, start_time: startTime }),
  confirmBooking: (data: {
    hold_token: string;
    symptoms_text: string;
    symptom_duration?: string;
    severity_scale?: number;
  }) => apiClient.post('/appointments/confirm-booking/', data),
  list: (params?: { status?: string; date?: string }) => apiClient.get('/appointments/list/', { params }),
  get: (id: number) => apiClient.get(`/appointments/${id}/`),
  cancel: (id: number, reason: string) => apiClient.post(`/appointments/${id}/cancel/`, { reason }),
  getLeaves: () => apiClient.get('/appointments/leaves/'),
  createLeave: (data: { doctor_id: number; start_date: string; end_date: string; reason?: string }) =>
    apiClient.post('/appointments/leaves/', data),
};

export const prescriptionAPI = {
  submitConsultation: (data: {
    appointment_id: number;
    diagnosis: string;
    clinical_notes: string;
    follow_up_date?: string;
    items: Array<{
      medication_name: string;
      dosage: string;
      frequency: string;
      duration_days: number;
      meal_timing: string;
      instructions?: string;
    }>;
  }) => apiClient.post('/prescriptions/submit-consultation/', data),
  list: () => apiClient.get('/prescriptions/list/'),
  get: (id: number) => apiClient.get(`/prescriptions/${id}/`),
  getReminders: () => apiClient.get('/prescriptions/reminders/'),
};

export const aiAPI = {
  previewSymptoms: (symptoms: string) => apiClient.post('/ai/preview-symptoms/', { symptoms }),
  previewPostVisit: (data: any) => apiClient.post('/ai/preview-post-visit/', data),
};

export const adminAPI = {
  getNotificationLogs: (status?: string) => apiClient.get(`/integrations/notifications/${status ? `?status=${status}` : ''}`),
};
