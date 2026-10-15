import hi from './hi.json';

// Gettext-style UI translation: the English text is the key, so a missing
// Hindi entry simply shows English. `{0}`, `{1}` … are filled from args:
//   t('Done today · {0}/{1} correct', correct, total)
//
// The language follows user.preferredLanguage (the EN/हिन्दी toggle). App.js
// calls setLanguage() and remounts the navigator when it changes, so plain
// t() calls re-render without every component subscribing to a context.
const DICTIONARIES = { Hindi: hi };

let current = 'English';

export const setLanguage = (lang) => {
  current = DICTIONARIES[lang] ? lang : 'English';
};

export const getLanguage = () => current;
export const isHindi = () => current === 'Hindi';

const fill = (text, args) =>
  args.length ? text.replace(/\{(\d+)\}/g, (m, i) => (args[i] !== undefined && args[i] !== null ? String(args[i]) : '')) : text;

export const t = (text, ...args) => {
  if (typeof text !== 'string') return text;
  const dict = DICTIONARIES[current];
  return fill((dict && dict[text]) || text, args);
};

export default t;
