import api from './api';

export const practiceSessionService = {
  list: async ({ limit = 20 } = {}) => {
    const res = await api.get(`/practice-sessions?limit=${limit}`);
    return res.data;
  },

  stats: async () => {
    const res = await api.get('/practice-sessions/stats');
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/practice-sessions/${id}`);
    return res.data;
  },

  create: async ({ sessionType, filters, questionCount }) => {
    const res = await api.post('/practice-sessions', {
      sessionType,
      filters,
      questionCount,
    });
    return res.data;
  },

  answer: async (id, { questionId, selectedAnswer, timeSpent }) => {
    const res = await api.patch(`/practice-sessions/${id}/answer`, {
      questionId,
      selectedAnswer,
      timeSpent,
    });
    return res.data;
  },

  complete: async (id) => {
    const res = await api.patch(`/practice-sessions/${id}/complete`);
    return res.data;
  },
};

export default practiceSessionService;
