import api from './api';

export const outreachService = {
  list: (params) => api.get('/outreach', { params }),
  get: (id) => api.get(`/outreach/${id}`),
  create: (payload) => api.post('/outreach', payload),
  update: (id, payload) => api.patch(`/outreach/${id}`, payload),
  remove: (id) => api.delete(`/outreach/${id}`),
};

export const outreachAttendeeService = {
  list: (params) => api.get('/outreach-attendees', { params }),
  get: (id) => api.get(`/outreach-attendees/${id}`),
  create: (payload) => api.post('/outreach-attendees', payload),
  update: (id, payload) => api.patch(`/outreach-attendees/${id}`, payload),
  remove: (id) => api.delete(`/outreach-attendees/${id}`),
  promote: (id, overrides = {}) => api.post(`/outreach-attendees/${id}/promote`, overrides),
};

export const outreachSessionService = {
  list: (params) => api.get('/outreach-sessions', { params }),
  get: (id) => api.get(`/outreach-sessions/${id}`),
  create: (payload) => api.post('/outreach-sessions', payload),
  update: (id, payload) => api.patch(`/outreach-sessions/${id}`, payload),
  remove: (id) => api.delete(`/outreach-sessions/${id}`),
};
