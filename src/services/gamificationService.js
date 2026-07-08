import api from './api';

/**
 * Gamification service — /api/gamification.
 * Leaderboard (by XP), badges (streak + performance), and rank progress.
 */
export const gamificationService = {
  getLeaderboard: async (limit = 50) => {
    const response = await api.get(`/gamification/leaderboard?limit=${limit}`);
    return response.data; // { leaderboard: [...], me: {...} }
  },

  getMyBadges: async () => {
    const response = await api.get('/gamification/me/badges');
    return response.data; // { badges: [...], earnedCount, total }
  },

  getMyProgress: async () => {
    const response = await api.get('/gamification/me/progress');
    return response.data; // { xp, rank, nextRank, xpToNextRank, progressToNext, streak }
  },
};

export default gamificationService;
