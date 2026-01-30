import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  AppState,
  SafeAreaView,
  StatusBar,
  Platform,
  PanResponder,
  BackHandler,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { examStorage } from '../utils/storage';

export default function ExamInterfaceScreen({ route, navigation }) {
  const { examId, attemptId, exam: initialExam, attempt: initialAttempt } = route.params;
  const { colors } = useTheme();
  const [exam, setExam] = useState(initialExam);
  const [attempt, setAttempt] = useState(initialAttempt);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null); // null means not initialized yet
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'pending', 'offline'
  const [isPaused, setIsPaused] = useState(false);
  const [displayLanguage, setDisplayLanguage] = useState('English');
  const [currentQuestionTimeSpent, setCurrentQuestionTimeSpent] = useState(0); // Time spent on current question (for display)
  const [totalTimeSpent, setTotalTimeSpent] = useState(0); // Total time spent across all questions
  const [sections, setSections] = useState([]); // Exam sections
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0); // Current section index
  const [sectionTimers, setSectionTimers] = useState({}); // Section timers { sectionIndex: remainingSeconds }
  const [lockedSections, setLockedSections] = useState(new Set()); // Sections where time expired
  const [completedSections, setCompletedSections] = useState(new Set()); // Sections user has left
  const [showSectionChangeDialog, setShowSectionChangeDialog] = useState(false); // Show section change confirmation
  const [pendingSectionIndex, setPendingSectionIndex] = useState(null); // Pending section to navigate to
  const sectionTimerIntervalsRef = useRef({}); // Store interval refs for each section
  const [showMenu, setShowMenu] = useState(false); // Show menu modal
  const [showPreviewDialog, setShowPreviewDialog] = useState(false); // Preview answers dialog
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false); // Gesture shortcuts info dialog
  const [appSwitchCount, setAppSwitchCount] = useState(0); // Track app switches
  const [showAppSwitchWarning, setShowAppSwitchWarning] = useState(false); // Show app switch warning
  const [showBackNavigationDialog, setShowBackNavigationDialog] = useState(false); // Show back navigation dialog
  const [showSectionExpiryDialog, setShowSectionExpiryDialog] = useState(false); // Show section expiry dialog
  const appSwitchTimeRef = useRef(0); // Track when app was switched
  const examRef = useRef(initialExam); // Ref to always have latest exam object
  const sectionExpiryShownRef = useRef(new Set()); // Track which sections have already shown expiry dialog
  const questionStartTimeRef = useRef({});
  const questionTimeSpentRef = useRef({});
  const timerIntervalRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const questionTimeIntervalRef = useRef(null); // Interval to update current question time display
  const prevQuestionIndexRef = useRef(-1); // Track previous question index
  const questionsRef = useRef([]); // Store questions in ref to persist even if state is cleared
  const answersRef = useRef([]); // Store answers in ref to persist even if state is cleared
  const currentQuestionIndexRef = useRef(0); // Ref for current question index
  const sectionsRef = useRef([]); // Ref for sections
  const lockedSectionsRef = useRef(new Set()); // Ref for locked sections
  const completedSectionsRef = useRef(new Set()); // Ref for completed sections
  const currentSectionIndexRef = useRef(0); // Ref for current section index

  const styles = createStyles(colors);

  // Handle back button press - show dialog to pause/submit/cancel
  useEffect(() => {
    // React Navigation listener
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default behavior of leaving the screen
      if (!submitting && !pausing) {
        e.preventDefault();
        // Pause timer when dialog is shown
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        // Also pause section timers
        Object.values(sectionTimerIntervalsRef.current).forEach(interval => {
          if (interval) clearInterval(interval);
        });
        setShowBackNavigationDialog(true);
      }
    });

    // Android hardware back button handler
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!submitting && !pausing && !showBackNavigationDialog) {
        // Pause timer when dialog is shown
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        // Also pause section timers
        Object.values(sectionTimerIntervalsRef.current).forEach(interval => {
          if (interval) clearInterval(interval);
        });
        setShowBackNavigationDialog(true);
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => {
      unsubscribe();
      backHandler.remove();
    };
  }, [navigation, submitting, pausing, showBackNavigationDialog]);

  // Resume timer when back navigation dialog is closed (if user cancels)
  useEffect(() => {
    if (!showBackNavigationDialog && timeRemaining !== null && timeRemaining > 0 && !isPaused && !submitting && !pausing) {
      // Resume timer if dialog was closed and exam is still active
      startTimer(timeRemaining);
    }
  }, [showBackNavigationDialog, timeRemaining, isPaused, submitting, pausing]);

  useEffect(() => {
    // Clear any old storage data for this attempt when starting fresh
    // This prevents loading expired time from previous sessions
    const clearOldData = async () => {
      // Only clear if this is a fresh start (no saved answers or time is 0/expired)
      const savedAnswers = await examStorage.getAnswers(attemptId);
      const savedTime = await examStorage.getTimeRemaining(attemptId);
      
      // If we have saved data but it's from a completed/expired attempt, clear it
      if (savedTime !== null && savedTime <= 0 && savedAnswers) {
        await examStorage.clearAttemptData(attemptId);
      }
    };
    
    clearOldData().then(() => {
      initializeExam();
    });
    
    // Monitor app state for background/foreground and track app switches
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground - check if it was a switch
        const timeSinceSwitch = Date.now() - appSwitchTimeRef.current;
        if (appSwitchTimeRef.current > 0 && timeSinceSwitch > 500) {
          // App was switched (not just a brief pause)
          // Get the current exam object (use ref to ensure we have the latest)
          const currentExam = examRef.current || exam || initialExam;
          // Check exam setting: allowTabSwitch defaults to false if not specified
          const allowAppSwitch = currentExam?.allowTabSwitch === true;
          
          console.log('App switch detected. allowTabSwitch setting:', currentExam?.allowTabSwitch, 'Allowed:', allowAppSwitch);
          
          if (!allowAppSwitch) {
            // App switching not allowed - auto-submit
            Alert.alert(
              '⚠️ App Switch Detected',
              'App switching is not allowed. Your exam will be auto-submitted.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    handleAutoSubmit();
                  },
                },
              ],
              { cancelable: false }
            );
          } else {
            // App switching allowed - track and warn
            setAppSwitchCount(prev => {
              const newCount = prev + 1;
              if (newCount >= 3) {
                // Auto-pause after 3 switches
                handlePause();
                Alert.alert(
                  '⚠️ Multiple App Switches',
                  'Your exam has been auto-paused due to multiple app switches. Please stay in the exam.',
                  [{ text: 'OK' }]
                );
              } else if (newCount >= 1) {
                // Show warning
                setShowAppSwitchWarning(true);
              }
              return newCount;
            });
          }
        }
        // Try to sync
        syncAnswersToBackend();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background - save answers and record time
        appSwitchTimeRef.current = Date.now();
        saveAnswers();
      }
    });
    
    // Auto-save every 30 seconds
    const autoSaveInterval = setInterval(() => {
      if (!isPaused && !submitting) {
        saveAnswers();
      }
    }, 30000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (questionTimeIntervalRef.current) {
        clearInterval(questionTimeIntervalRef.current);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      clearInterval(autoSaveInterval);
      subscription.remove();
    };
  }, []);

  const initializeExam = async () => {
    try {
      // Ensure we have exam data - fetch if not provided
      let currentExam = exam || examRef.current;
      if (!currentExam) {
        // Exam not provided, fetching from API
        try {
          const response = await api.get(`/exams/${examId}?includeQuestions=true`);
          currentExam = response.data.exam;
          setExam(currentExam);
          examRef.current = currentExam; // Update ref
        } catch (error) {
          console.error('Failed to fetch exam:', error);
          Alert.alert('Error', 'Failed to load exam data');
          navigation.goBack();
          return;
        }
      } else {
        // Update ref with current exam
        examRef.current = currentExam;
      }
      
      // Log exam settings for debugging
      console.log('Exam settings loaded:', {
        allowTabSwitch: currentExam?.allowTabSwitch,
        allowReattempts: currentExam?.allowReattempts,
        maxAttempts: currentExam?.maxAttempts,
      });

      // Check if exam has duration
      if (!currentExam.duration || currentExam.duration <= 0) {
        console.error('Exam duration is missing or invalid:', currentExam.duration, 'Exam:', currentExam);
        Alert.alert('Error', 'Exam duration is not set. Please contact support.');
        navigation.goBack();
        return;
      }

      // Use exam questions directly
      if (!exam.questions || exam.questions.length === 0) {
        throw new Error('No questions found in exam');
      }

      // Map questions from exam
      const questionsList = currentExam.questions
        .map((q) => (typeof q === 'string' ? null : q))
        .filter((q) => q !== null);

      // Initialize answers array - try to load from storage first
      let initializedAnswers = [];
      const savedAnswers = await examStorage.getAnswers(attemptId);
      const savedMarked = await examStorage.getMarked(attemptId);
      const savedTime = await examStorage.getTimeRemaining(attemptId);

      if (savedAnswers && savedAnswers.length > 0) {
        // Load from storage
        initializedAnswers = savedAnswers.map((ans, index) => {
          const question = questionsList[index];
          const questionId = question?._id || question;
          const timeSpent = ans.timeSpent || 0;
          // Restore time spent to ref
          if (questionId) {
            questionTimeSpentRef.current[questionId] = timeSpent;
          }
          return {
            question: question,
            selectedAnswer: ans.selectedAnswer || null,
            isCorrect: false,
            marksObtained: 0,
            timeSpent: timeSpent,
          };
        });
        setMarkedForReview(savedMarked);
        if (savedTime !== null) {
          setTimeRemaining(savedTime);
        }
      } else if (attempt?.answers && attempt.answers.length > 0) {
        // Load from attempt
        initializedAnswers = attempt.answers.map((ans, index) => {
          const question = ans.question?._id ? ans.question : questionsList[index];
          const questionId = question?._id || question;
          const timeSpent = ans.timeSpent || 0;
          // Restore time spent to ref
          if (questionId) {
            questionTimeSpentRef.current[questionId] = timeSpent;
          }
          return {
            question: question,
            selectedAnswer: ans.selectedAnswer || null,
            isCorrect: ans.isCorrect || false,
            marksObtained: ans.marksObtained || 0,
            timeSpent: timeSpent,
          };
        });
      } else {
        // Create new answers array
        initializedAnswers = questionsList.map((q) => ({
          question: q,
          selectedAnswer: null,
          isCorrect: false,
          marksObtained: 0,
          timeSpent: 0,
        }));
      }
      
      // Calculate initial total time spent
      const initialTotal = Object.values(questionTimeSpentRef.current).reduce(
        (sum, time) => sum + (time || 0),
        0
      );
      setTotalTimeSpent(initialTotal);

      setQuestions(questionsList);
      setAnswers(initializedAnswers);
      // Store in refs for persistence
      questionsRef.current = questionsList;
      answersRef.current = initializedAnswers;
      
      // Handle sections if they exist
      let sectionsWithQuestions = []; // Initialize as empty array
      if (currentExam.sections && Array.isArray(currentExam.sections) && currentExam.sections.length > 0) {
        // Organize questions by sections
        sectionsWithQuestions = currentExam.sections.map(section => ({
          ...section,
          questions: questionsList.filter(q => 
            section.questions && section.questions.some(sqId => {
              const qId = (q._id || q).toString();
              const sqIdStr = sqId.toString();
              return qId === sqIdStr || qId === sqIdStr;
            })
          )
        }));
        setSections(sectionsWithQuestions);
        sectionsRef.current = sectionsWithQuestions; // Update ref
        
        // Initialize section timers if section timing is enabled
        if (currentExam.enableSectionTiming) {
          const initialTimers = {};
          sectionsWithQuestions.forEach((section, index) => {
            if (section.timeLimit && section.timeLimit > 0) {
              initialTimers[index] = section.timeLimit * 60; // Convert minutes to seconds
            }
          });
          setSectionTimers(initialTimers);
        }
        
        // Set initial section based on first question
        if (sectionsWithQuestions.length > 0 && sectionsWithQuestions[0].questions.length > 0) {
          const firstQuestionInSection = questionsList.findIndex(q => 
            sectionsWithQuestions[0].questions.some(sq => {
              const qId = (q._id || q).toString();
              const sqId = (sq._id || sq).toString();
              return qId === sqId;
            })
          );
          if (firstQuestionInSection >= 0) {
            setCurrentQuestionIndex(firstQuestionInSection);
            setCurrentSectionIndex(0);
            currentSectionIndexRef.current = 0; // Update ref
          }
        }
      }
      
      // Determine display language
      if (currentExam.language === 'Both') {
        setDisplayLanguage('English'); // Default to English, user can switch
      } else {
        setDisplayLanguage(currentExam.language || 'English');
      }

      // Initialize timer - use saved time if available, otherwise calculate
      // BUT: Don't use total timer if section timing is enabled
      let initialTime = null;
      
      // Check if section timing is enabled - if so, don't use total timer
      const hasSectionTimers = currentExam.enableSectionTiming && sectionsWithQuestions.length > 0 && sectionsWithQuestions.some(s => s.timeLimit && s.timeLimit > 0);
      
      // Check if exam has duration (only needed if section timing is disabled)
      if (!hasSectionTimers && (!currentExam.duration || currentExam.duration <= 0)) {
        console.error('Exam duration is missing or invalid:', currentExam.duration);
        Alert.alert('Error', 'Exam duration is not set. Please contact support.');
        navigation.goBack();
        return;
      }

      const totalDurationSeconds = currentExam.duration * 60;

      // Check if this is a fresh start (no answers, not paused, and attempt is recent or has no startTime)
      const hasAnswers = attempt?.answers && attempt.answers.length > 0;
      const isPaused = attempt?.isPaused || false;
      const hasStartTime = attempt?.startTime;
      
      // Check if attempt was just created (within last 10 seconds) - treat as fresh start
      let isVeryRecentStart = false;
      if (hasStartTime && !hasAnswers && !isPaused) {
        const now = new Date();
        const startTime = new Date(attempt.startTime);
        const secondsSinceStart = Math.floor((now - startTime) / 1000);
        if (secondsSinceStart < 10) {
          isVeryRecentStart = true;
          // Very recent start detected
        }
      }
      
      if (savedTime !== null && savedTime > 0 && !isVeryRecentStart) {
        // Use saved time from storage (most reliable for paused exams)
        initialTime = savedTime;
        // Using saved time from storage
      } else if (hasStartTime && (hasAnswers || isPaused) && !isVeryRecentStart) {
        // This is a resume - calculate remaining time from attempt
        const now = new Date();
        const startTime = new Date(attempt.startTime);
        const totalElapsed = Math.floor((now - startTime) / 1000);
        
        if (isPaused && attempt.pausedAt) {
          // If paused, calculate time from when it was paused
          const pausedAt = new Date(attempt.pausedAt);
          const activeTime = Math.floor((pausedAt - startTime) / 1000);
          const pausedTime = attempt.pausedDuration || 0;
          const effectiveElapsed = activeTime - pausedTime;
          const remaining = totalDurationSeconds - effectiveElapsed;
          initialTime = Math.max(0, remaining);
          // Resuming paused exam
        } else {
          // Not paused - calculate normally
          const pausedTime = attempt.pausedDuration || 0;
          const effectiveElapsed = totalElapsed - pausedTime;
          
          // If elapsed is negative (startTime is in the future), treat as fresh start
          if (effectiveElapsed < 0) {
            console.warn('Negative elapsed time detected (startTime in future), treating as fresh start');
            initialTime = totalDurationSeconds;
          } else {
            const remaining = totalDurationSeconds - effectiveElapsed;
            initialTime = Math.max(0, remaining);
            // Calculated time from attempt
            
            // If calculated time is 0 or negative and elapsed is way more than duration,
            // this might be an old attempt - treat as fresh start
            if (initialTime <= 0 && totalElapsed > totalDurationSeconds * 2) {
              console.warn('Old attempt detected (elapsed >> duration), treating as fresh start');
              initialTime = totalDurationSeconds;
            }
          }
        }
      } else {
        // Fresh start - no answers, not paused, or no startTime, or very recent start
        // For fresh starts, always use full duration (don't subtract any elapsed time)
        initialTime = totalDurationSeconds;
        // Fresh exam start
      }

      // Set time and start timer (only if section timing is NOT enabled)
      if (!hasSectionTimers) {
        if (initialTime !== null) {
          // Set state first
          setTimeRemaining(initialTime);
          
          if (initialTime > 0) {
            // Start timer immediately with the exact initial time value
            // Use a small timeout to ensure state is set, but start timer with exact value
            setTimeout(() => {
              startTimer(initialTime);
            }, 50);
          } else {
            // Time has expired - allow submission but don't start timer
            console.warn('Exam time has expired. Allowing submission of current answers.');
            Alert.alert(
              'Time Expired',
              'The exam time has expired. You can still submit your current answers.',
              [
                {
                  text: 'Submit Now',
                  onPress: () => {
                    handleAutoSubmit();
                  },
                },
                {
                  text: 'Continue',
                  style: 'cancel',
                },
              ]
            );
          }
        } else {
          // Fallback - shouldn't happen but handle gracefully
          console.error('Could not determine initial time');
          setTimeRemaining(totalDurationSeconds);
          setTimeout(() => {
            startTimer(totalDurationSeconds);
          }, 100);
        }
      } else {
        // Section timing enabled - set timeRemaining to null to indicate no total timer
        setTimeRemaining(null);
      }

      // Try to sync with backend if there's pending sync
      if (await examStorage.isPendingSync(attemptId)) {
        syncAnswersToBackend();
      }
    } catch (error) {
      console.error('Failed to initialize exam:', error);
      Alert.alert('Error', 'Failed to load exam questions');
      navigation.goBack();
    }
  };

  const startTimer = (initialTimeValue = null) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Use provided initial time or current state
    const timeToUse = initialTimeValue !== null ? initialTimeValue : timeRemaining;
    
    // Don't start timer if time is not set or invalid
    if (timeToUse === null || timeToUse === undefined || timeToUse <= 0) {
      // Cannot start timer - invalid time
      return;
    }

    console.log('[TIMER] Starting with:', timeToUse, 'seconds');
    
    // Set the initial time in state first
    setTimeRemaining(timeToUse);

    // Start timer with a small delay to ensure state is set
    // Use a timestamp-based approach to avoid drift
    const startTimestamp = Date.now();
    const startSeconds = timeToUse;

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      const newTime = Math.max(0, startSeconds - elapsed);
      
      setTimeRemaining(newTime);
      
      // Save time to storage every 5 seconds
      if (newTime > 0 && newTime % 5 === 0 && attemptId) {
        examStorage.saveTimeRemaining(attemptId, newTime).catch((err) => {
          console.error('Failed to save time remaining:', err);
        });
      }
      
      if (newTime <= 0) {
        clearInterval(timerIntervalRef.current);
        handleAutoSubmit();
      }
    }, 1000);
  };

  useEffect(() => {
    // Track time spent on current question
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    const questionId = currentQuestion._id || currentQuestion;
    const questionIdStr = questionId?.toString() || questionId;
    
    // Save time spent on previous question before switching
    if (prevQuestionIndexRef.current !== currentQuestionIndex && prevQuestionIndexRef.current >= 0) {
      const prevQuestion = questions[prevQuestionIndexRef.current];
      if (prevQuestion) {
        const prevQuestionId = prevQuestion._id || prevQuestion;
        const prevQuestionIdStr = prevQuestionId?.toString() || prevQuestionId;
        if (questionStartTimeRef.current[prevQuestionIdStr]) {
          const elapsed = Math.floor(
            (Date.now() - questionStartTimeRef.current[prevQuestionIdStr]) / 1000
          );
          const previousTime = questionTimeSpentRef.current[prevQuestionIdStr] || 0;
          questionTimeSpentRef.current[prevQuestionIdStr] = previousTime + elapsed;
          // Clear start time so we track fresh on next visit
          delete questionStartTimeRef.current[prevQuestionIdStr];
          console.log(`[TIME] Q${prevQuestionIndexRef.current + 1}: +${elapsed}s, total: ${questionTimeSpentRef.current[prevQuestionIdStr]}s`);
        }
      }
    }
    prevQuestionIndexRef.current = currentQuestionIndex;
    
    // Always set a fresh start time for tracking
    questionStartTimeRef.current[questionIdStr] = Date.now();
    
    // Initialize display time for current question
    const existingTime = questionTimeSpentRef.current[questionIdStr] || 0;
    setCurrentQuestionTimeSpent(existingTime);
    console.log(`[TIME] Entering Q${currentQuestionIndex + 1}, accumulated: ${existingTime}s`);
    
    // Clear any existing interval
    if (questionTimeIntervalRef.current) {
      clearInterval(questionTimeIntervalRef.current);
    }
    
    // Update display every second
    questionTimeIntervalRef.current = setInterval(() => {
      if (questionStartTimeRef.current[questionIdStr]) {
        const elapsed = Math.floor(
          (Date.now() - questionStartTimeRef.current[questionIdStr]) / 1000
        );
        const previousTime = questionTimeSpentRef.current[questionIdStr] || 0;
        const totalTime = previousTime + elapsed;
        setCurrentQuestionTimeSpent(totalTime);
        
        // Calculate and update total time spent (all previous + current elapsed)
        const allOtherTimes = Object.entries(questionTimeSpentRef.current)
          .filter(([id]) => id !== questionIdStr)
          .reduce((sum, [, time]) => sum + (time || 0), 0);
        setTotalTimeSpent(allOtherTimes + totalTime);
      }
    }, 1000);
    
    // Calculate initial total time spent
    const initialTotal = Object.values(questionTimeSpentRef.current).reduce(
      (sum, time) => sum + (time || 0),
      0
    );
    setTotalTimeSpent(initialTotal);

    return () => {
      // Clear interval
      if (questionTimeIntervalRef.current) {
        clearInterval(questionTimeIntervalRef.current);
      }
      
      // Save time when leaving question (component unmount or question change)
      if (questionStartTimeRef.current[questionIdStr]) {
        const elapsed = Math.floor(
          (Date.now() - questionStartTimeRef.current[questionIdStr]) / 1000
        );
        const previousTime = questionTimeSpentRef.current[questionIdStr] || 0;
        questionTimeSpentRef.current[questionIdStr] = previousTime + elapsed;
        // Clear start time
        delete questionStartTimeRef.current[questionIdStr];
        console.log(`[TIME] Leaving Q${currentQuestionIndex + 1}: +${elapsed}s, total: ${questionTimeSpentRef.current[questionIdStr]}s`);
      }
    };
  }, [currentQuestionIndex, questions]);

  // Section timers - run independently for each section
  // Only run timer for the current section if enableSectionTiming is true
  useEffect(() => {
    // Check if section timing is enabled
    const currentExam = examRef.current || exam;
    if (!currentExam?.enableSectionTiming) {
      // Section timing disabled - clear all timers
      Object.values(sectionTimerIntervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      sectionTimerIntervalsRef.current = {};
      return;
    }

    if (sections.length === 0 || isPaused || currentSectionIndex === null || showBackNavigationDialog || showSectionExpiryDialog) {
      // Clear all section timers if paused, no sections, or dialog is shown
      Object.values(sectionTimerIntervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      sectionTimerIntervalsRef.current = {};
      return;
    }

    const currentSection = sections[currentSectionIndex];
    if (!currentSection || !currentSection.timeLimit || currentSection.timeLimit <= 0) {
      // No time limit for current section - clear any existing timer
      if (sectionTimerIntervalsRef.current[currentSectionIndex]) {
        clearInterval(sectionTimerIntervalsRef.current[currentSectionIndex]);
        delete sectionTimerIntervalsRef.current[currentSectionIndex];
      }
      return;
    }

    // Clear existing timer for current section
    if (sectionTimerIntervalsRef.current[currentSectionIndex]) {
      clearInterval(sectionTimerIntervalsRef.current[currentSectionIndex]);
    }

    // Initialize timer if not already set
    if (sectionTimers[currentSectionIndex] === undefined) {
      setSectionTimers((prev) => ({
        ...prev,
        [currentSectionIndex]: currentSection.timeLimit * 60
      }));
    }

    // Start timer for current section only
    sectionTimerIntervalsRef.current[currentSectionIndex] = setInterval(() => {
      setSectionTimers((prev) => {
        const currentTime = prev[currentSectionIndex] || (currentSection.timeLimit * 60);
        
        if (currentTime <= 1) {
          // Time's up for this section
          // Check if we've already shown the dialog for this section
          if (!sectionExpiryShownRef.current.has(currentSectionIndex)) {
            // Mark that we've shown the dialog for this section
            sectionExpiryShownRef.current.add(currentSectionIndex);
            
            // Clear the timer immediately to stop counting
            if (sectionTimerIntervalsRef.current[currentSectionIndex]) {
              clearInterval(sectionTimerIntervalsRef.current[currentSectionIndex]);
              delete sectionTimerIntervalsRef.current[currentSectionIndex];
            }
            
            setLockedSections((prevLocked) => {
              const newLocked = new Set(prevLocked);
              newLocked.add(currentSectionIndex);
              lockedSectionsRef.current = newLocked; // Update ref
              return newLocked;
            });
            
            // Show dialog and pause timer
            setShowSectionExpiryDialog(true);
            
            // Auto-advance to next section
            const nextSectionIndex = currentSectionIndex + 1;
            if (nextSectionIndex < sections.length) {
              // Move to next section
              const nextSection = sections[nextSectionIndex];
              if (nextSection && nextSection.questions.length > 0) {
                const firstQInNextSection = questions.findIndex(q => 
                  nextSection.questions.some(sq => {
                    const qId = (q._id || q).toString();
                    const sqId = (sq._id || sq).toString();
                    return qId === sqId;
                  })
                );
                if (firstQInNextSection >= 0) {
                  Alert.alert(
                    'Section Time Expired',
                    `Time for ${currentSection.name} has expired. Moving to next section.`,
                    [{ 
                      text: 'OK',
                      onPress: () => {
                        // Mark current section as completed
                        setCompletedSections((prev) => {
                          const newSet = new Set(prev);
                          newSet.add(currentSectionIndex);
                          completedSectionsRef.current = newSet; // Update ref
                          return newSet;
                        });
                        setCurrentQuestionIndex(firstQInNextSection);
                        setCurrentSectionIndex(nextSectionIndex);
                        currentSectionIndexRef.current = nextSectionIndex; // Update ref
                        // Clear the dialog state to resume timers
                        setShowSectionExpiryDialog(false);
                      }
                    }]
                  );
                } else {
                  // No questions in next section - just close dialog
                  setShowSectionExpiryDialog(false);
                }
              } else {
                // No next section - just close dialog
                setShowSectionExpiryDialog(false);
              }
            } else {
              // Last section expired - auto submit
              Alert.alert(
                'Exam Time Expired',
                'All section times have expired. Submitting exam.',
                [{ 
                  text: 'OK', 
                  onPress: () => {
                    setShowSectionExpiryDialog(false);
                    handleAutoSubmit();
                  }
                }]
              );
            }
          }
          
          return { ...prev, [currentSectionIndex]: 0 };
        }
        
        return { ...prev, [currentSectionIndex]: currentTime - 1 };
      });
    }, 1000);

    // Cleanup function
    return () => {
      if (sectionTimerIntervalsRef.current[currentSectionIndex]) {
        clearInterval(sectionTimerIntervalsRef.current[currentSectionIndex]);
        delete sectionTimerIntervalsRef.current[currentSectionIndex];
      }
    };
  }, [sections, isPaused, currentSectionIndex, questions, sectionTimers, showBackNavigationDialog, showSectionExpiryDialog]);

  // Update current section index when question changes
  useEffect(() => {
    if (sections.length === 0 || questions.length === 0) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    const questionId = (currentQuestion._id || currentQuestion).toString();
    const sectionIndex = sections.findIndex(section => 
      section.questions.some(sq => {
        const sqId = (sq._id || sq).toString();
        return sqId === questionId;
      })
    );
    
    if (sectionIndex >= 0 && sectionIndex !== currentSectionIndex) {
      setCurrentSectionIndex(sectionIndex);
      currentSectionIndexRef.current = sectionIndex; // Update ref
    }
  }, [currentQuestionIndex, questions, sections, currentSectionIndex]);

  // Helper function to check if a question is in a locked/completed section
  // Uses refs to ensure we always have the latest values (important for PanResponder)
  const isQuestionAccessible = (questionIndex) => {
    // Use refs for latest values (important for closures like PanResponder)
    const currentSections = sectionsRef.current.length > 0 ? sectionsRef.current : sections;
    if (currentSections.length === 0) return { accessible: true };
    
    const currentQuestions = questionsRef.current.length > 0 ? questionsRef.current : questions;
    const question = currentQuestions[questionIndex];
    if (!question) return { accessible: false, reason: 'Question not found' };
    
    const questionId = (question._id || question).toString();
    const sectionIndex = currentSections.findIndex(section => 
      section.questions.some(sq => {
        const sqId = (sq._id || sq).toString();
        return sqId === questionId;
      })
    );
    
    if (sectionIndex < 0) return { accessible: true }; // Question not in any section
    
    const currentExam = examRef.current || exam;
    const currentLockedSections = lockedSectionsRef.current.size > 0 ? lockedSectionsRef.current : lockedSections;
    const currentCompletedSections = completedSectionsRef.current.size > 0 ? completedSectionsRef.current : completedSections;
    const currentSectionIdx = currentSectionIndexRef.current !== undefined ? currentSectionIndexRef.current : currentSectionIndex;
    
    const isLocked = currentExam?.enableSectionTiming && currentLockedSections.has(sectionIndex);
    const isCompleted = currentExam?.enableSectionLocking && currentCompletedSections.has(sectionIndex) && sectionIndex !== currentSectionIdx;
    
    if (isLocked) {
      return { accessible: false, reason: 'Section time expired', sectionIndex };
    }
    
    if (isCompleted) {
      return { accessible: false, reason: 'Section completed', sectionIndex };
    }
    
    return { accessible: true, sectionIndex };
  };

  // Helper function to handle section change with validation
  const handleSectionChange = (targetQuestionIndex, targetSectionIndex) => {
    const currentExam = examRef.current || exam;
    
    // Check if target section is accessible
    const accessCheck = isQuestionAccessible(targetQuestionIndex);
    if (!accessCheck.accessible) {
      if (accessCheck.reason === 'Section time expired') {
        Alert.alert(
          'Section Locked',
          'You cannot access questions in this section as time has expired.',
          [{ text: 'OK' }]
        );
      } else if (accessCheck.reason === 'Section completed') {
        Alert.alert(
          'Cannot Return',
          'You cannot return to questions in a completed section.',
          [{ text: 'OK' }]
        );
      }
      return false;
    }
    
    // If trying to move to a different section and section locking is enabled, show confirmation
    if (currentExam?.enableSectionLocking && targetSectionIndex !== currentSectionIndex && currentSectionIndex !== null) {
      const currentSection = sections[currentSectionIndex];
      const currentSectionQuestions = currentSection?.questions || [];
      const attempted = currentSectionQuestions.filter(sq => {
        const qId = (sq._id || sq).toString();
        return answers.some(ans => {
          const ansQId = (ans.question?._id || ans.question).toString();
          return ansQId === qId && ans.selectedAnswer !== null;
        });
      }).length;
      const unattempted = currentSectionQuestions.length - attempted;
      
      setPendingSectionIndex(targetSectionIndex);
      setShowSectionChangeDialog(true);
      return false; // Wait for user confirmation
    }
    
    // Mark current section as completed if leaving
    if (currentExam?.enableSectionLocking && targetSectionIndex !== currentSectionIndex && currentSectionIndex !== null) {
      setCompletedSections((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentSectionIndex);
        return newSet;
      });
    }
    
    return true;
  };

  const handleAnswerSelect = async (optionLabel) => {
    // Get current answers from ref (most reliable source)
    const currentAnswers = answersRef.current.length > 0 ? answersRef.current : answers;
    const newAnswers = [...currentAnswers];
    newAnswers[currentQuestionIndex] = {
      ...newAnswers[currentQuestionIndex],
      selectedAnswer: optionLabel,
    };
    
    // Update ref FIRST (before async state update)
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
    
    // Save to storage IMMEDIATELY with the new answer (don't wait for state)
    try {
      const questionsToUse = questionsRef.current.length > 0 ? questionsRef.current : questions;
      const answersToSave = newAnswers.map((ans, index) => {
        const question = questionsToUse[index];
        const questionId = question?._id || question;
        const questionIdStr = questionId?.toString() || questionId;
        return {
          question: questionIdStr,
          selectedAnswer: ans?.selectedAnswer || null,
          timeSpent: ans?.timeSpent || questionTimeSpentRef.current[questionIdStr] || 0,
        };
      });
      // Saved answer immediately
      await examStorage.saveAnswers(attemptId, answersToSave);
    } catch (error) {
      console.error('Failed to save answer immediately:', error);
    }
    
    // Also trigger debounced backend sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncAnswersToBackend();
    }, 2000);
  };

  // Save answers to local storage immediately
  const saveAnswersToStorage = async () => {
    try {
      // Use refs if state has no actual answers (for persistence)
      const questionsToUse = questions.length > 0 ? questions : questionsRef.current;
      
      // Check if state has actual selections - if not, prefer ref
      const stateHasSelections = answers.length > 0 && answers.some(a => a?.selectedAnswer !== null && a?.selectedAnswer !== undefined);
      const refHasSelections = answersRef.current.length > 0 && answersRef.current.some(a => a?.selectedAnswer !== null && a?.selectedAnswer !== undefined);
      
      // Prefer whichever has actual selections, or fallback to ref
      const answersToUse = stateHasSelections ? answers : (refHasSelections ? answersRef.current : answers);
      
      // saveAnswersToStorage - checking state/ref selections
      
      if (questionsToUse.length === 0) {
        console.error('No questions available to save answers');
        return null;
      }
      
      // Load existing answers from storage FIRST to merge (don't overwrite good data)
      const existingAnswers = await examStorage.getAnswers(attemptId);
      
      // Update time spent for current question before saving
      const currentQuestion = questionsToUse[currentQuestionIndex];
      if (currentQuestion) {
        const questionId = currentQuestion._id || currentQuestion;
        const questionIdStr = questionId?.toString() || questionId;
        if (questionStartTimeRef.current[questionIdStr]) {
          const elapsed = Math.floor(
            (Date.now() - questionStartTimeRef.current[questionIdStr]) / 1000
          );
          const previousTime = questionTimeSpentRef.current[questionIdStr] || 0;
          questionTimeSpentRef.current[questionIdStr] = previousTime + elapsed;
          questionStartTimeRef.current[questionIdStr] = Date.now(); // Reset start time
          console.log(`[TIME] Storage save - Q${currentQuestionIndex + 1}: +${elapsed}s, total: ${questionTimeSpentRef.current[questionIdStr]}s`);
        }
      }
      
      // Use questions array to ensure we have entries for all questions
      // Merge with existing storage data to preserve answers when state is empty
      const currentAnswers = questionsToUse.map((question, index) => {
        const answer = answersToUse[index];
        const existingAnswer = existingAnswers?.[index];
        const questionId = question?._id || question;
        const questionIdStr = questionId?.toString() || questionId;
        
        // Use timeSpent from answer if available, otherwise from ref, then existing
        const timeSpent = answer?.timeSpent || questionTimeSpentRef.current[questionIdStr] || existingAnswer?.timeSpent || 0;
        
        // Prefer current answer if it has a value, fall back to existing stored answer (don't overwrite with null)
        const selectedAnswer = (answer?.selectedAnswer !== null && answer?.selectedAnswer !== undefined)
          ? answer.selectedAnswer
          : (existingAnswer?.selectedAnswer || null);
        
        return {
          question: questionIdStr,
          selectedAnswer: selectedAnswer,
          timeSpent: timeSpent,
        };
      });
      
      const selectionsCount = currentAnswers.filter(a => a.selectedAnswer !== null).length;
      const existingSelectionsCount = existingAnswers?.filter(a => a?.selectedAnswer !== null).length || 0;
      // Saving answers to storage
      
      // Only save if we have actual answers or if this is the first save
      if (selectionsCount > 0 || !existingAnswers || existingAnswers.length === 0) {
        // Save to AsyncStorage (non-blocking)
        await Promise.all([
          examStorage.saveAnswers(attemptId, currentAnswers),
          examStorage.saveMarked(attemptId, markedForReview),
          timeRemaining !== null && timeRemaining !== undefined
            ? examStorage.saveTimeRemaining(attemptId, timeRemaining)
            : Promise.resolve(),
        ]);
      } else {
        // Skipping save - no new answers
      }

      return currentAnswers;
    } catch (error) {
      console.error('Failed to save answers to storage:', error);
      return null;
    }
  };

  // Sync answers to backend (with retry logic)
  const syncAnswersToBackend = async (retryCount = 0) => {
    try {
      const currentAnswers = await saveAnswersToStorage();
      if (!currentAnswers) return;

      setSyncStatus('syncing');
      setIsOnline(true);

      // Use correct endpoint from frontend
      await api.put(`/exams/attempt/${attemptId}`, {
        answers: currentAnswers,
      });

      // Success - clear pending sync flag
      await examStorage.clearPendingSync(attemptId);
      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to sync answers to backend:', error);
      setIsOnline(false);
      setSyncStatus('pending');
      
      // Mark as pending sync
      await examStorage.markPendingSync(attemptId);

      // Retry after 5 seconds if not too many retries
      if (retryCount < 3) {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(() => {
          syncAnswersToBackend(retryCount + 1);
        }, 5000);
      }
    }
  };

  // Debounced save function
  const saveAnswers = () => {
    // DON'T overwrite ref with stale state - ref should already be up to date
    // Only update ref if state has more answers (for cases where state is updated directly)
    if (answers.length > 0 && answers.some(a => a?.selectedAnswer !== null)) {
      answersRef.current = answers;
    }
    
    // Always save to storage immediately (non-blocking)
    saveAnswersToStorage().catch(console.error);

    // Try to sync to backend (debounced)
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncAnswersToBackend();
    }, 2000); // Wait 2 seconds before syncing
  };

  const handleMarkForReview = () => {
    const questionId = questions[currentQuestionIndex]?._id || questions[currentQuestionIndex];
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      // Save to storage immediately (non-blocking)
      examStorage.saveMarked(attemptId, newSet).catch(console.error);
      return newSet;
    });
  };

  const handleClearResponse = async () => {
    // Clear the current question's answer
    const currentAnswers = answersRef.current.length > 0 ? answersRef.current : answers;
    const newAnswers = [...currentAnswers];
    newAnswers[currentQuestionIndex] = {
      ...newAnswers[currentQuestionIndex],
      selectedAnswer: null,
    };
    
    // Update ref FIRST (before async state update)
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
    
    // Save to storage IMMEDIATELY
    try {
      const questionsToUse = questionsRef.current.length > 0 ? questionsRef.current : questions;
      const answersToSave = newAnswers.map((ans, index) => {
        const question = questionsToUse[index];
        const questionId = question?._id || question;
        const questionIdStr = questionId?.toString() || questionId;
        return {
          question: questionIdStr,
          selectedAnswer: ans?.selectedAnswer || null,
          timeSpent: ans?.timeSpent || questionTimeSpentRef.current[questionIdStr] || 0,
        };
      });
      // Cleared response
      await examStorage.saveAnswers(attemptId, answersToSave);
    } catch (error) {
      console.error('Failed to clear response:', error);
    }
  };

  // Update ref when currentQuestionIndex changes
  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Don't capture at start - let ScrollView handle it first
        return false;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture if it's clearly a horizontal swipe (for navigation)
        // or a downward swipe from near the top (for menu)
        const { dx, dy, moveX, moveY } = gestureState;
        const startY = evt.nativeEvent.pageY - dy;
        
        // Prioritize horizontal swipes for navigation
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          return true;
        }
        
        // For vertical swipe down, only capture if starting from top 20% of screen
        // This prevents interfering with normal scrolling
        if (dy > 30 && Math.abs(dy) > Math.abs(dx) * 1.5 && startY < 200) {
          return true;
        }
        
        return false;
      },
      onPanResponderGrant: () => {
        // Gesture captured
      },
      onPanResponderMove: (evt, gestureState) => {
        // Gesture in progress
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        const swipeThreshold = 50; // Minimum distance for a swipe
        const velocityThreshold = 0.3; // Minimum velocity for a swipe

        // Check if it's a horizontal swipe (left/right)
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
          // Swipe right (previous question)
          if (dx > swipeThreshold || gestureState.vx > velocityThreshold) {
            const currentIdx = currentQuestionIndexRef.current;
            if (currentIdx > 0) {
              const prevIndex = currentIdx - 1;
              const questionsToUse = questionsRef.current.length > 0 ? questionsRef.current : questions;
              const prevQuestion = questionsToUse[prevIndex];
              
              // ALWAYS check section access for swipe navigation - use refs for latest values
              const accessCheck = isQuestionAccessible(prevIndex);
              if (!accessCheck.accessible) {
                // Show alert and prevent navigation
                if (accessCheck.reason === 'Section time expired') {
                  Alert.alert(
                    'Section Locked',
                    'You cannot access questions in this section as time has expired.',
                    [{ text: 'OK' }]
                  );
                } else if (accessCheck.reason === 'Section completed') {
                  Alert.alert(
                    'Cannot Return',
                    'You cannot return to questions in a completed section.',
                    [{ text: 'OK' }]
                  );
                }
                return;
              }
              
              // Check if section change confirmation is needed - use refs for latest values
              const currentSections = sectionsRef.current.length > 0 ? sectionsRef.current : sections;
              const currentExam = examRef.current || exam;
              
              // Calculate current question's section index (don't rely on state which might be stale)
              const currentQuestion = questionsToUse[currentIdx];
              let currentQuestionSectionIndex = null;
              if (currentQuestion && currentSections.length > 0) {
                const currentQId = (currentQuestion._id || currentQuestion).toString();
                currentQuestionSectionIndex = currentSections.findIndex(section => 
                  section.questions.some(sq => {
                    const sqId = (sq._id || sq).toString();
                    return sqId === currentQId;
                  })
                );
              }
              
              if (prevQuestion && currentSections.length > 0) {
                const prevQId = (prevQuestion._id || prevQuestion).toString();
                const prevSectionIndex = currentSections.findIndex(section => 
                  section.questions.some(sq => {
                    const sqId = (sq._id || sq).toString();
                    return sqId === prevQId;
                  })
                );
                
                // If section locking is enabled and we're trying to move to a different section, require confirmation
                if (currentExam?.enableSectionLocking && prevSectionIndex >= 0 && currentQuestionSectionIndex !== null && prevSectionIndex !== currentQuestionSectionIndex) {
                  // Show confirmation dialog for section change
                  setPendingSectionIndex(prevSectionIndex);
                  setShowSectionChangeDialog(true);
                  return; // Wait for user confirmation - DO NOT navigate
                }
              }
              
              saveAnswers();
              setCurrentQuestionIndex(prevIndex);
            }
          }
          // Swipe left (next question)
          else if (dx < -swipeThreshold || gestureState.vx < -velocityThreshold) {
            const currentIdx = currentQuestionIndexRef.current;
            const questionsCount = questionsRef.current.length || questions.length;
            if (currentIdx < questionsCount - 1) {
              const nextIndex = currentIdx + 1;
              const questionsToUse = questionsRef.current.length > 0 ? questionsRef.current : questions;
              const nextQuestion = questionsToUse[nextIndex];
              
              // ALWAYS check section access for swipe navigation - use refs for latest values
              const accessCheck = isQuestionAccessible(nextIndex);
              if (!accessCheck.accessible) {
                // Show alert and prevent navigation
                if (accessCheck.reason === 'Section time expired') {
                  Alert.alert(
                    'Section Locked',
                    'You cannot access questions in this section as time has expired.',
                    [{ text: 'OK' }]
                  );
                } else if (accessCheck.reason === 'Section completed') {
                  Alert.alert(
                    'Cannot Return',
                    'You cannot return to questions in a completed section.',
                    [{ text: 'OK' }]
                  );
                }
                return;
              }
              
              // Check if section change confirmation is needed - use refs for latest values
              const currentSections = sectionsRef.current.length > 0 ? sectionsRef.current : sections;
              const currentExam = examRef.current || exam;
              
              // Calculate current question's section index (don't rely on state which might be stale)
              const currentQuestion = questionsToUse[currentIdx];
              let currentQuestionSectionIndex = null;
              if (currentQuestion && currentSections.length > 0) {
                const currentQId = (currentQuestion._id || currentQuestion).toString();
                currentQuestionSectionIndex = currentSections.findIndex(section => 
                  section.questions.some(sq => {
                    const sqId = (sq._id || sq).toString();
                    return sqId === currentQId;
                  })
                );
              }
              
              if (nextQuestion && currentSections.length > 0) {
                const nextQId = (nextQuestion._id || nextQuestion).toString();
                const nextSectionIndex = currentSections.findIndex(section => 
                  section.questions.some(sq => {
                    const sqId = (sq._id || sq).toString();
                    return sqId === nextQId;
                  })
                );
                
                // If section locking is enabled and we're trying to move to a different section, require confirmation
                if (currentExam?.enableSectionLocking && nextSectionIndex >= 0 && currentQuestionSectionIndex !== null && nextSectionIndex !== currentQuestionSectionIndex) {
                  // Show confirmation dialog for section change
                  setPendingSectionIndex(nextSectionIndex);
                  setShowSectionChangeDialog(true);
                  return; // Wait for user confirmation - DO NOT navigate
                }
              }
              
              saveAnswers();
              setCurrentQuestionIndex(nextIndex);
            }
          }
        }
        // Check if it's a vertical swipe down (open menu) - only from top area
        else if (Math.abs(dy) > Math.abs(dx) && dy > swipeThreshold && gestureState.vy > velocityThreshold) {
          // Swipe down - open menu
          setShowMenu(true);
        }
      },
      onPanResponderTerminationRequest: () => {
        // Allow ScrollView to take over if needed
        return false;
      },
    })
  ).current;

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      saveAnswers();
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      saveAnswers();
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleQuestionSelect = (index) => {
    saveAnswers();
    setCurrentQuestionIndex(index);
    setShowQuestionPalette(false);
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || seconds < 0) {
      return '--:--';
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    setShowSubmitDialog(true);
  };

  const handlePause = () => {
    setShowPauseDialog(true);
  };

  const confirmPause = async () => {
    setPausing(true);
    try {
      // Save answers before pausing
      await saveAnswersToStorage();
      await syncAnswersToBackend();
      
      // Pause the exam
      const response = await api.post(`/exams/attempt/${attemptId}/pause`, {
        answers: answers.map((ans) => {
          const questionId = ans.question?._id || ans.question;
          const questionIdStr = questionId?.toString() || questionId;
          const timeSpent = questionTimeSpentRef.current[questionIdStr] || ans.timeSpent || 0;
          return {
            question: questionIdStr,
            selectedAnswer: ans.selectedAnswer || null,
            timeSpent: typeof timeSpent === 'number' ? timeSpent : (parseFloat(timeSpent) || 0),
            isMarkedForReview: markedForReview.has(questionIdStr),
          };
        }),
      });
      
      setIsPaused(true);
      setShowPauseDialog(false);
      
      // Stop timers
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      Alert.alert(
        'Exam Paused',
        'Your exam has been paused. You can continue later from the exam details page.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to pause exam:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to pause exam');
      setPausing(false);
    }
  };

  const confirmSubmit = async () => {
    setShowSubmitDialog(false);
    await submitExam();
  };

  const handleAutoSubmit = async () => {
    // Prevent multiple auto-submits
    if (submitting) {
      return;
    }
    
    console.log('[TIME] Auto-submit triggered, collecting time data...');
    
    // Get current answers from ref (most reliable)
    const currentAnswers = answersRef.current.length > 0 ? answersRef.current : answers;
    const questionsToUse = questionsRef.current.length > 0 ? questionsRef.current : questions;
    
    // Update time spent for current question
    const currentQuestion = questionsToUse[currentQuestionIndex];
    if (currentQuestion) {
      const questionId = currentQuestion._id || currentQuestion;
      const questionIdStr = questionId?.toString() || questionId;
      if (questionStartTimeRef.current[questionIdStr]) {
        const elapsed = Math.floor(
          (Date.now() - questionStartTimeRef.current[questionIdStr]) / 1000
        );
        const previousTime = questionTimeSpentRef.current[questionIdStr] || 0;
        questionTimeSpentRef.current[questionIdStr] = previousTime + elapsed;
        console.log(`[TIME] Auto-submit - Q${currentQuestionIndex + 1}: +${elapsed}s, total: ${questionTimeSpentRef.current[questionIdStr]}s`);
      }
    }
    
    // Build final answers array with all time spent data
    const finalAnswers = questionsToUse.map((question, index) => {
      const answer = currentAnswers[index];
      const questionId = question?._id || question;
      const questionIdStr = questionId?.toString() || questionId;
      return {
        question: questionIdStr,
        selectedAnswer: answer?.selectedAnswer || null,
        timeSpent: answer?.timeSpent || questionTimeSpentRef.current[questionIdStr] || 0,
      };
    });
    
    // Update ref with final answers
    answersRef.current = finalAnswers;
    
    // Save to storage BEFORE showing alert
    try {
      await examStorage.saveAnswers(attemptId, finalAnswers);
      // Log time spent on each question before submit
      console.log('[TIME] Final time per question:', finalAnswers.map((a, i) => `Q${i+1}: ${a.timeSpent}s`).join(', '));
    } catch (error) {
      console.error('Failed to save answers before auto-submit:', error);
    }
    
    Alert.alert('Time Up', 'Your exam time has ended. Submitting your exam...');
    await submitExam();
  };

  const submitExam = async () => {
    try {
      setSubmitting(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Save current question's time before final save
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        const questionId = currentQuestion._id || currentQuestion;
        const questionIdStr = questionId?.toString() || questionId;
        if (questionStartTimeRef.current[questionIdStr]) {
          const elapsed = Math.floor(
            (Date.now() - questionStartTimeRef.current[questionIdStr]) / 1000
          );
          const previousTime = questionTimeSpentRef.current[questionIdStr] || 0;
          questionTimeSpentRef.current[questionIdStr] = previousTime + elapsed;
          console.log(`[TIME] Submit - Q${currentQuestionIndex + 1}: +${elapsed}s, total: ${questionTimeSpentRef.current[questionIdStr]}s`);
        }
      }

      // Use refs if state is empty or has no selections (for persistence)
      const questionsToUse = questions.length > 0 ? questions : questionsRef.current;
      
      // Check if state/ref has actual selections
      const stateHasSelections = answers.length > 0 && answers.some(a => a?.selectedAnswer !== null && a?.selectedAnswer !== undefined);
      const refHasSelections = answersRef.current.length > 0 && answersRef.current.some(a => a?.selectedAnswer !== null && a?.selectedAnswer !== undefined);
      
      // Prefer whichever has actual selections
      const answersToUseState = stateHasSelections ? answers : (refHasSelections ? answersRef.current : answers);
      // submitExam - checking selections
      
      if (questionsToUse.length === 0) {
        console.error('No questions available for submission - questions state and ref are both empty');
        Alert.alert('Error', 'No questions found. Cannot submit exam.');
        setSubmitting(false);
        return;
      }
      
      // Using questions for submission
      
      // Final save to storage - this will capture all answers including current question
      const savedAnswersData = await saveAnswersToStorage();
      
      // If answers state is empty, try to load from storage
      let answersToUse = answersToUseState;
      if (!answersToUse || answersToUse.length === 0) {
        // Loading answers from storage
        const storageAnswers = await examStorage.getAnswers(attemptId);
        if (storageAnswers && storageAnswers.length > 0) {
          // Convert storage format back to answer format
          answersToUse = storageAnswers.map((ans, index) => {
            const question = questionsToUse[index];
            if (!question) {
              console.warn('Question not found at index', index, 'out of', questionsToUse.length);
              return null;
            }
            return {
              question: question,
              selectedAnswer: ans.selectedAnswer || null,
              isCorrect: false,
              marksObtained: 0,
              timeSpent: ans.timeSpent || 0,
            };
          }).filter(a => a !== null);
          // Loaded answers from storage
        }
      }
      
      // If still empty, create empty answers for all questions
      if (!answersToUse || answersToUse.length === 0) {
        // Creating empty answers array
        answersToUse = questionsToUse.map((q) => ({
          question: q,
          selectedAnswer: null,
          isCorrect: false,
          marksObtained: 0,
          timeSpent: 0,
        }));
      }

      // Try to sync before submitting
      try {
        await syncAnswersToBackend();
      } catch (syncError) {
        console.warn('Failed to sync before submit, but continuing:', syncError);
      }

      // Format answers for submission (same format as frontend)
      // Use questionsToUse array to ensure we have all questions, even if answer is null
      const formattedAnswers = questionsToUse.map((question, index) => {
        const questionId = question?._id || question;
        const questionIdStr = questionId?.toString() || questionId;
        
        // Get answer from answersToUse array
        const answer = answersToUse[index];
        const selectedAnswer = answer?.selectedAnswer || null;
        
        // Calculate time spent from ref (most accurate) or from answer
        const timeSpent = questionTimeSpentRef.current[questionIdStr] || answer?.timeSpent || 0;
        
        return {
          question: questionIdStr,
          selectedAnswer: selectedAnswer,
          timeSpent: typeof timeSpent === 'number' ? timeSpent : (parseFloat(timeSpent) || 0),
          isMarkedForReview: markedForReview.has(questionIdStr),
        };
      });
      
      // Log time spent summary before submission
      const totalTimeSpentSum = formattedAnswers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
      console.log('[TIME] Submitting - Total time tracked:', totalTimeSpentSum, 'seconds');
      console.log('[TIME] Per question:', formattedAnswers.map((a, i) => `Q${i+1}: ${a.timeSpent}s`).join(', '));

      // Submit exam with answers payload
      try {
        const response = await api.post(`/exams/attempt/${attemptId}/submit`, {
          answers: formattedAnswers
        });
        const resultAttemptId = response.data.attempt?._id || attemptId;

        // Clear storage after successful submission
        await examStorage.clearAttemptData(attemptId);

        // Navigate to result
        navigation.replace('Result', { attemptId: resultAttemptId });
      } catch (submitError) {
        // If submit fails, check if we have answers saved
        const savedAnswers = await examStorage.getAnswers(attemptId);
        if (savedAnswers) {
          Alert.alert(
            'Submission Failed',
            'Your answers have been saved locally. Please check your internet connection and try again. Your progress will not be lost.',
            [
              {
                text: 'Retry',
                onPress: () => {
                  setSubmitting(false);
                  submitExam();
                },
              },
              {
                text: 'Go Back',
                style: 'cancel',
                onPress: () => {
                  setSubmitting(false);
                  navigation.goBack();
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to submit exam. Please try again.');
          setSubmitting(false);
        }
      }
    } catch (error) {
      console.error('Failed to submit exam:', error);
      Alert.alert('Error', 'Failed to submit exam. Please try again.');
      setSubmitting(false);
    }
  };

  const getQuestionStatus = (index) => {
    const question = questions[index];
    const questionId = question?._id || question;
    const answer = answers[index];
    const isMarked = markedForReview.has(questionId);
    const isAnswered = answer?.selectedAnswer !== null && answer?.selectedAnswer !== undefined;

    if (isMarked && isAnswered) return 'marked-answered';
    if (isMarked) return 'marked';
    if (isAnswered) return 'answered';
    return 'unanswered';
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestionIndex];
  const isMarked = markedForReview.has(currentQuestion?._id || currentQuestion);

  if (!currentQuestion || submitting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {submitting ? 'Submitting exam...' : 'Loading question...'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = questions.length;
  const answeredCount = answers.filter((a) => a.selectedAnswer !== null).length;
  const markedCount = markedForReview.size;

  // Get current section info
  const currentSection = sections.length > 0 ? sections[currentSectionIndex] : null;
  const currentSectionQuestions = currentSection?.questions || questions;
  const currentQuestionInSection = currentSection 
    ? currentSectionQuestions.findIndex(q => {
        const qId = (currentQuestion._id || currentQuestion).toString();
        const sqId = (q._id || q).toString();
        return qId === sqId;
      }) + 1
    : questionNumber;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Top Header - Testbook Style */}
        <View style={styles.topHeader}>
        <TouchableOpacity 
          style={styles.headerIconButton}
          onPress={handlePause}
          activeOpacity={0.7}
        >
          <Ionicons name="pause-circle" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTimer}>
          <Ionicons name="time-outline" size={18} color={timeRemaining !== null && timeRemaining < 300 ? '#ef4444' : colors.text} />
          <Text style={[styles.headerTimerText, timeRemaining !== null && timeRemaining < 300 && styles.timerWarning]}>
            {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
          </Text>
        </View>
        
        {/* Section Timer - Show if section timing is enabled */}
        {exam?.enableSectionTiming && sections.length > 0 && currentSectionIndex !== null && sectionTimers[currentSectionIndex] !== undefined && (
          <View style={styles.sectionTimer}>
            <Ionicons name="time" size={16} color={sectionTimers[currentSectionIndex] < 60 ? '#ef4444' : colors.text} />
            <Text style={[styles.sectionTimerText, sectionTimers[currentSectionIndex] < 60 && styles.timerWarning]}>
              {formatTime(sectionTimers[currentSectionIndex])}
            </Text>
          </View>
        )}
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {exam.title}
          </Text>
        </View>
        
        {exam.language === 'Both' && (
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => setDisplayLanguage(displayLanguage === 'English' ? 'Hindi' : 'English')}
            activeOpacity={0.7}
          >
            <Text style={styles.languageButton}>
              {displayLanguage === 'English' ? 'E' : 'अ'}
            </Text>
          </TouchableOpacity>
        )}
        
        {appSwitchCount > 0 && (
          <View style={styles.headerSwitchIndicator}>
            <Ionicons name="warning" size={16} color="#f59e0b" />
            <Text style={styles.headerSwitchText}>{appSwitchCount}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.headerIconButton}
          onPress={() => setShowMenu(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Section Tabs */}
      {sections.length > 0 && (
        <View style={styles.sectionTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabsContent}>
            {sections.map((section, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.sectionTab,
                  currentSectionIndex === index && styles.sectionTabActive,
                ]}
                onPress={() => {
                  // Navigate to first question of section
                  const firstQuestionInSection = questions.findIndex(q => 
                    section.questions.some(sq => {
                      const qId = (q._id || q).toString();
                      const sqId = (sq._id || sq).toString();
                      return qId === sqId;
                    })
                  );
                  if (firstQuestionInSection >= 0) {
                    // Check if section is accessible
                    const accessCheck = isQuestionAccessible(firstQuestionInSection);
                    if (!accessCheck.accessible) {
                      if (accessCheck.reason === 'Section time expired') {
                        Alert.alert(
                          'Section Locked',
                          'You cannot access questions in this section as time has expired.',
                          [{ text: 'OK' }]
                        );
                      } else if (accessCheck.reason === 'Section completed') {
                        Alert.alert(
                          'Cannot Return',
                          'You cannot return to questions in a completed section.',
                          [{ text: 'OK' }]
                        );
                      }
                      return;
                    }
                    
                    // Check if section change confirmation is needed
                    if (!handleSectionChange(firstQuestionInSection, index)) {
                      return; // User needs to confirm
                    }
                    
                    saveAnswers();
                    setCurrentQuestionIndex(firstQuestionInSection);
                    setCurrentSectionIndex(index);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.sectionTabText,
                  currentSectionIndex === index && styles.sectionTabTextActive,
                ]}>
                  {section.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Progress Indicators */}
      <View style={styles.progressIndicators}>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Total Questions Answered:</Text>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{answeredCount}</Text>
          </View>
        </View>
        <View style={[styles.progressItem, styles.timerBadge]}>
          <Text style={styles.timerBadgeText}>
            Last {Math.floor((timeRemaining || 0) / 60)} Mins
          </Text>
        </View>
      </View>

      {/* Question Card */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionCard} {...panResponder.panHandlers}>
          <View style={styles.questionHeaderNew}>
            <View style={styles.questionNumberBadge}>
              <Text style={styles.questionNumberBadgeText}>{currentQuestionInSection}</Text>
            </View>
            <View style={styles.questionActions}>
              <TouchableOpacity
                style={styles.questionActionButton}
                onPress={() => {/* Report issue */}}
                activeOpacity={0.7}
              >
                <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.questionActionButton}
                onPress={handleMarkForReview}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isMarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isMarked ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.questionActionButton}
                onPress={() => {/* Star/favorite */}}
                activeOpacity={0.7}
              >
                <Ionicons name="star-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {currentQuestion.questionImage && (
            <View style={styles.questionImageContainer}>
              {/* Image would be rendered here - using placeholder for now */}
              <Text style={styles.imagePlaceholder}>[Question Image]</Text>
            </View>
          )}

          <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map((option, index) => {
              const isSelected = currentAnswer?.selectedAnswer === option.optionLabel;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleAnswerSelect(option.optionLabel)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                    {isSelected && <View style={styles.optionRadioInner} />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.optionLabel}. {option.optionText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation - Testbook Style */}
      <View style={styles.bottomNavNew}>
        <TouchableOpacity
          style={[styles.bottomNavButton, styles.bottomNavButtonSecondary, currentQuestionIndex === 0 && styles.bottomNavButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentQuestionIndex === 0}
          activeOpacity={0.7}
        >
          <Text style={[styles.bottomNavButtonText, currentQuestionIndex === 0 && styles.bottomNavButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomNavButton, styles.bottomNavButtonSecondary]}
          onPress={handleClearResponse}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="close-circle-outline" 
            size={18} 
            color={colors.text} 
            style={{ marginRight: 4 }}
          />
          <Text style={styles.bottomNavButtonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomNavButton, styles.bottomNavButtonSecondary]}
          onPress={handleMarkForReview}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isMarked ? 'bookmark' : 'bookmark-outline'} 
            size={18} 
            color={isMarked ? colors.primary : colors.text} 
            style={{ marginRight: 4 }}
          />
          <Text style={styles.bottomNavButtonText}>Review</Text>
        </TouchableOpacity>

        {currentQuestionIndex < questions.length - 1 ? (
          <TouchableOpacity
            style={[styles.bottomNavButton, styles.bottomNavButtonPrimary]}
            onPress={() => {
              saveAnswers();
              handleNext();
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.bottomNavButtonText, styles.bottomNavButtonTextPrimary]}>
              Save & Next
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.bottomNavButton, styles.bottomNavButtonPrimary]}
            onPress={handleSubmit}
            activeOpacity={0.7}
          >
            <Text style={[styles.bottomNavButtonText, styles.bottomNavButtonTextPrimary]}>
              Submit
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Question Palette Modal */}
      <Modal
        visible={showQuestionPalette}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuestionPalette(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Question Palette</Text>
              <TouchableOpacity
                onPress={() => setShowQuestionPalette(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.paletteGrid} contentContainerStyle={styles.paletteGridContent}>
              {questions.map((question, index) => {
                const status = getQuestionStatus(index);
                const isCurrent = index === currentQuestionIndex;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.paletteItem,
                      styles[`paletteItem${status.charAt(0).toUpperCase() + status.slice(1).replace('-', '')}`],
                      isCurrent && styles.paletteItemCurrent,
                    ]}
                    onPress={() => handleQuestionSelect(index)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.paletteItemText,
                        isCurrent && styles.paletteItemTextCurrent,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.paletteLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.paletteItemUnanswered]} />
                <Text style={styles.legendText}>Unanswered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.paletteItemAnswered]} />
                <Text style={styles.legendText}>Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.paletteItemMarked]} />
                <Text style={styles.legendText}>Marked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.paletteItemMarkedanswered]} />
                <Text style={styles.legendText}>Marked & Answered</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Submit Confirmation Dialog */}
      <Modal
        visible={showSubmitDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSubmitDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>Submit Exam?</Text>
            <Text style={styles.dialogMessage}>
              You have answered {answeredCount} out of {totalQuestions} questions.
              {answeredCount < totalQuestions && (
                <Text style={styles.dialogWarning}>
                  {'\n\n'}You have {totalQuestions - answeredCount} unanswered questions.
                </Text>
              )}
              {'\n\n'}Are you sure you want to submit?
            </Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setShowSubmitDialog(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonConfirm]}
                onPress={confirmSubmit}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogButtonConfirmText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pause Confirmation Dialog */}
      <Modal
        visible={showPauseDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !pausing && setShowPauseDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>Pause Exam?</Text>
            <Text style={styles.dialogMessage}>
              Your progress will be saved and you can continue later from the exam details page.
              {'\n\n'}Are you sure you want to pause the exam?
            </Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setShowPauseDialog(false)}
                activeOpacity={0.7}
                disabled={pausing}
              >
                <Text style={styles.dialogButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonConfirm]}
                onPress={confirmPause}
                activeOpacity={0.7}
                disabled={pausing}
              >
                {pausing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.dialogButtonConfirmText}>Pause</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity
                onPress={() => setShowMenu(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowQuestionPalette(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="grid" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Question Palette</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowPreviewDialog(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="eye" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Preview Answers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowShortcutsDialog(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Gestures & Shortcuts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handlePause();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="pause" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Pause Exam</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleSubmit();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Submit Exam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Preview Answers Dialog */}
      <Modal
        visible={showPreviewDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPreviewDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Your Answers</Text>
              <TouchableOpacity
                onPress={() => setShowPreviewDialog(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
              {/* Summary Statistics */}
              <View style={styles.previewSummary}>
                <View style={styles.previewStatItem}>
                  <Text style={styles.previewStatValue}>{questions.length}</Text>
                  <Text style={styles.previewStatLabel}>Total</Text>
                </View>
                <View style={styles.previewStatItem}>
                  <Text style={[styles.previewStatValue, { color: '#10b981' }]}>
                    {answeredCount}
                  </Text>
                  <Text style={styles.previewStatLabel}>Attempted</Text>
                </View>
                <View style={styles.previewStatItem}>
                  <Text style={[styles.previewStatValue, { color: '#f59e0b' }]}>
                    {totalQuestions - answeredCount}
                  </Text>
                  <Text style={styles.previewStatLabel}>Unattempted</Text>
                </View>
                <View style={styles.previewStatItem}>
                  <Text style={[styles.previewStatValue, { color: '#8b5cf6' }]}>
                    {markedCount}
                  </Text>
                  <Text style={styles.previewStatLabel}>Marked</Text>
                </View>
              </View>

              {/* Questions List */}
              <View style={styles.previewQuestionsList}>
                {answers.map((answer, index) => {
                  const question = answer.question || questions[index];
                  const isSelected = answer?.selectedAnswer !== null && answer?.selectedAnswer !== undefined;
                  const questionId = question?._id || question;
                  const isMarked = markedForReview.has(questionId);
                  const questionText = displayLanguage === 'Hindi' && question?.questionTextHindi
                    ? question.questionTextHindi
                    : question?.questionText || '';
                  const options = displayLanguage === 'Hindi' && question?.optionsHindi && question.optionsHindi.length > 0
                    ? question.optionsHindi
                    : question?.options || [];

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.previewQuestionItem,
                        isSelected && styles.previewQuestionItemAnswered,
                        isMarked && styles.previewQuestionItemMarked,
                      ]}
                      onPress={() => {
                        setCurrentQuestionIndex(index);
                        setShowPreviewDialog(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.previewQuestionHeader}>
                        <Text style={styles.previewQuestionNumber}>Q{index + 1}</Text>
                        <View style={styles.previewQuestionBadges}>
                          {isMarked && (
                            <View style={[styles.previewBadge, styles.previewBadgeMarked]}>
                              <Text style={styles.previewBadgeText}>Marked</Text>
                            </View>
                          )}
                          {isSelected ? (
                            <View style={[styles.previewBadge, styles.previewBadgeAnswered]}>
                              <Text style={styles.previewBadgeText}>Attempted</Text>
                            </View>
                          ) : (
                            <View style={[styles.previewBadge, styles.previewBadgeUnanswered]}>
                              <Text style={styles.previewBadgeText}>Unattempted</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={styles.previewQuestionText} numberOfLines={2}>
                        {questionText}
                      </Text>
                      {isSelected && (
                        <View style={styles.previewAnswerBox}>
                          <Text style={styles.previewAnswerLabel}>Your Answer:</Text>
                          <Text style={styles.previewAnswerValue}>
                            {answer.selectedAnswer}
                            {options.find(opt => (opt.optionLabel || opt.option) === answer.selectedAnswer) && (
                              <Text style={styles.previewAnswerOption}>
                                {' - '}
                                {options.find(opt => (opt.optionLabel || opt.option) === answer.selectedAnswer).optionText || 
                                 options.find(opt => (opt.optionLabel || opt.option) === answer.selectedAnswer).text}
                              </Text>
                            )}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.previewDialogFooter}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setShowPreviewDialog(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogButtonCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonConfirm]}
                onPress={() => {
                  setShowPreviewDialog(false);
                  setShowSubmitDialog(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogButtonConfirmText}>Proceed to Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gesture Shortcuts Dialog */}
      <Modal
        visible={showShortcutsDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShortcutsDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="information-circle" size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>Gestures & Shortcuts</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowShortcutsDialog(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.shortcutsDescription}>
                Use these gestures and actions to navigate the exam quickly
              </Text>

              <View style={styles.shortcutItem}>
                <View style={styles.shortcutIcon}>
                  <Ionicons name="arrow-back" size={20} color={colors.primary} />
                </View>
                <View style={styles.shortcutContent}>
                  <Text style={styles.shortcutTitle}>Previous Question</Text>
                  <Text style={styles.shortcutDescription}>Swipe right or tap "Previous" button</Text>
                </View>
              </View>

              <View style={styles.shortcutItem}>
                <View style={styles.shortcutIcon}>
                  <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                </View>
                <View style={styles.shortcutContent}>
                  <Text style={styles.shortcutTitle}>Next Question</Text>
                  <Text style={styles.shortcutDescription}>Swipe left or tap "Save & Next" button</Text>
                </View>
              </View>

              <View style={styles.shortcutItem}>
                <View style={styles.shortcutIcon}>
                  <Ionicons name="menu" size={20} color={colors.primary} />
                </View>
                <View style={styles.shortcutContent}>
                  <Text style={styles.shortcutTitle}>Open Menu</Text>
                  <Text style={styles.shortcutDescription}>Swipe down from top or tap menu icon</Text>
                </View>
              </View>

              <View style={styles.shortcutItem}>
                <View style={styles.shortcutIcon}>
                  <Ionicons name="bookmark" size={20} color={colors.primary} />
                </View>
                <View style={styles.shortcutContent}>
                  <Text style={styles.shortcutTitle}>Mark for Review</Text>
                  <Text style={styles.shortcutDescription}>Tap "Review" button</Text>
                </View>
              </View>

              <View style={styles.shortcutItem}>
                <View style={styles.shortcutIcon}>
                  <Ionicons name="close-circle" size={20} color={colors.primary} />
                </View>
                <View style={styles.shortcutContent}>
                  <Text style={styles.shortcutTitle}>Clear Response</Text>
                  <Text style={styles.shortcutDescription}>Tap "Clear" button</Text>
                </View>
              </View>

              <View style={styles.shortcutItem}>
                <View style={styles.shortcutIcon}>
                  <Ionicons name="grid" size={20} color={colors.primary} />
                </View>
                <View style={styles.shortcutContent}>
                  <Text style={styles.shortcutTitle}>Question Palette</Text>
                  <Text style={styles.shortcutDescription}>Open from menu to jump to any question</Text>
                </View>
              </View>

              <View style={styles.shortcutItem}>
                <View style={styles.shortcutIcon}>
                  <Ionicons name="eye" size={20} color={colors.primary} />
                </View>
                <View style={styles.shortcutContent}>
                  <Text style={styles.shortcutTitle}>Preview Answers</Text>
                  <Text style={styles.shortcutDescription}>Review all questions before submission</Text>
                </View>
              </View>

              <View style={styles.shortcutItem}>
                <View style={styles.shortcutIcon}>
                  <Ionicons name="pause" size={20} color={colors.primary} />
                </View>
                <View style={styles.shortcutContent}>
                  <Text style={styles.shortcutTitle}>Pause Exam</Text>
                  <Text style={styles.shortcutDescription}>Pause and resume later</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonConfirm]}
                onPress={() => setShowShortcutsDialog(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogButtonConfirmText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* App Switch Warning Dialog */}
      <Modal
        visible={showAppSwitchWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAppSwitchWarning(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning" size={24} color="#f59e0b" />
                <Text style={[styles.modalTitle, { color: '#f59e0b' }]}>App Switch Detected</Text>
              </View>
            </View>

            <Text style={styles.dialogMessage}>
              {appSwitchCount >= 2 ? (
                <>
                  ⚠️ Warning: Multiple app switches detected!{'\n\n'}
                  App switches recorded: {appSwitchCount}{'\n'}
                  {appSwitchCount >= 3 
                    ? 'Your exam has been auto-paused!'
                    : 'One more switch will auto-pause your exam!'}
                </>
              ) : (
                <>
                  An app switch has been detected.{'\n\n'}
                  <Text style={{ fontWeight: 'bold' }}>App switches recorded:</Text> {appSwitchCount}{'\n\n'}
                  Please stay in the exam app. Multiple switches may result in your exam being paused.
                </>
              )}
            </Text>

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonConfirm]}
                onPress={() => setShowAppSwitchWarning(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogButtonConfirmText}>I Understand</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Back Navigation Dialog */}
      <Modal
        visible={showBackNavigationDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBackNavigationDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="exit-outline" size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>Leave Exam?</Text>
              </View>
            </View>

            <Text style={styles.dialogMessage}>
              You are currently attempting the exam. What would you like to do?{'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>Progress:</Text> {answeredCount} of {totalQuestions} questions answered{'\n'}
              <Text style={{ fontWeight: 'bold' }}>Time Remaining:</Text> {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
            </Text>

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setShowBackNavigationDialog(false)}
                activeOpacity={0.7}
                disabled={pausing || submitting}
              >
                <Text style={styles.dialogButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.dialogButtons, { marginTop: 8 }]}>
              <TouchableOpacity
                style={[styles.dialogButton, { backgroundColor: '#f59e0b', flex: 1 }]}
                onPress={async () => {
                  setShowBackNavigationDialog(false);
                  // Pause the exam
                  setShowPauseDialog(true);
                }}
                activeOpacity={0.7}
                disabled={pausing || submitting}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="pause" size={18} color="#FFFFFF" />
                  <Text style={[styles.dialogButtonConfirmText, { color: '#FFFFFF' }]}>Pause Exam</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogButton, { backgroundColor: '#ef4444', flex: 1 }]}
                onPress={() => {
                  setShowBackNavigationDialog(false);
                  // Submit the exam
                  setShowSubmitDialog(true);
                }}
                activeOpacity={0.7}
                disabled={pausing || submitting}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={[styles.dialogButtonConfirmText, { color: '#FFFFFF' }]}>Submit Exam</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Section Change Confirmation Dialog */}
      <Modal
        visible={showSectionChangeDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSectionChangeDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning" size={24} color="#f59e0b" />
                <Text style={styles.modalTitle}>Leave Section?</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSectionChangeDialog(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.dialogMessage}>
              {pendingSectionIndex !== null && currentSectionIndex !== null && sections[currentSectionIndex] && (
                <>
                  You are about to leave <Text style={{ fontWeight: 'bold' }}>{sections[currentSectionIndex].name}</Text>.{'\n\n'}
                  {(() => {
                    const currentSection = sections[currentSectionIndex];
                    const currentSectionQuestions = currentSection?.questions || [];
                    const attempted = currentSectionQuestions.filter(sq => {
                      const qId = (sq._id || sq).toString();
                      return answers.some(ans => {
                        const ansQId = (ans.question?._id || ans.question).toString();
                        return ansQId === qId && ans.selectedAnswer !== null;
                      });
                    }).length;
                    const unattempted = currentSectionQuestions.length - attempted;
                    return (
                      <>
                        <Text style={{ fontWeight: 'bold' }}>Attempted:</Text> {attempted} questions{'\n'}
                        <Text style={{ fontWeight: 'bold' }}>Unattempted:</Text> {unattempted} questions{'\n\n'}
                        Once you leave this section, you won't be able to return to it.
                      </>
                    );
                  })()}
                </>
              )}
            </Text>

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => {
                  setShowSectionChangeDialog(false);
                  setPendingSectionIndex(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonConfirm]}
                onPress={() => {
                  if (pendingSectionIndex !== null) {
                    const targetSection = sections[pendingSectionIndex];
                    if (targetSection && targetSection.questions.length > 0) {
                      const firstQInSection = questions.findIndex(q => 
                        targetSection.questions.some(sq => {
                          const qId = (q._id || q).toString();
                          const sqId = (sq._id || sq).toString();
                          return qId === sqId;
                        })
                      );
                      if (firstQInSection >= 0) {
                        // Mark current section as completed
                        if (currentSectionIndex !== null) {
                          setCompletedSections((prev) => {
                            const newSet = new Set(prev);
                            newSet.add(currentSectionIndex);
                            completedSectionsRef.current = newSet; // Update ref
                            return newSet;
                          });
                        }
                        saveAnswers();
                        setCurrentQuestionIndex(firstQInSection);
                        setCurrentSectionIndex(pendingSectionIndex);
                        currentSectionIndexRef.current = pendingSectionIndex; // Update ref
                      }
                    }
                  }
                  setShowSectionChangeDialog(false);
                  setPendingSectionIndex(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogButtonConfirmText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      paddingTop: 20,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingTop: 20,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerLeft: {
      flex: 1,
    },
    examTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    questionCounter: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    headerSubInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 4,
    },
    timeInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 8,
    },
    timeInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    timeInfoText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    syncIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    syncText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    timer: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    timerWarning: {
      color: '#ef4444',
    },
    progressBarContainer: {
      height: 4,
      backgroundColor: colors.border,
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    questionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    questionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    questionNumber: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    markButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      gap: 6,
    },
    markButtonActive: {
      backgroundColor: colors.primary,
    },
    markButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    markButtonTextActive: {
      color: '#FFFFFF',
    },
    questionImageContainer: {
      marginBottom: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    imagePlaceholder: {
      padding: 40,
      textAlign: 'center',
      color: colors.textSecondary,
      backgroundColor: colors.background,
    },
    questionText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginBottom: 20,
    },
    optionsContainer: {
      gap: 12,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      gap: 12,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    optionRadio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionRadioSelected: {
      borderColor: colors.primary,
    },
    optionRadioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    optionText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    optionTextSelected: {
      fontWeight: '600',
      color: colors.text,
    },
    bottomNav: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      marginBottom: 12,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    navButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    navButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      gap: 6,
      flex: 1,
    },
    navButtonDisabled: {
      opacity: 0.5,
    },
    navButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    navButtonTextDisabled: {
      color: colors.textSecondary,
    },
    paletteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
      gap: 6,
    },
    paletteButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    submitButtonText: {
      color: '#FFFFFF',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      paddingBottom: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    paletteGrid: {
      maxHeight: 400,
    },
    paletteGridContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 20,
      gap: 12,
    },
    paletteItem: {
      width: 50,
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
    },
    paletteItemUnanswered: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    paletteItemAnswered: {
      backgroundColor: colors.primary + '30',
      borderColor: colors.primary,
    },
    paletteItemMarked: {
      backgroundColor: '#f59e0b' + '30',
      borderColor: '#f59e0b',
    },
    paletteItemMarkedanswered: {
      backgroundColor: '#10b981' + '30',
      borderColor: '#10b981',
    },
    paletteItemCurrent: {
      borderWidth: 3,
      transform: [{ scale: 1.1 }],
    },
    paletteItemText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    paletteItemTextCurrent: {
      color: colors.primary,
    },
    paletteLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendColor: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
    },
    legendText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    dialogContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      margin: 20,
    },
    dialogTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    dialogMessage: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 24,
    },
    dialogWarning: {
      color: '#ef4444',
      fontWeight: '600',
    },
    dialogButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    dialogButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    dialogButtonCancel: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dialogButtonCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    dialogButtonConfirm: {
      backgroundColor: colors.primary,
    },
    dialogButtonConfirmText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    // New Testbook-style header
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerIconButton: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTimer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
    },
    headerTimerText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    languageButton: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    headerSwitchIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: '#f59e0b' + '20',
      borderRadius: 12,
    },
    headerSwitchText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#f59e0b',
    },
    // Section tabs
    sectionTabs: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTabsContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    sectionTab: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      marginRight: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    sectionTabActive: {
      borderBottomColor: colors.primary,
    },
    sectionTabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    sectionTabTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    // Progress indicators
    progressIndicators: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    progressItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    progressLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    progressBadge: {
      backgroundColor: '#f59e0b',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      minWidth: 24,
      alignItems: 'center',
    },
    progressBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    timerBadge: {
      backgroundColor: '#ef4444',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    timerBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    // New question header
    questionHeaderNew: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    questionNumberBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    questionNumberBadgeText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    questionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    questionActionButton: {
      padding: 4,
    },
    // New bottom navigation
    bottomNavNew: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 4,
    },
    bottomNavButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginHorizontal: 2,
    },
    bottomNavButtonSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bottomNavButtonPrimary: {
      backgroundColor: colors.primary,
    },
    bottomNavButtonDisabled: {
      opacity: 0.5,
    },
    bottomNavButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    bottomNavButtonTextPrimary: {
      color: '#FFFFFF',
    },
    // Menu modal
    menuContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
      maxHeight: '50%',
    },
    menuHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemText: {
      fontSize: 16,
      color: colors.text,
    },
    // Preview Dialog Styles
    previewSummary: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 20,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    previewStatItem: {
      alignItems: 'center',
    },
    previewStatValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 4,
    },
    previewStatLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    previewQuestionsList: {
      padding: 16,
    },
    previewQuestionItem: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewQuestionItemAnswered: {
      borderColor: '#10b981',
      backgroundColor: '#10b981' + '15',
    },
    previewQuestionItemMarked: {
      borderColor: '#8b5cf6',
      borderWidth: 2,
    },
    previewQuestionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    previewQuestionNumber: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    previewQuestionBadges: {
      flexDirection: 'row',
      gap: 8,
    },
    previewBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    previewBadgeAnswered: {
      backgroundColor: '#10b981' + '30',
    },
    previewBadgeUnanswered: {
      backgroundColor: '#f59e0b' + '30',
    },
    previewBadgeMarked: {
      backgroundColor: '#8b5cf6' + '30',
    },
    previewBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.text,
    },
    previewQuestionText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 8,
    },
    previewAnswerBox: {
      marginTop: 8,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewAnswerLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    previewAnswerValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    previewAnswerOption: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: 'normal',
    },
    previewDialogFooter: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    // Shortcuts Dialog Styles
    shortcutsDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
      lineHeight: 20,
    },
    shortcutItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      marginBottom: 12,
      backgroundColor: colors.background,
      borderRadius: 12,
      gap: 12,
    },
    shortcutIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    shortcutContent: {
      flex: 1,
    },
    shortcutTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    shortcutDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });

