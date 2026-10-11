import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SUBCATEGORIES_KEY = 'recent_subcategories';
const MAX_RECENT = 12;

/** @returns {Promise<string[]>} subcategory ids, most recent first */
export async function getRecentSubcategoryIds() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SUBCATEGORIES_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

/** Persist that this subcategory was opened (moves to front). */
export async function trackRecentSubcategory(subCategoryId) {
  if (!subCategoryId) return;
  try {
    const id = String(subCategoryId);
    const prev = await getRecentSubcategoryIds();
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_SUBCATEGORIES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** Sort list so recent ids appear first (stable for the rest). */
export function sortByRecentIds(items, recentIds, getId = (item) => item._id) {
  if (!items?.length || !recentIds?.length) return items || [];
  const rank = new Map(recentIds.map((id, i) => [String(id), i]));
  return [...items].sort((a, b) => {
    const ra = rank.has(String(getId(a))) ? rank.get(String(getId(a))) : 9999;
    const rb = rank.has(String(getId(b))) ? rank.get(String(getId(b))) : 9999;
    return ra - rb;
  });
}
