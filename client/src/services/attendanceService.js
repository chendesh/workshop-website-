import api from './api';

const attendanceService = {
  getAll: async (params = {}) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/attendance', data);
    return response.data;
  },

  bulkCreate: async (data) => {
    const response = await api.post('/attendance/bulk', data);
    return response.data;
  },

  getByWorker: async (workerId, params = {}) => {
    const response = await api.get(`/attendance/worker/${workerId}`, { params });
    return response.data;
  },
};

export default attendanceService;
