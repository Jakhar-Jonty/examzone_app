import { t as tr } from '../i18n';

// Icon + tone per series type, shared by the list and detail screens
const TYPES = {
  mock: { icon: 'document-text-outline', tone: 'blue', label: 'Mock tests' },
  'full-length': { icon: 'trophy-outline', tone: 'orange', label: 'Live mocks' },
  'topic-wise': { icon: 'layers-outline', tone: 'purple', label: 'Topic tests' },
  sectional: { icon: 'grid-outline', tone: 'green', label: 'Sectional tests' },
  pyq: { icon: 'time-outline', tone: 'red', label: 'Past papers' },
  practice: { icon: 'flash-outline', tone: 'green', label: 'Practice tests' },
};

export const seriesType = (type) => TYPES[type] || TYPES.mock;
export const seriesTypeLabel = (type) => tr(seriesType(type).label);

/** "Free" / "Premium" / "₹199" badge text. */
export const accessLabel = (s) => {
  if (s.access === 'premium') return tr('Premium');
  if (s.access === 'paid') return `₹${s.discountPrice && s.discountPrice < s.price ? s.discountPrice : s.price}`;
  return tr('Free');
};
