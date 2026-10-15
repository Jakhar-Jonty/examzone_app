import { Linking, Share } from 'react-native';
import api from './api';
import { t as tr } from '../i18n';

export const referralService = {
  me: async () => (await api.get('/referral')).data,
  apply: async (code) => (await api.post('/referral/apply', { code })).data,
};

/** Invite text with the code and link, in the UI language. */
export const inviteMessage = (ref) =>
  tr(
    'I prepare for HSSC on ExamZone — Haryana GK, daily current affairs and a live mock every Sunday. Join with my code {0} and get {1} free premium days: {2}',
    ref.code,
    ref.rewards?.friendDays ?? 3,
    ref.shareUrl
  );

/** Open WhatsApp with the text; fall back to the system share sheet. */
export const shareOnWhatsApp = async (text) => {
  try {
    // no canOpenURL check: it needs extra iOS/Android config; opening fails if WhatsApp is missing
    return await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
  } catch {
    return Share.share({ message: text });
  }
};

export default referralService;
