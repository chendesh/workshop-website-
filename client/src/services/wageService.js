import api from './api';

const wageService = {
  getAll: async (params = {}) => {
    const response = await api.get('/wages', { params });
    return response.data;
  },

  getByWorker: async (workerId, params = {}) => {
    const response = await api.get(`/wages/worker/${workerId}`, { params });
    return response.data;
  },

  calculate: async (data) => {
    const response = await api.post('/wages/calculate', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/wages/${id}`, data);
    return response.data;
  },
};

export default wageService;
