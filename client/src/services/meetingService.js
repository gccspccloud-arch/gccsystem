import api from './api';

export const meetingTypeService = {
  list: (params) => api.get('/meeting-types', { params }),
  create: (payload) => api.post('/meeting-types', payload),
  update: (id, payload) => api.patch(`/meeting-types/${id}`, payload),
  remove: (id) => api.delete(`/meeting-types/${id}`),
};

export const meetingService = {
  list: (params) => api.get('/meetings', { params }),
  get: (id) => api.get(`/meetings/${id}`),
  create: (payload) => api.post('/meetings', payload),
  update: (id, payload) => api.patch(`/meetings/${id}`, payload),
  remove: (id) => api.delete(`/meetings/${id}`),
};
