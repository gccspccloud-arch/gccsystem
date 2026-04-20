import api from './api';

export const reportService = {
  dashboard: () => api.get('/reports/dashboard'),

  celebrants: ({ from, to } = {}) =>
    api.get('/reports/celebrants', { params: { from, to } }),

  attendance: (params = {}) =>
    api.get('/reports/attendance', { params }),

  memberAttendanceSummary: ({ from, to } = {}) =>
    api.get('/reports/member-attendance-summary', { params: { from, to } }),

  outreach: ({ from, to, outreach } = {}) =>
    api.get('/reports/outreach', { params: { from, to, outreach } }),
};
