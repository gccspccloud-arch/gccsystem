import api from './api';

export const memberService = {
  create: (payload) => api.post('/members', payload),
  list: (params) => api.get('/members', { params }),
  getById: (id) => api.get(`/members/${id}`),
  update: (id, payload) => api.patch(`/members/${id}`, payload),
  remove: (id) => api.delete(`/members/${id}`),
};
