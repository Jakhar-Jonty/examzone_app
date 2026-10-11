/** Sort exam lists on category / subcategory screens (client-side). */
export const EXAM_SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'popular', label: 'Popular' },
  { key: 'duration', label: 'Duration' },
  { key: 'score', label: 'Your score' },
];

export function sortExams(exams, sortKey) {
  const list = [...(exams || [])];
  switch (sortKey) {
    case 'oldest':
      return list.sort(
        (a, b) => new Date(a.scheduledTime || 0) - new Date(b.scheduledTime || 0)
      );
    case 'popular':
      return list.sort(
        (a, b) =>
          (b.attemptStats?.totalAttempts || 0) - (a.attemptStats?.totalAttempts || 0)
      );
    case 'duration':
      return list.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    case 'score':
      return list.sort((a, b) => (b.lastScore ?? -1) - (a.lastScore ?? -1));
    case 'newest':
    default:
      return list.sort(
        (a, b) => new Date(b.scheduledTime || 0) - new Date(a.scheduledTime || 0)
      );
  }
}
