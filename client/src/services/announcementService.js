import api from './api';

export const announcementService = {
  list: () => api.get('/announcements'),
  create: (payload) => api.post('/announcements', payload),
  update: (id, payload) => api.patch(`/announcements/${id}`, payload),
  remove: (id) => api.delete(`/announcements/${id}`),
};
