import api from './api';

export const currentAffairsService = {
  list: async ({ limit = 20, before } = {}) => {
    const res = await api.get('/current-affairs', { params: { limit, before } });
    return res.data; // { items, today }
  },

  get: async (id) => {
    const res = await api.get(`/current-affairs/${id}`);
    return res.data.item;
  },

  // Practice one item's MCQs ({ id }) or a whole day's ({ date })
  startQuiz: async ({ id, date }) => {
    const res = await api.post('/current-affairs/quiz', id ? { id } : { date });
    return res.data.session;
  },
};

/** "Today" / "Yesterday" / "12 Oct" for an IST "YYYY-MM-DD" day. */
export const dayLabel = (date, today) => {
  if (!date) return '';
  if (date === today) return 'Today';
  const t = new Date(`${today}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - 1);
  if (date === t.toISOString().slice(0, 10)) return 'Yesterday';
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

/** Pick the Hindi or English text, falling back to whichever exists. */
export const pickLang = (hindi, en, hi) => (hindi ? hi || en : en || hi) || '';

export default currentAffairsService;
