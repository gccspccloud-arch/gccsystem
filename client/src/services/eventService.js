import api from './api';

export const eventTypeService = {
  list: (params) => api.get('/event-types', { params }),
  create: (payload) => api.post('/event-types', payload),
  update: (id, payload) => api.patch(`/event-types/${id}`, payload),
  remove: (id) => api.delete(`/event-types/${id}`),
};

export const eventService = {
  list: (params) => api.get('/events', { params }),
  getById: (id) => api.get(`/events/${id}`),
  create: (payload) => api.post('/events', payload),
  update: (id, payload) => api.patch(`/events/${id}`, payload),
  remove: (id) => api.delete(`/events/${id}`),
};
