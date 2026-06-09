import api from './api';

const reportService = {
  generateWeekly: async (data) => {
    const response = await api.post('/reports/weekly', data);
    return response.data;
  },

  generateMonthly: async (data) => {
    const response = await api.post('/reports/monthly', data);
    return response.data;
  },

  getAll: async (params = {}) => {
    const response = await api.get('/reports', { params });
    return response.data;
  },

  download: async (id) => {
    const response = await api.get(`/reports/download/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default reportService;
