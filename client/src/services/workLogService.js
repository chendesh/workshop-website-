import api from './api';

const workLogService = {
  getAll: async (params = {}) => {
    const response = await api.get('/work-logs', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/work-logs/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/work-logs', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/work-logs/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/work-logs/${id}`);
    return response.data;
  },

  getStats: async (params = {}) => {
    const response = await api.get('/work-logs/stats', { params });
    return response.data;
  },
};

export default workLogService;
