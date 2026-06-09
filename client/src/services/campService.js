import api from './api';

const campService = {
  getAll: async (params = {}) => {
    const response = await api.get('/camps', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/camps/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/camps', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/camps/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/camps/${id}`);
    return response.data;
  },

  getWorkers: async (campId) => {
    const response = await api.get(`/camps/${campId}/workers`);
    return response.data;
  },

  addWorkers: async (campId, data) => {
    const response = await api.post(`/camps/${campId}/workers`, data);
    return response.data;
  },
};

export default campService;
