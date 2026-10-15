import api from './api';

/**
 * Test Series service — /api/test-series.
 * Browse published series, view detail (with per-exam lock/progress),
 * enroll (free instant; paid uses mock payment for now), and list my series.
 */
export const testSeriesService = {
  list: async ({ category, search, subExam, page = 1, limit = 30 } = {}) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (subExam) params.set('subExam', subExam);
    if (search) params.set('search', search);
    params.set('page', page);
    params.set('limit', limit);
    const res = await api.get(`/test-series?${params.toString()}`);
    return res.data; // { series, total, totalPages, currentPage }
  },

  detail: async (id) => {
    const res = await api.get(`/test-series/${id}`);
    return res.data; // { series, access, canAccess, isEnrolled, nextIndex, progress }
  },

  // Free series: call with no body. Paid series: pass { paymentId, isMock }.
  enroll: async (id, payment = {}) => {
    const res = await api.post(`/test-series/${id}/enroll`, payment);
    return res.data; // { message, enrollment }
  },

  myEnrollments: async () => {
    const res = await api.get('/test-series/me/enrollments');
    return res.data; // { enrollments: [{ ...enrollment, progress }] }
  },
};

export default testSeriesService;
