/** Categories the user prepares for (from examPreparations). */
export function getUserCategoryIds(user) {
  const preps = user?.examPreparations || [];
  if (!preps.length) return [];

  const first = preps[0];
  if (typeof first === 'string') return [];

  return preps
    .map((p) => p?.category?.toString?.() || p?.category)
    .filter(Boolean);
}

export function filterCategoriesForUser(allCategories, user) {
  const topLevel = (allCategories || []).filter((c) => !c.parentCategory);
  const userIds = getUserCategoryIds(user);
  if (!userIds.length) return topLevel;
  const idSet = new Set(userIds.map(String));
  const matched = topLevel.filter((c) => idSet.has(String(c._id)));
  return matched.length > 0 ? matched : topLevel;
}

/** Map UI sort key → API sortBy / sortOrder */
export function sortToServerParams(sortKey) {
  switch (sortKey) {
    case 'oldest':
      return { sortBy: 'scheduledTime', sortOrder: 'asc' };
    case 'duration':
      return { sortBy: 'duration', sortOrder: 'asc' };
    case 'popular':
      return { sortBy: 'popular', sortOrder: 'desc' };
    case 'score':
      return { sortBy: 'userScore', sortOrder: 'desc' };
    case 'newest':
    default:
      return { sortBy: 'scheduledTime', sortOrder: 'desc' };
  }
}

export function examFilterToAttemptStatus(examFilter) {
  if (examFilter === 'available') return 'available';
  if (examFilter === 'attempted') return 'attempted';
  return '';
}
