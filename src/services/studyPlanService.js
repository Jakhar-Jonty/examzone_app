import api from './api';

export const studyPlanService = {
  list: async () => {
    const res = await api.get('/study-plans');
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/study-plans/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post('/study-plans', payload);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/study-plans/${id}`);
    return res.data;
  },

  updateTopicStatus: async (planId, { subjectIndex, topicIndex, status }) => {
    const res = await api.patch(`/study-plans/${planId}/topic-status`, {
      subjectIndex,
      topicIndex,
      status,
    });
    return res.data;
  },

  completeMilestone: async (planId, milestoneId) => {
    const res = await api.patch(`/study-plans/${planId}/milestone/${milestoneId}`);
    return res.data;
  },
};

export default studyPlanService;
