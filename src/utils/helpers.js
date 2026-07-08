// Streak badge tiers — mirrors the server BADGES in utils/streakManager.js.
// Keep thresholds/icons in sync with the backend so the home streak badge
// matches the Badges screen and the web Achievements page.
export const STREAK_TIERS = [
  { threshold: 1, icon: '🎯', name: 'Getting Started' },
  { threshold: 3, icon: '🔥', name: 'On Fire' },
  { threshold: 7, icon: '⚔️', name: 'Week Warrior' },
  { threshold: 14, icon: '💪', name: 'Dedicated' },
  { threshold: 30, icon: '⭐', name: 'Consistent' },
  { threshold: 60, icon: '🚀', name: 'Unstoppable' },
  { threshold: 100, icon: '👑', name: 'Centurion' },
  { threshold: 200, icon: '🏆', name: 'Legend' },
  { threshold: 300, icon: '🎖️', name: 'Master' },
  { threshold: 365, icon: '🌟', name: 'Year Champion' },
];

// Returns { current, next } streak badge tiers for a given streak length.
// current = highest tier earned (null if streak is 0); next = upcoming tier.
export const getStreakBadge = (streak = 0) => {
  let current = null;
  let next = null;
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.threshold) current = tier;
    else { next = tier; break; }
  }
  return { current, next };
};

// Date formatting helper
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${month} ${day}, ${year} ${hours}:${minutes}`;
};

// Exam status helper (matches web frontend logic)
export const getExamStatus = (exam) => {
  const now = new Date();

  // Parse scheduledTime
  let scheduledTime;
  if (typeof exam.scheduledTime === 'string') {
    scheduledTime = new Date(exam.scheduledTime);
  } else if (typeof exam.scheduledTime === 'number') {
    scheduledTime = new Date(exam.scheduledTime);
  } else {
    scheduledTime = new Date(exam.scheduledTime);
  }

  // Validate scheduledTime
  if (isNaN(scheduledTime.getTime())) {
    return 'available';
  }

  // Handle expiresAt
  let expiresAt = null;
  if (exam.expiresAt !== null && exam.expiresAt !== undefined && exam.expiresAt !== '') {
    if (typeof exam.expiresAt === 'string') {
      expiresAt = new Date(exam.expiresAt);
    } else if (typeof exam.expiresAt === 'number') {
      expiresAt = new Date(exam.expiresAt);
    } else {
      expiresAt = new Date(exam.expiresAt);
    }
    if (isNaN(expiresAt.getTime())) {
      expiresAt = null;
    }
  }

  // Check if exam is already completed
  if (exam.isAttempted) return 'completed';

  // Check if exam is paused
  if (exam.isPaused) return 'paused';

  // Check if exam hasn't started yet
  if (now < scheduledTime) {
    return 'upcoming';
  }

  // Check if exam has expired
  if (expiresAt && !isNaN(expiresAt.getTime()) && now > expiresAt) {
    return 'expired';
  }

  // If exam has started and not expired, it's available
  if (now >= scheduledTime) {
    return 'available';
  }

  return 'available';
};

