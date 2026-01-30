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

