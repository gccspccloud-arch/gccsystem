import api from './api';

export const attendanceService = {
  list: ({ targetKind, targetRef }) =>
    api.get('/attendance', { params: { targetKind, targetRef } }),

  toggleMember: ({ targetKind, targetRef, member, enteredAt }) =>
    api.post('/attendance/toggle-member', { targetKind, targetRef, member, enteredAt }),

  updateTime: (id, enteredAt) =>
    api.patch(`/attendance/${id}/time`, { enteredAt }),

  addVisitor: ({ targetKind, targetRef, visitorName, visitorAddress, visitorContactNumber }) =>
    api.post('/attendance/visitor', {
      targetKind, targetRef, visitorName, visitorAddress, visitorContactNumber,
    }),

  promoteVisitor: (id, overrides = {}) =>
    api.post(`/attendance/${id}/promote`, overrides),

  remove: (id) => api.delete(`/attendance/${id}`),

  byMember: (memberId) => api.get(`/attendance/by-member/${memberId}`),
};
