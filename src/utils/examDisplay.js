/** Short language label for compact exam cards. */
export function shortLanguageLabel(language) {
  if (!language) return null;
  if (language === 'Both') return 'EN + HI';
  if (language === 'English') return 'EN';
  if (language === 'Hindi') return 'HI';
  return language;
}

export function difficultyColor(level) {
  switch (level) {
    case 'Easy':
      return '#10b981';
    case 'Medium':
      return '#f59e0b';
    case 'Hard':
      return '#ef4444';
    case 'Mixed':
      return '#6366f1';
    default:
      return null;
  }
}

export function formatAttemptCount(count) {
  if (count == null || count <= 0) return null;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(count);
}

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/** Human-readable label for populated category / subCategory / tier refs. */
export function getRefLabel(ref) {
  if (!ref) return null;
  if (typeof ref === 'string') {
    if (OBJECT_ID_RE.test(ref.trim())) return null;
    return ref.trim() || null;
  }
  return ref.displayName || ref.name || ref.code || null;
}

export function formatExamBreadcrumb(exam) {
  return [getRefLabel(exam?.category), getRefLabel(exam?.subCategory), getRefLabel(exam?.tier)]
    .filter(Boolean)
    .join(' › ');
}
