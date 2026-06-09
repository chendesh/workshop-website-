import api from './api';

const workerService = {
  getAll: async (params = {}) => {
    const response = await api.get('/workers', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/workers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/workers', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/workers/${id}`, data);
    return response.data;
  },

  deactivate: async (id) => {
    const response = await api.put(`/workers/${id}/deactivate`);
    return response.data;
  },

  resetPassword: async (id) => {
    const response = await api.put(`/workers/${id}/reset-password`);
    return response.data;
  },
};

export default workerService;
