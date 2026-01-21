import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// AI Chat Service
export const chatWithAI = async (message) => {
  try {
    const payload = {
      symptoms: message,
      extra: null,
    };

    const response = await apiClient.post('/api/recommend', payload);

    // backend returns { recommendation, raw }
    if (response?.data) {
      return { message: response.data.recommendation, raw: response.data.raw };
    }

    throw new Error('Invalid response from chat API');
  } catch (error) {
    console.error('Chat API error:', error);
    throw new Error('Failed to get AI response');
  }
};

// Health tracking API
export const submitHealthData = async (healthData) => {
  try {
    const response = await apiClient.post('/health-data', healthData);
    return response.data;
  } catch (error) {
    console.error('Health data submission error:', error);
    throw new Error('Failed to submit health data');
  }
};

// Get patient health summary
export const getHealthSummary = async (patientId) => {
  try {
    const response = await apiClient.get(`/health-summary/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Health summary error:', error);
    throw new Error('Failed to get health summary');
  }
};

// Appointment APIs
export const getAppointments = async (userId) => {
  try {
    const response = await apiClient.get(`/appointments/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Get appointments error:', error);
    throw new Error('Failed to get appointments');
  }
};

export const createAppointment = async (appointmentData) => {
  try {
    const response = await apiClient.post('/appointments', appointmentData);
    return response.data;
  } catch (error) {
    console.error('Create appointment error:', error);
    throw new Error('Failed to create appointment');
  }
};

// Medical Records API
export const getMedicalRecords = async (patientId) => {
  try {
    const response = await apiClient.get(`/medical-records/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Get medical records error:', error);
    throw new Error('Failed to get medical records');
  }
};

export const uploadMedicalRecord = async (recordData) => {
  try {
    const response = await apiClient.post('/medical-records', recordData);
    return response.data;
  } catch (error) {
    console.error('Upload medical record error:', error);
    throw new Error('Failed to upload medical record');
  }
};

export default apiClient;