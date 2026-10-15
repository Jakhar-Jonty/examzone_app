import api from './api';
import { t as tr } from '../i18n';

export const liveMockService = {
  overview: async () => (await api.get('/live-mock')).data, // { current, lastResult, history }
  leaderboard: async (id) => (await api.get(`/live-mock/${id}/leaderboard`)).data,
};

/** "Starts in 1d 4h" / "Ends in 35m" style countdown text. */
export const countdown = (target, now = Date.now()) => {
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hrs = Math.floor((mins % 1440) / 60);
  if (days > 0) return tr('{0}d {1}h', days, hrs);
  if (hrs > 0) return tr('{0}h {1}m', hrs, mins % 60);
  return tr('{0}m', Math.max(1, mins));
};

/** "Sun, 18 Oct · 11:00 am" in India time. */
export const liveWhen = (date) =>
  new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

export default liveMockService;
