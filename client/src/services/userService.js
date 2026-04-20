import api from './api';

export const userService = {
  list: () => api.get('/users'),
  listAssignable: () => api.get('/users/assignable'),
  getByMember: (memberId) => api.get(`/users/by-member/${memberId}`),
  create: (payload) => api.post('/users', payload),
  update: (id, payload) => api.patch(`/users/${id}`, payload),
  remove: (id) => api.delete(`/users/${id}`),
};
