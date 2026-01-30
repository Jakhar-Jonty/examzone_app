import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  EXAM_ANSWERS: (attemptId) => `exam_answers_${attemptId}`,
  EXAM_MARKED: (attemptId) => `exam_marked_${attemptId}`,
  EXAM_TIME: (attemptId) => `exam_time_${attemptId}`,
  EXAM_PENDING_SYNC: (attemptId) => `exam_pending_sync_${attemptId}`,
};

export const examStorage = {
  // Save answers for an attempt
  saveAnswers: async (attemptId, answers) => {
    try {
      const key = STORAGE_KEYS.EXAM_ANSWERS(attemptId);
      await AsyncStorage.setItem(key, JSON.stringify(answers));
      return true;
    } catch (error) {
      console.error('Failed to save answers to storage:', error);
      return false;
    }
  },

  // Get answers for an attempt
  getAnswers: async (attemptId) => {
    try {
      const key = STORAGE_KEYS.EXAM_ANSWERS(attemptId);
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get answers from storage:', error);
      return null;
    }
  },

  // Save marked questions
  saveMarked: async (attemptId, markedSet) => {
    try {
      const key = STORAGE_KEYS.EXAM_MARKED(attemptId);
      const markedArray = Array.from(markedSet);
      await AsyncStorage.setItem(key, JSON.stringify(markedArray));
      return true;
    } catch (error) {
      console.error('Failed to save marked questions:', error);
      return false;
    }
  },

  // Get marked questions
  getMarked: async (attemptId) => {
    try {
      const key = STORAGE_KEYS.EXAM_MARKED(attemptId);
      const data = await AsyncStorage.getItem(key);
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch (error) {
      console.error('Failed to get marked questions:', error);
      return new Set();
    }
  },

  // Save time remaining
  saveTimeRemaining: async (attemptId, timeRemaining) => {
    try {
      if (!attemptId) {
        console.warn('Cannot save time remaining: attemptId is null');
        return false;
      }
      if (timeRemaining === null || timeRemaining === undefined) {
        console.warn('Cannot save time remaining: timeRemaining is null/undefined');
        return false;
      }
      const key = STORAGE_KEYS.EXAM_TIME(attemptId.toString());
      await AsyncStorage.setItem(key, timeRemaining.toString());
      return true;
    } catch (error) {
      console.error('Failed to save time remaining:', error);
      return false;
    }
  },

  // Get time remaining
  getTimeRemaining: async (attemptId) => {
    try {
      const key = STORAGE_KEYS.EXAM_TIME(attemptId);
      const timeStr = await AsyncStorage.getItem(key);
      return timeStr ? parseInt(timeStr, 10) : null;
    } catch (error) {
      console.error('Failed to get time remaining:', error);
      return null;
    }
  },

  // Mark answers as pending sync
  markPendingSync: async (attemptId) => {
    try {
      const key = STORAGE_KEYS.EXAM_PENDING_SYNC(attemptId);
      await AsyncStorage.setItem(key, 'true');
      return true;
    } catch (error) {
      console.error('Failed to mark pending sync:', error);
      return false;
    }
  },

  // Check if sync is pending
  isPendingSync: async (attemptId) => {
    try {
      const key = STORAGE_KEYS.EXAM_PENDING_SYNC(attemptId);
      const value = await AsyncStorage.getItem(key);
      return value === 'true';
    } catch (error) {
      return false;
    }
  },

  // Clear pending sync flag
  clearPendingSync: async (attemptId) => {
    try {
      const key = STORAGE_KEYS.EXAM_PENDING_SYNC(attemptId);
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to clear pending sync:', error);
      return false;
    }
  },

  // Clear all data for an attempt
  clearAttemptData: async (attemptId) => {
    try {
      const keys = Object.values(STORAGE_KEYS).map((keyFn) => keyFn(attemptId));
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Failed to clear attempt data:', error);
      return false;
    }
  },
};

export default AsyncStorage;

