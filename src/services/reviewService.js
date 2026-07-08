import api from './api';

/**
 * Reviews service — /api/reviews.
 * targetType is 'exam' or 'test-series'; targetId is that document's _id.
 */
export const reviewService = {
  list: async (targetType, targetId, page = 1, limit = 10) => {
    const res = await api.get(
      `/reviews?targetType=${targetType}&targetId=${targetId}&page=${page}&limit=${limit}`
    );
    return res.data; // { reviews, summary:{average,count,distribution}, hasMore }
  },

  mine: async (targetType, targetId) => {
    const res = await api.get(`/reviews/me?targetType=${targetType}&targetId=${targetId}`);
    return res.data; // { review }
  },

  submit: async ({ targetType, targetId, rating, title, comment }) => {
    const res = await api.post('/reviews', { targetType, targetId, rating, title, comment });
    return res.data; // { review }
  },

  remove: async (id) => {
    const res = await api.delete(`/reviews/${id}`);
    return res.data;
  },
};

export default reviewService;
