import api from './api';

export const ldpCategoryService = {
  list: (params) => api.get('/ldp-categories', { params }),
  create: (payload) => api.post('/ldp-categories', payload),
  update: (id, payload) => api.patch(`/ldp-categories/${id}`, payload),
  remove: (id) => api.delete(`/ldp-categories/${id}`),
  renameOption: (id, { from, to }) =>
    api.post(`/ldp-categories/${id}/rename-option`, { from, to }),
};
