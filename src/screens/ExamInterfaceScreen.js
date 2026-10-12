import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  AppState,
  PanResponder,
  BackHandler,
  Image,
} from 'react-native';
import tw from 'twrnc';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { examStorage } from '../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getLocalizedQuestionText,
  getLocalizedQuestionOptions,
} from '../utils/questionLanguage';

export default function ExamInterfaceScreen({ route, navigation }) {
  const { examId, attemptId, exam: initialExam, attempt: initialAttempt } = route.params;
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // ─── State ─────────────────────────────────────────────
  const [exam, setExam] = useState(initialExam);
  const [attempt, setAttempt] = useState(initialAttempt);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [isPaused, setIsPaused] = useState(false);
  const [displayLanguage, setDisplayLanguage] = useState('English');
  const { user } = useAuth();
  const [currentQuestionTimeSpent, setCurrentQuestionTimeSpent] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionTimers, setSectionTimers] = useState({});
  const [lockedSections, setLockedSections] = useState(new Set());
  const [completedSections, setCompletedSections] = useState(new Set());
  const [showSectionChangeDialog, setShowSectionChangeDialog] = useState(false);
  const [pendingSectionIndex, setPendingSectionIndex] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [appSwitchCount, setAppSwitchCount] = useState(0);
  const [showAppSwitchWarning, setShowAppSwitchWarning] = useState(false);
  const [showBackNavigationDialog, setShowBackNavigationDialog] = useState(false);
  const [showSectionExpiryDialog, setShowSectionExpiryDialog] = useState(false);

  // ─── Refs ──────────────────────────────────────────────
  const sectionTimerIntervalsRef = useRef({});
  const appSwitchTimeRef = useRef(0);
  const examRef = useRef(initialExam);
  const sectionExpiryShownRef = useRef(new Set());
  const questionStartTimeRef = useRef({});
  const questionTimeSpentRef = useRef({});
  const timerIntervalRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const questionTimeIntervalRef = useRef(null);
  const prevQuestionIndexRef = useRef(-1);
  const questionsRef = useRef([]);
  const answersRef = useRef([]);
  const currentQuestionIndexRef = useRef(0);
  const sectionsRef = useRef([]);
  const lockedSectionsRef = useRef(new Set());
  const completedSectionsRef = useRef(new Set());
  const currentSectionIndexRef = useRef(0);

  // ─── Back button / navigation guard ────────────────────
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!submitting && !pausing) {
        e.preventDefault();
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        Object.values(sectionTimerIntervalsRef.current).forEach((interval) => {
          if (interval) clearInterval(interval);
        });
        setShowBackNavigationDialog(true);
      }
    });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!submitting && !pausing && !showBackNavigationDialog) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        Object.values(sectionTimerIntervalsRef.current).forEach((interval) => {
          if (interval) clearInterval(interval);
        });
        setShowBackNavigationDialog(true);
        return true;
      }
      return false;
    });

    return () => {
      unsubscribe();
      backHandler.remove();
    };
  }, [navigation, submitting, pausing, showBackNavigationDialog]);

  // Resume timer when back dialog closes
  const prevBackDialogRef = useRef(false);
  useEffect(() => {
    const wasOpen = prevBackDialogRef.current;
    prevBackDialogRef.current = showBackNavigationDialog;
    if (wasOpen && !showBackNavigationDialog && !isPaused && !submitting && !pausing) {
      if (timeRemaining !== null && timeRemaining > 0) {
        startTimer(timeRemaining);
      }
    }
  }, [showBackNavigationDialog, isPaused, submitting, pausing]);

  // ─── Initialization ────────────────────────────────────
  useEffect(() => {
    const clearOldData = async () => {
      const savedAnswers = await examStorage.getAnswers(attemptId);
      const savedTime = await examStorage.getTimeRemaining(attemptId);
      if (savedTime !== null && savedTime <= 0 && savedAnswers) {
        await examStorage.clearAttemptData(attemptId);
      }
    };

    clearOldData().then(() => initializeExam());

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const timeSinceSwitch = Date.now() - appSwitchTimeRef.current;
        if (appSwitchTimeRef.current > 0 && timeSinceSwitch > 500) {
          const currentExam = examRef.current || exam || initialExam;
          const allowAppSwitch = currentExam?.allowTabSwitch === true;

          if (!allowAppSwitch) {
            Alert.alert(
              '⚠️ App Switch Detected',
              'App switching is not allowed. Your exam will be auto-submitted.',
              [{ text: 'OK', onPress: () => handleAutoSubmit() }],
              { cancelable: false }
            );
          } else {
            setAppSwitchCount((prev) => {
              const newCount = prev + 1;
              if (newCount >= 3) {
                handlePause();
                Alert.alert('⚠️ Multiple App Switches', 'Your exam has been auto-paused.');
              } else if (newCount >= 1) {
                setShowAppSwitchWarning(true);
              }
              return newCount;
            });
          }
        }
        syncAnswersToBackend();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        appSwitchTimeRef.current = Date.now();
        saveAnswers();
      }
    });

    const autoSaveInterval = setInterval(() => {
      if (!isPaused && !submitting) saveAnswers();
    }, 30000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (questionTimeIntervalRef.current) clearInterval(questionTimeIntervalRef.current);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      clearInterval(autoSaveInterval);
      subscription.remove();
    };
  }, []);

  const initializeExam = async () => {
    try {
      let currentExam = exam || examRef.current;
      if (!currentExam) {
        try {
          const response = await api.get(`/exams/${examId}?includeQuestions=true`);
          currentExam = response.data.exam;
          setExam(currentExam);
          examRef.current = currentExam;
        } catch (error) {
          Alert.alert('Error', 'Failed to load exam data');
          navigation.goBack();
          return;
        }
      } else {
        examRef.current = currentExam;
      }

      if (!currentExam.duration || currentExam.duration <= 0) {
        Alert.alert('Error', 'Exam duration is not set.');
        navigation.goBack();
        return;
      }

      if (!currentExam.questions || currentExam.questions.length === 0) {
        throw new Error('No questions found in exam');
      }

      const questionsList = currentExam.questions
        .map((q) => (typeof q === 'string' ? null : q))
        .filter((q) => q !== null);

      let initializedAnswers = [];
      const savedAnswers = await examStorage.getAnswers(attemptId);
      const savedMarked = await examStorage.getMarked(attemptId);
      const savedTime = await examStorage.getTimeRemaining(attemptId);

      if (savedAnswers && savedAnswers.length > 0) {
        initializedAnswers = savedAnswers.map((ans, index) => {
          const question = questionsList[index];
          const questionId = question?._id || question;
          const timeSpent = ans.timeSpent || 0;
          if (questionId) questionTimeSpentRef.current[questionId] = timeSpent;
          return {
            question,
            selectedAnswer: ans.selectedAnswer || null,
            isCorrect: false,
            marksObtained: 0,
            timeSpent,
          };
        });
        setMarkedForReview(savedMarked);
        if (savedTime !== null) setTimeRemaining(savedTime);
      } else if (attempt?.answers && attempt.answers.length > 0) {
        initializedAnswers = attempt.answers.map((ans, index) => {
          const question = ans.question?._id ? ans.question : questionsList[index];
          const questionId = question?._id || question;
          const timeSpent = ans.timeSpent || 0;
          if (questionId) questionTimeSpentRef.current[questionId] = timeSpent;
          return {
            question,
            selectedAnswer: ans.selectedAnswer || null,
            isCorrect: ans.isCorrect || false,
            marksObtained: ans.marksObtained || 0,
            timeSpent,
          };
        });
      } else {
        initializedAnswers = questionsList.map((q) => ({
          question: q,
          selectedAnswer: null,
          isCorrect: false,
          marksObtained: 0,
          timeSpent: 0,
        }));
      }

      const initialTotal = Object.values(questionTimeSpentRef.current).reduce(
        (sum, time) => sum + (time || 0),
        0
      );
      setTotalTimeSpent(initialTotal);
      setQuestions(questionsList);
      setAnswers(initializedAnswers);
      questionsRef.current = questionsList;
      answersRef.current = initializedAnswers;

      // Sections
      let sectionsWithQuestions = [];
      if (currentExam.sections?.length > 0) {
        sectionsWithQuestions = currentExam.sections.map((section) => ({
          ...section,
          questions: questionsList.filter((q) =>
            section.questions?.some((sqId) => {
              const qId = (q._id || q).toString();
              return qId === sqId.toString();
            })
          ),
        }));
        setSections(sectionsWithQuestions);
        sectionsRef.current = sectionsWithQuestions;

        if (currentExam.enableSectionTiming) {
          const initialTimers = {};
          sectionsWithQuestions.forEach((section, index) => {
            if (section.timeLimit > 0) initialTimers[index] = section.timeLimit * 60;
          });
          setSectionTimers(initialTimers);
        }

        if (sectionsWithQuestions[0]?.questions.length > 0) {
          const firstQ = questionsList.findIndex((q) =>
            sectionsWithQuestions[0].questions.some(
              (sq) => (q._id || q).toString() === (sq._id || sq).toString()
            )
          );
          if (firstQ >= 0) {
            setCurrentQuestionIndex(firstQ);
            setCurrentSectionIndex(0);
            currentSectionIndexRef.current = 0;
          }
        }
      }

      if (currentExam.language === 'Both') {
        setDisplayLanguage(user?.preferredLanguage === 'Hindi' ? 'Hindi' : 'English');
      } else {
        setDisplayLanguage(currentExam.language || 'English');
      }

      // Timer
      const hasSectionTimers =
        currentExam.enableSectionTiming &&
        sectionsWithQuestions.some((s) => s.timeLimit > 0);
      const totalDurationSeconds = currentExam.duration * 60;

      // FIX: renamed to avoid shadowing state `isPaused`
      const attemptIsPaused = attempt?.isPaused || false;
      const hasAnswers = attempt?.answers?.length > 0;
      const hasStartTime = attempt?.startTime;

      let isVeryRecentStart = false;
      if (hasStartTime && !hasAnswers && !attemptIsPaused) {
        const secondsSinceStart = Math.floor((new Date() - new Date(attempt.startTime)) / 1000);
        if (secondsSinceStart < 10) isVeryRecentStart = true;
      }

      let initialTime = null;
      if (!hasSectionTimers) {
        if (savedTime !== null && savedTime > 0 && !isVeryRecentStart) {
          initialTime = savedTime;
        } else if (hasStartTime && (hasAnswers || attemptIsPaused) && !isVeryRecentStart) {
          const now = new Date();
          const startTime = new Date(attempt.startTime);
          const totalElapsed = Math.floor((now - startTime) / 1000);
          if (attemptIsPaused && attempt.pausedAt) {
            const pausedAt = new Date(attempt.pausedAt);
            const activeTime = Math.floor((pausedAt - startTime) / 1000);
            const effectiveElapsed = activeTime - (attempt.pausedDuration || 0);
            initialTime = Math.max(0, totalDurationSeconds - effectiveElapsed);
          } else {
            const effectiveElapsed = totalElapsed - (attempt.pausedDuration || 0);
            if (effectiveElapsed < 0) {
              initialTime = totalDurationSeconds;
            } else {
              initialTime = Math.max(0, totalDurationSeconds - effectiveElapsed);
              if (initialTime <= 0 && totalElapsed > totalDurationSeconds * 2) {
                initialTime = totalDurationSeconds;
              }
            }
          }
        } else {
          initialTime = totalDurationSeconds;
        }

        if (initialTime !== null) {
          setTimeRemaining(initialTime);
          if (initialTime > 0) {
            setTimeout(() => startTimer(initialTime), 50);
          } else {
            Alert.alert('Time Expired', 'The exam time has expired.', [
              { text: 'Submit Now', onPress: () => handleAutoSubmit() },
              { text: 'Continue', style: 'cancel' },
            ]);
          }
        } else {
          setTimeRemaining(totalDurationSeconds);
          setTimeout(() => startTimer(totalDurationSeconds), 100);
        }
      } else {
        setTimeRemaining(null);
      }

      if (await examStorage.isPendingSync(attemptId)) syncAnswersToBackend();
    } catch (error) {
      Alert.alert('Error', 'Failed to load exam questions');
      navigation.goBack();
    }
  };

  // ─── Timer ─────────────────────────────────────────────
  const startTimer = (initialTimeValue = null) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const timeToUse = initialTimeValue !== null ? initialTimeValue : timeRemaining;
    if (timeToUse === null || timeToUse <= 0) return;

    setTimeRemaining(timeToUse);
    const startTimestamp = Date.now();
    const startSeconds = timeToUse;

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      const newTime = Math.max(0, startSeconds - elapsed);
      setTimeRemaining(newTime);

      if (newTime > 0 && newTime % 5 === 0 && attemptId) {
        examStorage.saveTimeRemaining(attemptId, newTime).catch(() => {});
      }
      if (newTime <= 0) {
        clearInterval(timerIntervalRef.current);
        handleAutoSubmit();
      }
    }, 1000);
  };

  // ─── Question time tracking ────────────────────────────
  useEffect(() => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    const qId = (currentQ._id || currentQ)?.toString();

    if (prevQuestionIndexRef.current !== currentQuestionIndex && prevQuestionIndexRef.current >= 0) {
      const prevQ = questions[prevQuestionIndexRef.current];
      if (prevQ) {
        const prevId = (prevQ._id || prevQ)?.toString();
        if (questionStartTimeRef.current[prevId]) {
          const elapsed = Math.floor((Date.now() - questionStartTimeRef.current[prevId]) / 1000);
          questionTimeSpentRef.current[prevId] = (questionTimeSpentRef.current[prevId] || 0) + elapsed;
          delete questionStartTimeRef.current[prevId];
        }
      }
    }
    prevQuestionIndexRef.current = currentQuestionIndex;
    questionStartTimeRef.current[qId] = Date.now();

    const existingTime = questionTimeSpentRef.current[qId] || 0;
    setCurrentQuestionTimeSpent(existingTime);

    if (questionTimeIntervalRef.current) clearInterval(questionTimeIntervalRef.current);
    questionTimeIntervalRef.current = setInterval(() => {
      if (questionStartTimeRef.current[qId]) {
        const elapsed = Math.floor((Date.now() - questionStartTimeRef.current[qId]) / 1000);
        const total = (questionTimeSpentRef.current[qId] || 0) + elapsed;
        setCurrentQuestionTimeSpent(total);
        const allOther = Object.entries(questionTimeSpentRef.current)
          .filter(([id]) => id !== qId)
          .reduce((s, [, t]) => s + (t || 0), 0);
        setTotalTimeSpent(allOther + total);
      }
    }, 1000);

    setTotalTimeSpent(
      Object.values(questionTimeSpentRef.current).reduce((s, t) => s + (t || 0), 0)
    );

    return () => {
      if (questionTimeIntervalRef.current) clearInterval(questionTimeIntervalRef.current);
      if (questionStartTimeRef.current[qId]) {
        const elapsed = Math.floor((Date.now() - questionStartTimeRef.current[qId]) / 1000);
        questionTimeSpentRef.current[qId] = (questionTimeSpentRef.current[qId] || 0) + elapsed;
        delete questionStartTimeRef.current[qId];
      }
    };
  }, [currentQuestionIndex, questions]);

  // ─── Section timers ────────────────────────────────────
  useEffect(() => {
    const currentExam = examRef.current || exam;
    if (!currentExam?.enableSectionTiming) {
      Object.values(sectionTimerIntervalsRef.current).forEach((i) => i && clearInterval(i));
      sectionTimerIntervalsRef.current = {};
      return;
    }
    if (
      sections.length === 0 ||
      isPaused ||
      currentSectionIndex === null ||
      showBackNavigationDialog ||
      showSectionExpiryDialog
    ) {
      Object.values(sectionTimerIntervalsRef.current).forEach((i) => i && clearInterval(i));
      sectionTimerIntervalsRef.current = {};
      return;
    }

    const cs = sections[currentSectionIndex];
    if (!cs?.timeLimit || cs.timeLimit <= 0) {
      if (sectionTimerIntervalsRef.current[currentSectionIndex]) {
        clearInterval(sectionTimerIntervalsRef.current[currentSectionIndex]);
        delete sectionTimerIntervalsRef.current[currentSectionIndex];
      }
      return;
    }

    if (sectionTimerIntervalsRef.current[currentSectionIndex])
      clearInterval(sectionTimerIntervalsRef.current[currentSectionIndex]);

    if (sectionTimers[currentSectionIndex] === undefined) {
      setSectionTimers((prev) => ({ ...prev, [currentSectionIndex]: cs.timeLimit * 60 }));
    }

    sectionTimerIntervalsRef.current[currentSectionIndex] = setInterval(() => {
      setSectionTimers((prev) => {
        const cur = prev[currentSectionIndex] || cs.timeLimit * 60;
        if (cur <= 1) {
          if (!sectionExpiryShownRef.current.has(currentSectionIndex)) {
            sectionExpiryShownRef.current.add(currentSectionIndex);
            clearInterval(sectionTimerIntervalsRef.current[currentSectionIndex]);
            delete sectionTimerIntervalsRef.current[currentSectionIndex];
            setLockedSections((p) => {
              const ns = new Set(p);
              ns.add(currentSectionIndex);
              lockedSectionsRef.current = ns;
              return ns;
            });
            setShowSectionExpiryDialog(true);
            const next = currentSectionIndex + 1;
            if (next < sections.length) {
              const ns = sections[next];
              if (ns?.questions.length > 0) {
                const fq = questions.findIndex((q) =>
                  ns.questions.some(
                    (sq) => (q._id || q).toString() === (sq._id || sq).toString()
                  )
                );
                if (fq >= 0) {
                  Alert.alert('Section Time Expired', `Time for ${cs.name} has expired.`, [
                    {
                      text: 'OK',
                      onPress: () => {
                        setCompletedSections((p) => {
                          const ns2 = new Set(p);
                          ns2.add(currentSectionIndex);
                          completedSectionsRef.current = ns2;
                          return ns2;
                        });
                        setCurrentQuestionIndex(fq);
                        setCurrentSectionIndex(next);
                        currentSectionIndexRef.current = next;
                        setShowSectionExpiryDialog(false);
                      },
                    },
                  ]);
                } else {
                  setShowSectionExpiryDialog(false);
                }
              } else {
                setShowSectionExpiryDialog(false);
              }
            } else {
              Alert.alert('Exam Time Expired', 'All section times have expired.', [
                {
                  text: 'OK',
                  onPress: () => {
                    setShowSectionExpiryDialog(false);
                    handleAutoSubmit();
                  },
                },
              ]);
            }
          }
          return { ...prev, [currentSectionIndex]: 0 };
        }
        return { ...prev, [currentSectionIndex]: cur - 1 };
      });
    }, 1000);

    return () => {
      if (sectionTimerIntervalsRef.current[currentSectionIndex]) {
        clearInterval(sectionTimerIntervalsRef.current[currentSectionIndex]);
        delete sectionTimerIntervalsRef.current[currentSectionIndex];
      }
    };
  }, [sections, isPaused, currentSectionIndex, questions, sectionTimers, showBackNavigationDialog, showSectionExpiryDialog]);

  // Update current section when question changes
  useEffect(() => {
    if (sections.length === 0 || questions.length === 0) return;
    const cq = questions[currentQuestionIndex];
    if (!cq) return;
    const qId = (cq._id || cq).toString();
    const si = sections.findIndex((s) =>
      s.questions.some((sq) => (sq._id || sq).toString() === qId)
    );
    if (si >= 0 && si !== currentSectionIndex) {
      setCurrentSectionIndex(si);
      currentSectionIndexRef.current = si;
    }
  }, [currentQuestionIndex, questions, sections, currentSectionIndex]);

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // ─── Helpers ───────────────────────────────────────────
  const isQuestionAccessible = (questionIndex) => {
    const cs = sectionsRef.current.length > 0 ? sectionsRef.current : sections;
    if (cs.length === 0) return { accessible: true };
    const qs = questionsRef.current.length > 0 ? questionsRef.current : questions;
    const q = qs[questionIndex];
    if (!q) return { accessible: false, reason: 'Question not found' };
    const qId = (q._id || q).toString();
    const si = cs.findIndex((s) => s.questions.some((sq) => (sq._id || sq).toString() === qId));
    if (si < 0) return { accessible: true };
    const ce = examRef.current || exam;
    const ls = lockedSectionsRef.current.size > 0 ? lockedSectionsRef.current : lockedSections;
    const cps = completedSectionsRef.current.size > 0 ? completedSectionsRef.current : completedSections;
    const csi = currentSectionIndexRef.current ?? currentSectionIndex;
    if (ce?.enableSectionTiming && ls.has(si))
      return { accessible: false, reason: 'Section time expired', sectionIndex: si };
    if (ce?.enableSectionLocking && cps.has(si) && si !== csi)
      return { accessible: false, reason: 'Section completed', sectionIndex: si };
    return { accessible: true, sectionIndex: si };
  };

  const handleSectionChange = (targetQI, targetSI) => {
    const ce = examRef.current || exam;
    const ac = isQuestionAccessible(targetQI);
    if (!ac.accessible) {
      Alert.alert(
        ac.reason === 'Section time expired' ? 'Section Locked' : 'Cannot Return',
        ac.reason === 'Section time expired'
          ? 'Time has expired for this section.'
          : 'You cannot return to a completed section.',
        [{ text: 'OK' }]
      );
      return false;
    }
    if (ce?.enableSectionLocking && targetSI !== currentSectionIndex && currentSectionIndex !== null) {
      setPendingSectionIndex(targetSI);
      setShowSectionChangeDialog(true);
      return false;
    }
    return true;
  };

  // ─── Answer handling ───────────────────────────────────
  const handleAnswerSelect = async (optionLabel) => {
    const cur = answersRef.current.length > 0 ? answersRef.current : answers;
    const newAnswers = [...cur];
    newAnswers[currentQuestionIndex] = { ...newAnswers[currentQuestionIndex], selectedAnswer: optionLabel };
    answersRef.current = newAnswers;
    setAnswers(newAnswers);

    try {
      const qs = questionsRef.current.length > 0 ? questionsRef.current : questions;
      const toSave = newAnswers.map((a, i) => {
        const q = qs[i];
        const qId = (q?._id || q)?.toString();
        return {
          question: qId,
          selectedAnswer: a?.selectedAnswer || null,
          timeSpent: a?.timeSpent || questionTimeSpentRef.current[qId] || 0,
        };
      });
      await examStorage.saveAnswers(attemptId, toSave);
    } catch (e) {
      console.error('Failed to save answer:', e);
    }

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => syncAnswersToBackend(), 2000);
  };

  const saveAnswersToStorage = async () => {
    try {
      const qs = questions.length > 0 ? questions : questionsRef.current;
      const stateHas = answers.length > 0 && answers.some((a) => a?.selectedAnswer != null);
      const refHas = answersRef.current.length > 0 && answersRef.current.some((a) => a?.selectedAnswer != null);
      const ans = stateHas ? answers : refHas ? answersRef.current : answers;

      if (qs.length === 0) return null;

      const existing = await examStorage.getAnswers(attemptId);
      const cq = qs[currentQuestionIndex];
      if (cq) {
        const qId = (cq._id || cq)?.toString();
        if (questionStartTimeRef.current[qId]) {
          const elapsed = Math.floor((Date.now() - questionStartTimeRef.current[qId]) / 1000);
          questionTimeSpentRef.current[qId] = (questionTimeSpentRef.current[qId] || 0) + elapsed;
          questionStartTimeRef.current[qId] = Date.now();
        }
      }

      const currentAnswers = qs.map((q, i) => {
        const a = ans[i];
        const ea = existing?.[i];
        const qId = (q?._id || q)?.toString();
        return {
          question: qId,
          selectedAnswer: a?.selectedAnswer != null ? a.selectedAnswer : ea?.selectedAnswer || null,
          timeSpent: a?.timeSpent || questionTimeSpentRef.current[qId] || ea?.timeSpent || 0,
        };
      });

      const sc = currentAnswers.filter((a) => a.selectedAnswer !== null).length;
      if (sc > 0 || !existing || existing.length === 0) {
        await Promise.all([
          examStorage.saveAnswers(attemptId, currentAnswers),
          examStorage.saveMarked(attemptId, markedForReview),
          timeRemaining != null
            ? examStorage.saveTimeRemaining(attemptId, timeRemaining)
            : Promise.resolve(),
        ]);
      }
      return currentAnswers;
    } catch (e) {
      console.error('Failed to save:', e);
      return null;
    }
  };

  const syncAnswersToBackend = async (retryCount = 0) => {
    try {
      const ca = await saveAnswersToStorage();
      if (!ca) return;
      setSyncStatus('syncing');
      setIsOnline(true);
      await api.put(`/exams/attempt/${attemptId}`, { answers: ca });
      await examStorage.clearPendingSync(attemptId);
      setSyncStatus('synced');
    } catch (e) {
      setIsOnline(false);
      setSyncStatus('pending');
      await examStorage.markPendingSync(attemptId);
      if (retryCount < 3) {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => syncAnswersToBackend(retryCount + 1), 5000);
      }
    }
  };

  const saveAnswers = () => {
    if (answers.length > 0 && answers.some((a) => a?.selectedAnswer !== null)) {
      answersRef.current = answers;
    }
    saveAnswersToStorage().catch(console.error);
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => syncAnswersToBackend(), 2000);
  };

  const handleMarkForReview = () => {
    const qId = questions[currentQuestionIndex]?._id || questions[currentQuestionIndex];
    setMarkedForReview((prev) => {
      const ns = new Set(prev);
      ns.has(qId) ? ns.delete(qId) : ns.add(qId);
      examStorage.saveMarked(attemptId, ns).catch(console.error);
      return ns;
    });
  };

  const handleClearResponse = async () => {
    const cur = answersRef.current.length > 0 ? answersRef.current : answers;
    const newAnswers = [...cur];
    newAnswers[currentQuestionIndex] = { ...newAnswers[currentQuestionIndex], selectedAnswer: null };
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
    try {
      const qs = questionsRef.current.length > 0 ? questionsRef.current : questions;
      const toSave = newAnswers.map((a, i) => {
        const q = qs[i];
        const qId = (q?._id || q)?.toString();
        return {
          question: qId,
          selectedAnswer: a?.selectedAnswer || null,
          timeSpent: a?.timeSpent || questionTimeSpentRef.current[qId] || 0,
        };
      });
      await examStorage.saveAnswers(attemptId, toSave);
    } catch (e) {
      console.error('Failed to clear:', e);
    }
  };

  // ─── PanResponder (swipe) ─────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gs) => {
        const { dx, dy } = gs;
        const startY = evt.nativeEvent.pageY - dy;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.5) return true;
        if (dy > 30 && Math.abs(dy) > Math.abs(dx) * 1.5 && startY < 200) return true;
        return false;
      },
      onPanResponderRelease: (evt, gs) => {
        const { dx, dy } = gs;
        const threshold = 50;
        const vThreshold = 0.3;

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
          if (dx > threshold || gs.vx > vThreshold) {
            // Swipe right → previous
            const ci = currentQuestionIndexRef.current;
            if (ci > 0) {
              const pi = ci - 1;
              const ac = isQuestionAccessible(pi);
              if (!ac.accessible) {
                Alert.alert(
                  ac.reason === 'Section time expired' ? 'Section Locked' : 'Cannot Return',
                  ac.reason === 'Section time expired'
                    ? 'Time has expired for this section.'
                    : 'Cannot return to completed section.',
                  [{ text: 'OK' }]
                );
                return;
              }
              const qs = questionsRef.current.length > 0 ? questionsRef.current : questions;
              const cs = sectionsRef.current.length > 0 ? sectionsRef.current : sections;
              const ce = examRef.current || exam;

              if (ce?.enableSectionLocking && cs.length > 0) {
                const cq = qs[ci];
                const pq = qs[pi];
                if (cq && pq) {
                  const cqSi = cs.findIndex((s) =>
                    s.questions.some((sq) => (sq._id || sq).toString() === (cq._id || cq).toString())
                  );
                  const pqSi = cs.findIndex((s) =>
                    s.questions.some((sq) => (sq._id || sq).toString() === (pq._id || pq).toString())
                  );
                  if (pqSi >= 0 && cqSi !== null && pqSi !== cqSi) {
                    setPendingSectionIndex(pqSi);
                    setShowSectionChangeDialog(true);
                    return;
                  }
                }
              }
              saveAnswers();
              setCurrentQuestionIndex(pi);
            }
          } else if (dx < -threshold || gs.vx < -vThreshold) {
            // Swipe left → next
            const ci = currentQuestionIndexRef.current;
            const len = questionsRef.current.length || questions.length;
            if (ci < len - 1) {
              const ni = ci + 1;
              const ac = isQuestionAccessible(ni);
              if (!ac.accessible) {
                Alert.alert(
                  ac.reason === 'Section time expired' ? 'Section Locked' : 'Cannot Return',
                  ac.reason === 'Section time expired'
                    ? 'Time has expired for this section.'
                    : 'Cannot return to completed section.',
                  [{ text: 'OK' }]
                );
                return;
              }
              const qs = questionsRef.current.length > 0 ? questionsRef.current : questions;
              const cs = sectionsRef.current.length > 0 ? sectionsRef.current : sections;
              const ce = examRef.current || exam;

              if (ce?.enableSectionLocking && cs.length > 0) {
                const cq = qs[ci];
                const nq = qs[ni];
                if (cq && nq) {
                  const cqSi = cs.findIndex((s) =>
                    s.questions.some((sq) => (sq._id || sq).toString() === (cq._id || cq).toString())
                  );
                  const nqSi = cs.findIndex((s) =>
                    s.questions.some((sq) => (sq._id || sq).toString() === (nq._id || nq).toString())
                  );
                  if (nqSi >= 0 && cqSi !== null && nqSi !== cqSi) {
                    setPendingSectionIndex(nqSi);
                    setShowSectionChangeDialog(true);
                    return;
                  }
                }
              }
              saveAnswers();
              setCurrentQuestionIndex(ni);
            }
          }
        } else if (Math.abs(dy) > Math.abs(dx) && dy > threshold && gs.vy > vThreshold) {
          setShowMenu(true);
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // ─── Navigation ────────────────────────────────────────
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
    if (seconds == null || seconds < 0) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSubmit = () => setShowSubmitDialog(true);
  const handlePause = () => setShowPauseDialog(true);

  const confirmPause = async () => {
    setPausing(true);
    try {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      await saveAnswersToStorage();
      await syncAnswersToBackend();
      await api.post(`/exams/attempt/${attemptId}/pause`, {
        answers: answers.map((a) => {
          const qId = (a.question?._id || a.question)?.toString();
          return {
            question: qId,
            selectedAnswer: a.selectedAnswer || null,
            timeSpent: questionTimeSpentRef.current[qId] || a.timeSpent || 0,
            isMarkedForReview: markedForReview.has(qId),
          };
        }),
      });
      setIsPaused(true);
      setShowPauseDialog(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      Alert.alert('Exam Paused', 'Your exam has been paused.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to pause exam');
      setPausing(false);
    }
  };

  const confirmSubmit = async () => {
    setShowSubmitDialog(false);
    await submitExam();
  };

  const handleAutoSubmit = async () => {
    if (submitting) return;
    const cur = answersRef.current.length > 0 ? answersRef.current : answers;
    const qs = questionsRef.current.length > 0 ? questionsRef.current : questions;
    const cq = qs[currentQuestionIndex];
    if (cq) {
      const qId = (cq._id || cq)?.toString();
      if (questionStartTimeRef.current[qId]) {
        const elapsed = Math.floor((Date.now() - questionStartTimeRef.current[qId]) / 1000);
        questionTimeSpentRef.current[qId] = (questionTimeSpentRef.current[qId] || 0) + elapsed;
      }
    }
    const final = qs.map((q, i) => {
      const qId = (q?._id || q)?.toString();
      return {
        question: qId,
        selectedAnswer: cur[i]?.selectedAnswer || null,
        timeSpent: cur[i]?.timeSpent || questionTimeSpentRef.current[qId] || 0,
      };
    });
    answersRef.current = final;
    try {
      await examStorage.saveAnswers(attemptId, final);
    } catch (e) {}
    Alert.alert('Time Up', 'Your exam time has ended. Submitting...');
    await submitExam();
  };

  const submitExam = async () => {
    try {
      setSubmitting(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      const cq = questions[currentQuestionIndex];
      if (cq) {
        const qId = (cq._id || cq)?.toString();
        if (questionStartTimeRef.current[qId]) {
          const elapsed = Math.floor((Date.now() - questionStartTimeRef.current[qId]) / 1000);
          questionTimeSpentRef.current[qId] = (questionTimeSpentRef.current[qId] || 0) + elapsed;
        }
      }

      const qs = questions.length > 0 ? questions : questionsRef.current;
      const stateHas = answers.length > 0 && answers.some((a) => a?.selectedAnswer != null);
      const refHas = answersRef.current.length > 0 && answersRef.current.some((a) => a?.selectedAnswer != null);
      let ansToUse = stateHas ? answers : refHas ? answersRef.current : answers;

      if (qs.length === 0) {
        Alert.alert('Error', 'No questions found.');
        setSubmitting(false);
        return;
      }

      await saveAnswersToStorage();

      if (!ansToUse || ansToUse.length === 0) {
        const sa = await examStorage.getAnswers(attemptId);
        if (sa?.length > 0) {
          ansToUse = sa
            .map((a, i) => {
              const q = qs[i];
              if (!q) return null;
              return {
                question: q,
                selectedAnswer: a.selectedAnswer || null,
                isCorrect: false,
                marksObtained: 0,
                timeSpent: a.timeSpent || 0,
              };
            })
            .filter(Boolean);
        }
      }

      if (!ansToUse || ansToUse.length === 0) {
        ansToUse = qs.map((q) => ({
          question: q,
          selectedAnswer: null,
          isCorrect: false,
          marksObtained: 0,
          timeSpent: 0,
        }));
      }

      try {
        await syncAnswersToBackend();
      } catch (e) {}

      const formatted = qs.map((q, i) => {
        const qId = (q?._id || q)?.toString();
        return {
          question: qId,
          selectedAnswer: ansToUse[i]?.selectedAnswer || null,
          timeSpent: questionTimeSpentRef.current[qId] || ansToUse[i]?.timeSpent || 0,
          isMarkedForReview: markedForReview.has(qId),
        };
      });

      try {
        const response = await api.post(`/exams/attempt/${attemptId}/submit`, { answers: formatted });
        const resultId = response.data.attempt?._id || attemptId;
        await examStorage.clearAttemptData(attemptId);
        navigation.replace('Result', {
          attemptId: resultId,
          rewards: response.data.rewards || null,
        });
      } catch (submitError) {
        const sa = await examStorage.getAnswers(attemptId);
        if (sa) {
          Alert.alert('Submission Failed', 'Answers saved locally. Retry?', [
            { text: 'Retry', onPress: () => { setSubmitting(false); submitExam(); } },
            { text: 'Go Back', style: 'cancel', onPress: () => { setSubmitting(false); navigation.goBack(); } },
          ]);
        } else {
          Alert.alert('Error', 'Failed to submit exam.');
          setSubmitting(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit exam.');
      setSubmitting(false);
    }
  };

  // ─── Status helpers ────────────────────────────────────
  const getQuestionStatus = (index) => {
    const q = questions[index];
    const qId = q?._id || q;
    const a = answers[index];
    const marked = markedForReview.has(qId);
    const answered = a?.selectedAnswer != null;
    if (marked && answered) return 'marked-answered';
    if (marked) return 'marked';
    if (answered) return 'answered';
    return 'unanswered';
  };

  const getPaletteColor = (status) => {
    switch (status) {
      case 'answered':
        return { bg: colors.tones.green.bg, fg: colors.tones.green.fg };
      case 'marked':
        return { bg: colors.tones.purple.bg, fg: colors.tones.purple.fg };
      case 'marked-answered':
        return { bg: colors.tones.purple.bg, fg: colors.tones.purple.fg, ring: colors.tones.green.fg };
      default:
        return { bg: colors.surfaceMuted, fg: colors.textSecondary };
    }
  };

  // ─── Computed values ───────────────────────────────────
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestionIndex];
  const isMarked = markedForReview.has(currentQuestion?._id || currentQuestion);
  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = questions.length;
  const answeredCount = answers.filter((a) => a.selectedAnswer !== null).length;
  const markedCount = markedForReview.size;

  const currentSection = sections.length > 0 ? sections[currentSectionIndex] : null;
  const currentSectionQuestions = currentSection?.questions || questions;
  const currentQuestionInSection = currentSection
    ? currentSectionQuestions.findIndex(
        (q) => (currentQuestion._id || currentQuestion).toString() === (q._id || q).toString()
      ) + 1
    : questionNumber;

  // ─── Loading / Submitting ─────────────────────────────
  if (!currentQuestion || submitting) {
    return (
      <ScreenWrapper backgroundColor={colors.surface}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[tw`mt-4 text-base`, { color: colors.textSecondary }]}>
            {submitting ? 'Submitting exam...' : 'Loading question...'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  // ═══════════════════════════════════════════════════════
  // ─── RENDER ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════
  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>

        {/* ─── Top Header ────────────────────────────────── */}
        <View style={tw`flex-row items-center px-4 pt-1 pb-2`}>
          <TouchableOpacity
            style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={handlePause}
            activeOpacity={0.7}
            accessibilityLabel="Pause exam"
          >
            <Ionicons name="pause" size={18} color={colors.text} />
          </TouchableOpacity>

          <View
            style={[
              tw`flex-row items-center ml-2 px-3 h-10 rounded-full`,
              timeRemaining !== null && timeRemaining < 300
                ? { backgroundColor: colors.tones.red.bg }
                : { backgroundColor: colors.hero },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={timeRemaining !== null && timeRemaining < 300 ? colors.tones.red.fg : colors.heroText}
            />
            <Text
              style={[
                tw`ml-1.5 text-base font-extrabold`,
                { color: timeRemaining !== null && timeRemaining < 300 ? colors.tones.red.fg : colors.heroText, fontVariant: ['tabular-nums'] },
              ]}
            >
              {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
            </Text>
          </View>

          {/* Section Timer */}
          {exam?.enableSectionTiming &&
            sections.length > 0 &&
            currentSectionIndex !== null &&
            sectionTimers[currentSectionIndex] !== undefined && (
              <View style={[tw`flex-row items-center ml-2 px-2.5 h-8 rounded-full`, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                <Ionicons
                  name="hourglass-outline"
                  size={13}
                  color={sectionTimers[currentSectionIndex] < 60 ? colors.tones.red.fg : colors.textSecondary}
                />
                <Text
                  style={[
                    tw`ml-1 text-xs font-bold`,
                    { color: sectionTimers[currentSectionIndex] < 60 ? colors.tones.red.fg : colors.textSecondary },
                  ]}
                >
                  {formatTime(sectionTimers[currentSectionIndex])}
                </Text>
              </View>
            )}

          <View style={tw`flex-1 mx-3`}>
            <Text style={[tw`text-sm font-bold`, { color: colors.text }]} numberOfLines={1}>
              {exam?.title}
            </Text>
          </View>

          {exam?.language === 'Both' && (
            <TouchableOpacity
              style={[tw`px-2.5 h-8 rounded-full items-center justify-center mr-2`, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => setDisplayLanguage(displayLanguage === 'English' ? 'Hindi' : 'English')}
              activeOpacity={0.7}
              accessibilityLabel={`Showing ${displayLanguage}. Tap to switch language.`}
            >
              <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>
                {displayLanguage === 'English' ? 'EN' : 'हिन्दी'}
              </Text>
            </TouchableOpacity>
          )}

          {appSwitchCount > 0 && (
            <View style={tw`flex-row items-center mr-1`}>
              <Ionicons name="warning" size={16} color={colors.tones.orange.fg} />
              <Text style={[tw`text-xs font-bold ml-0.5`, { color: colors.tones.orange.fg }]}>{appSwitchCount}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.7}
            accessibilityLabel="Exam menu"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ─── Section Tabs ──────────────────────────────── */}
        {sections.length > 0 && (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`px-4 pb-2`}
            >
              {sections.map((section, index) => {
                const isActive = currentSectionIndex === index;
                const isLocked = lockedSections.has(index);
                const isCompleted = completedSections.has(index);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      tw`px-3.5 py-2 mr-2 rounded-full`,
                      isActive
                        ? { backgroundColor: colors.hero }
                        : isLocked
                        ? { backgroundColor: colors.tones.red.bg }
                        : isCompleted
                        ? { backgroundColor: colors.surfaceMuted }
                        : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      const fqi = questions.findIndex((q) =>
                        section.questions.some(
                          (sq) => (q._id || q).toString() === (sq._id || sq).toString()
                        )
                      );
                      if (fqi >= 0) {
                        const ac = isQuestionAccessible(fqi);
                        if (!ac.accessible) {
                          Alert.alert(
                            ac.reason === 'Section time expired' ? 'Section Locked' : 'Cannot Return',
                            ac.reason === 'Section time expired'
                              ? 'Time has expired for this section.'
                              : 'Cannot return to completed section.',
                            [{ text: 'OK' }]
                          );
                          return;
                        }
                        if (!handleSectionChange(fqi, index)) return;
                        saveAnswers();
                        setCurrentQuestionIndex(fqi);
                        setCurrentSectionIndex(index);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        tw`text-xs font-bold`,
                        { color: isActive ? colors.heroText : isLocked ? colors.tones.red.fg : colors.text },
                      ]}
                    >
                      {section.name}
                      {isLocked ? ' · locked' : isCompleted ? ' ✓' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ─── Progress Indicators ───────────────────────── */}
        <View style={tw`px-4 pb-1`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
              <Text style={[tw`font-bold`, { color: colors.text }]}>{answeredCount}</Text> of {totalQuestions} answered
              {markedCount > 0 ? (
                <Text style={{ color: colors.tones.purple.fg }}>{`  ·  ${markedCount} marked`}</Text>
              ) : null}
            </Text>
            <TouchableOpacity
              style={[tw`flex-row items-center px-3 py-1.5 rounded-full`, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => setShowQuestionPalette(true)}
              activeOpacity={0.7}
              accessibilityLabel="Open question palette"
            >
              <Ionicons name="grid-outline" size={13} color={colors.text} />
              <Text style={[tw`text-xs font-bold ml-1.5`, { color: colors.text }]}>
                {questionNumber}/{totalQuestions}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[tw`h-1 rounded-full overflow-hidden mt-2`, { backgroundColor: colors.surfaceMuted }]}>
            <View
              style={[
                tw`h-full rounded-full`,
                { width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        </View>

        {/* ─── Question Card (scrollable area) ───────────── */}
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-4 pt-3 pb-6`}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[tw`rounded-3xl p-4`, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            {...panResponder.panHandlers}
          >
            {/* Question Header */}
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <View style={tw`flex-row items-center`}>
                <View style={[tw`h-9 px-3 rounded-full items-center justify-center`, { backgroundColor: colors.hero }]}>
                  <Text style={[tw`text-sm font-extrabold`, { color: colors.heroText }]}>Q{currentQuestionInSection}</Text>
                </View>
                {currentSection?.name ? (
                  <Text style={[tw`text-xs ml-2`, { color: colors.textSecondary }]} numberOfLines={1}>
                    {currentSection.name}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  tw`flex-row items-center px-3 py-1.5 rounded-full`,
                  { backgroundColor: isMarked ? colors.tones.purple.bg : colors.surfaceMuted },
                ]}
                onPress={handleMarkForReview}
                activeOpacity={0.7}
                accessibilityLabel={isMarked ? 'Unmark for review' : 'Mark for review'}
              >
                <Ionicons
                  name={isMarked ? 'bookmark' : 'bookmark-outline'}
                  size={14}
                  color={isMarked ? colors.tones.purple.fg : colors.textSecondary}
                />
                <Text style={[tw`text-xs font-bold ml-1`, { color: isMarked ? colors.tones.purple.fg : colors.textSecondary }]}>
                  {isMarked ? 'Marked' : 'Mark'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Question Image */}
            {currentQuestion.questionImage ? (
              <Image
                source={{ uri: currentQuestion.questionImage }}
                style={[tw`w-full h-48 rounded-2xl mb-3`, { backgroundColor: colors.surfaceMuted }]}
                resizeMode="contain"
                accessibilityLabel="Question image"
              />
            ) : null}

            {/* Question Text */}
            <Text style={[tw`text-base leading-7 mb-4`, { color: colors.text }]}>
              {getLocalizedQuestionText(currentQuestion, displayLanguage)}
            </Text>

            {/* Options */}
            <View style={tw`gap-3`}>
              {getLocalizedQuestionOptions(currentQuestion, displayLanguage)?.map((option, index) => {
                const isSelected = currentAnswer?.selectedAnswer === option.optionLabel;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      tw`flex-row items-center p-3 rounded-2xl`,
                      isSelected
                        ? { backgroundColor: colors.surfaceMuted, borderWidth: 1.5, borderColor: colors.hero }
                        : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                    ]}
                    onPress={() => handleAnswerSelect(option.optionLabel)}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      style={[
                        tw`w-8 h-8 rounded-full items-center justify-center mr-3`,
                        isSelected ? { backgroundColor: colors.hero } : { backgroundColor: colors.surfaceMuted },
                      ]}
                    >
                      <Text style={[tw`text-xs font-extrabold`, { color: isSelected ? colors.heroText : colors.textSecondary }]}>
                        {option.optionLabel}
                      </Text>
                    </View>
                    <Text
                      style={[
                        tw`flex-1 text-sm leading-5`,
                        { color: colors.text },
                        isSelected && tw`font-bold`,
                      ]}
                    >
                      {option.optionText}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* ─── Bottom Navigation ─────────────────────────── */}
        <View
          style={[
            tw`flex-row items-center px-3 pt-2.5 border-t`,
            { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 6 },
          ]}
        >
          <TouchableOpacity
            style={[
              tw`w-11 h-11 items-center justify-center rounded-2xl mr-1.5`,
              { backgroundColor: colors.surfaceMuted, opacity: currentQuestionIndex === 0 ? 0.4 : 1 },
            ]}
            onPress={handlePrevious}
            disabled={currentQuestionIndex === 0}
            activeOpacity={0.7}
            accessibilityLabel="Previous question"
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[tw`flex-row items-center justify-center px-3 h-11 rounded-2xl mr-1.5`, { backgroundColor: colors.surfaceMuted }]}
            onPress={handleClearResponse}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={16} color={colors.text} style={tw`mr-1`} />
            <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              tw`flex-row items-center justify-center px-3 h-11 rounded-2xl mr-1.5`,
              { backgroundColor: isMarked ? colors.tones.purple.bg : colors.surfaceMuted },
            ]}
            onPress={handleMarkForReview}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isMarked ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isMarked ? colors.tones.purple.fg : colors.text}
              style={tw`mr-1`}
            />
            <Text style={[tw`text-xs font-bold`, { color: isMarked ? colors.tones.purple.fg : colors.text }]}>
              Review
            </Text>
          </TouchableOpacity>

          {currentQuestionIndex < questions.length - 1 ? (
            <TouchableOpacity
              style={[tw`flex-1 flex-row items-center justify-center px-3 h-11 rounded-2xl`, { backgroundColor: colors.hero }]}
              onPress={() => {
                saveAnswers();
                handleNext();
              }}
              activeOpacity={0.7}
            >
              <Text style={[tw`text-sm font-bold mr-1`, { color: colors.heroText }]}>Save & Next</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.heroText} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[tw`flex-1 flex-row items-center justify-center px-3 h-11 rounded-2xl`, { backgroundColor: colors.hero }]}
              onPress={handleSubmit}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.heroText} style={tw`mr-1.5`} />
              <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═════════════════════════════════════════════════ */}
        {/* ─── MODALS ─────────────────────────────────────  */}
        {/* ═════════════════════════════════════════════════ */}

        {/* ─── Question Palette Modal ────────────────────── */}
        <Modal visible={showQuestionPalette} transparent animationType="slide" onRequestClose={() => setShowQuestionPalette(false)}>
          <View style={tw`flex-1 justify-end bg-black/50`}>
            <View style={[tw`rounded-t-3xl p-5 max-h-[80%]`, { backgroundColor: colors.card }]}>
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <Text style={[tw`text-lg font-extrabold`, { color: colors.text }]}>All questions</Text>
                <TouchableOpacity onPress={() => setShowQuestionPalette(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={30} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={tw`flex-row flex-wrap gap-2 pb-4`}>
                {questions.map((_, index) => {
                  const status = getQuestionStatus(index);
                  const isCurrent = index === currentQuestionIndex;
                  const pc = getPaletteColor(status);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        tw`w-11 h-11 rounded-xl items-center justify-center`,
                        { backgroundColor: pc.bg },
                        pc.ring && { borderWidth: 2, borderColor: pc.ring },
                        isCurrent && { borderWidth: 2, borderColor: colors.hero },
                      ]}
                      onPress={() => handleQuestionSelect(index)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Question ${index + 1}, ${status.replace('-', ' and ')}`}
                    >
                      <Text style={[tw`text-sm font-bold`, { color: pc.fg }]}>{index + 1}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Legend */}
              <View style={[tw`flex-row flex-wrap gap-3 pt-3 border-t`, { borderColor: colors.border }]}>
                {[
                  { label: 'Not answered', status: 'unanswered' },
                  { label: 'Answered', status: 'answered' },
                  { label: 'Marked', status: 'marked' },
                  { label: 'Marked & answered', status: 'marked-answered' },
                ].map(({ label, status }) => {
                  const pc = getPaletteColor(status);
                  return (
                  <View key={label} style={tw`flex-row items-center`}>
                    <View style={[tw`w-4 h-4 rounded mr-1.5`, { backgroundColor: pc.bg }, pc.ring && { borderWidth: 2, borderColor: pc.ring }]} />
                    <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>{label}</Text>
                  </View>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Submit Confirmation ───────────────────────── */}
        <Modal visible={showSubmitDialog} transparent animationType="fade" onRequestClose={() => setShowSubmitDialog(false)}>
          <View style={tw`flex-1 justify-center items-center bg-black/50 px-6`}>
            <View style={[tw`w-full rounded-2xl p-6`, { backgroundColor: colors.card }]}>
              <Text style={[tw`text-lg font-bold mb-3`, { color: colors.text }]}>Submit Exam?</Text>
              <Text style={[tw`text-sm leading-5 mb-1`, { color: colors.textSecondary }]}>
                You have answered {answeredCount} out of {totalQuestions} questions.
              </Text>
              {answeredCount < totalQuestions && (
                <Text style={[tw`text-sm font-semibold mb-3`, { color: colors.tones.red.fg }]}>
                  {totalQuestions - answeredCount} question{totalQuestions - answeredCount === 1 ? ' is' : 's are'} still unanswered.
                </Text>
              )}
              <Text style={[tw`text-sm mb-5`, { color: colors.textSecondary }]}>
                Are you sure you want to submit?
              </Text>
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={[tw`flex-1 py-3 rounded-xl items-center border`, { borderColor: colors.border }]}
                  onPress={() => setShowSubmitDialog(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[tw`flex-1 py-3 rounded-xl items-center`, { backgroundColor: colors.hero }]}
                  onPress={confirmSubmit}
                  activeOpacity={0.7}
                >
                  <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Pause Confirmation ────────────────────────── */}
        <Modal visible={showPauseDialog} transparent animationType="fade" onRequestClose={() => !pausing && setShowPauseDialog(false)}>
          <View style={tw`flex-1 justify-center items-center bg-black/50 px-6`}>
            <View style={[tw`w-full rounded-2xl p-6`, { backgroundColor: colors.card }]}>
              <Text style={[tw`text-lg font-bold mb-3`, { color: colors.text }]}>Pause Exam?</Text>
              <Text style={[tw`text-sm leading-5 mb-5`, { color: colors.textSecondary }]}>
                Your progress will be saved. You can continue later from the exam details page.
              </Text>
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={[tw`flex-1 py-3 rounded-xl items-center border`, { borderColor: colors.border }]}
                  onPress={() => setShowPauseDialog(false)}
                  activeOpacity={0.7}
                  disabled={pausing}
                >
                  <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[tw`flex-1 py-3 rounded-xl items-center`, { backgroundColor: colors.tones.orange.bg }]}
                  onPress={confirmPause}
                  activeOpacity={0.7}
                  disabled={pausing}
                >
                  {pausing ? (
                    <ActivityIndicator size="small" color={colors.tones.orange.fg} />
                  ) : (
                    <Text style={[tw`text-sm font-bold`, { color: colors.tones.orange.fg }]}>Pause</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Menu Modal ────────────────────────────────── */}
        <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
          <View style={tw`flex-1 justify-end bg-black/50`}>
            <View style={[tw`rounded-t-3xl p-5`, { backgroundColor: colors.card }]}>
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>Menu</Text>
                <TouchableOpacity onPress={() => setShowMenu(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={30} color={colors.text} />
                </TouchableOpacity>
              </View>
              {[
                { icon: 'grid', label: 'Question Palette', action: () => { setShowMenu(false); setShowQuestionPalette(true); } },
                { icon: 'eye', label: 'Preview Answers', action: () => { setShowMenu(false); setShowPreviewDialog(true); } },
                { icon: 'information-circle', label: 'Gestures & Shortcuts', action: () => { setShowMenu(false); setShowShortcutsDialog(true); } },
                { icon: 'pause', label: 'Pause Exam', action: () => { setShowMenu(false); handlePause(); } },
                { icon: 'checkmark-circle', label: 'Submit Exam', action: () => { setShowMenu(false); handleSubmit(); } },
              ].map(({ icon, label, action }) => (
                <TouchableOpacity
                  key={label}
                  style={[tw`flex-row items-center py-3.5 px-2 border-b`, { borderColor: colors.border }]}
                  onPress={action}
                  activeOpacity={0.7}
                >
                  <Ionicons name={icon} size={20} color={colors.text} />
                  <Text style={[tw`ml-3 text-sm font-semibold`, { color: colors.text }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* ─── Preview Answers Modal ─────────────────────── */}
        <Modal visible={showPreviewDialog} transparent animationType="slide" onRequestClose={() => setShowPreviewDialog(false)}>
          <View style={tw`flex-1 justify-end bg-black/50`}>
            <View style={[tw`rounded-t-3xl max-h-[90%]`, { backgroundColor: colors.card }]}>
              <View style={tw`flex-row items-center justify-between p-5 pb-3`}>
                <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>Review Your Answers</Text>
                <TouchableOpacity onPress={() => setShowPreviewDialog(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={30} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={tw`flex-1 px-5`} showsVerticalScrollIndicator>
                {/* Summary Stats */}
                <View style={[tw`flex-row rounded-2xl p-3 mb-4`, { backgroundColor: colors.surfaceMuted }]}>
                  {[
                    { value: questions.length, label: 'Total', color: colors.text },
                    { value: answeredCount, label: 'Attempted', color: colors.tones.green.fg },
                    { value: totalQuestions - answeredCount, label: 'Unattempted', color: colors.tones.orange.fg },
                    { value: markedCount, label: 'Marked', color: colors.tones.purple.fg },
                  ].map(({ value, label, color }) => (
                    <View key={label} style={tw`flex-1 items-center`}>
                      <Text style={[tw`text-xl font-bold`, { color }]}>{value}</Text>
                      <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>{label}</Text>
                    </View>
                  ))}
                </View>

                {/* Questions list */}
                {answers.map((answer, index) => {
                  const question = answer.question || questions[index];
                  const isSelected = answer?.selectedAnswer != null;
                  const questionId = question?._id || question;
                  const isMarked = markedForReview.has(questionId);
                  const qText = getLocalizedQuestionText(question, displayLanguage);
                  const opts = getLocalizedQuestionOptions(question, displayLanguage);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        tw`p-3 rounded-2xl mb-2 border`,
                        isSelected
                          ? { borderColor: colors.tones.green.fg, backgroundColor: colors.tones.green.bg }
                          : isMarked
                          ? { borderColor: colors.tones.purple.fg, backgroundColor: colors.tones.purple.bg }
                          : { borderColor: colors.border, backgroundColor: colors.card },
                      ]}
                      onPress={() => {
                        setCurrentQuestionIndex(index);
                        setShowPreviewDialog(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={tw`flex-row items-center justify-between mb-1`}>
                        <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>Q{index + 1}</Text>
                        <View style={tw`flex-row gap-1.5`}>
                          {isMarked && (
                            <View style={[tw`px-2 py-0.5 rounded-full`, { backgroundColor: colors.tones.purple.bg }]}>
                              <Text style={[tw`text-[10px] font-semibold`, { color: colors.tones.purple.fg }]}>
                                Marked
                              </Text>
                            </View>
                          )}
                          <View
                            style={[
                              tw`px-2 py-0.5 rounded-full`,
                              { backgroundColor: isSelected ? colors.tones.green.bg : colors.surfaceMuted },
                            ]}
                          >
                            <Text
                              style={[
                                tw`text-[10px] font-semibold`,
                                { color: isSelected ? colors.tones.green.fg : colors.textSecondary },
                              ]}
                            >
                              {isSelected ? 'Attempted' : 'Unattempted'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={[tw`text-xs`, { color: colors.textSecondary }]} numberOfLines={2}>
                        {qText}
                      </Text>
                      {isSelected && (
                        <View style={[tw`mt-2 p-2 rounded-lg`, { backgroundColor: colors.surfaceMuted }]}>
                          <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>Your Answer:</Text>
                          <Text style={[tw`text-sm font-bold mt-0.5`, { color: colors.text }]}>
                            {answer.selectedAnswer}
                            {opts.find((o) => (o.optionLabel || o.option) === answer.selectedAnswer) && (
                              <Text style={[tw`font-normal`, { color: colors.text }]}>
                                {' - '}
                                {opts.find((o) => (o.optionLabel || o.option) === answer.selectedAnswer)
                                  ?.optionText ||
                                  opts.find((o) => (o.optionLabel || o.option) === answer.selectedAnswer)
                                    ?.text}
                              </Text>
                            )}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={[tw`flex-row gap-3 p-5 border-t`, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[tw`flex-1 py-3 rounded-xl items-center border`, { borderColor: colors.border }]}
                  onPress={() => setShowPreviewDialog(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[tw`flex-1 py-3 rounded-xl items-center`, { backgroundColor: colors.hero }]}
                  onPress={() => {
                    setShowPreviewDialog(false);
                    setShowSubmitDialog(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Proceed to submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Gesture Shortcuts Modal ───────────────────── */}
        <Modal visible={showShortcutsDialog} transparent animationType="fade" onRequestClose={() => setShowShortcutsDialog(false)}>
          <View style={tw`flex-1 justify-center items-center bg-black/50 px-6`}>
            <View style={[tw`w-full rounded-2xl p-6`, { backgroundColor: colors.card }]}>
              <View style={tw`flex-row items-center justify-between mb-3`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <Ionicons name="information-circle" size={26} color={colors.text} />
                  <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>Gestures & Shortcuts</Text>
                </View>
                <TouchableOpacity onPress={() => setShowShortcutsDialog(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={30} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={[tw`text-sm mb-4`, { color: colors.textSecondary }]}>
                Use these gestures to navigate quickly
              </Text>

              <ScrollView style={tw`max-h-96`}>
                {[
                  { icon: 'arrow-back', title: 'Previous Question', desc: 'Swipe right or tap "Previous"' },
                  { icon: 'arrow-forward', title: 'Next Question', desc: 'Swipe left or tap "Save & Next"' },
                  { icon: 'menu', title: 'Open Menu', desc: 'Swipe down from top or tap menu icon' },
                  { icon: 'bookmark', title: 'Mark for Review', desc: 'Tap "Review" button' },
                  { icon: 'close-circle', title: 'Clear Response', desc: 'Tap "Clear" button' },
                  { icon: 'grid', title: 'Question Palette', desc: 'Open from menu to jump to any question' },
                  { icon: 'eye', title: 'Preview Answers', desc: 'Review all before submission' },
                  { icon: 'pause', title: 'Pause Exam', desc: 'Pause and resume later' },
                ].map(({ icon, title, desc }) => (
                  <View key={title} style={[tw`flex-row items-center py-3 border-b`, { borderColor: colors.border }]}>
                    <View style={[tw`w-9 h-9 rounded-full items-center justify-center mr-3`, { backgroundColor: colors.surfaceMuted }]}>
                      <Ionicons name={icon} size={18} color={colors.text} />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>{title}</Text>
                      <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>{desc}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[tw`mt-4 py-3 rounded-xl items-center`, { backgroundColor: colors.hero }]}
                onPress={() => setShowShortcutsDialog(false)}
                activeOpacity={0.7}
              >
                <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ─── App Switch Warning Modal ──────────────────── */}
        <Modal visible={showAppSwitchWarning} transparent animationType="fade" onRequestClose={() => setShowAppSwitchWarning(false)}>
          <View style={tw`flex-1 justify-center items-center bg-black/50 px-6`}>
            <View style={[tw`w-full rounded-2xl p-6`, { backgroundColor: colors.card }]}>
              <View style={tw`flex-row items-center gap-2 mb-3`}>
                <Ionicons name="warning" size={26} color={colors.tones.orange.fg} />
                <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>You left the exam</Text>
              </View>
              <Text style={[tw`text-sm leading-5 mb-5`, { color: colors.textSecondary }]}>
                {appSwitchCount >= 2
                  ? `You've switched away ${appSwitchCount} times.\n\n${
                      appSwitchCount >= 3
                        ? 'Your exam has been auto-paused!'
                        : 'One more will auto-pause your exam!'
                    }`
                  : `You switched to another app.\n\nPlease stay in the exam until you submit.`}
              </Text>
              <TouchableOpacity
                style={[tw`py-3 rounded-xl items-center`, { backgroundColor: colors.hero }]}
                onPress={() => setShowAppSwitchWarning(false)}
                activeOpacity={0.7}
              >
                <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>I understand</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ─── Back Navigation Modal ─────────────────────── */}
        <Modal visible={showBackNavigationDialog} transparent animationType="fade" onRequestClose={() => setShowBackNavigationDialog(false)}>
          <View style={tw`flex-1 justify-center items-center bg-black/50 px-6`}>
            <View style={[tw`w-full rounded-2xl p-6`, { backgroundColor: colors.card }]}>
              <View style={tw`flex-row items-center gap-2 mb-3`}>
                <Ionicons name="exit-outline" size={26} color={colors.text} />
                <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>Leave Exam?</Text>
              </View>
              <Text style={[tw`text-sm leading-5 mb-5`, { color: colors.textSecondary }]}>
                {`You are currently attempting the exam.\n\nProgress: ${answeredCount} of ${totalQuestions} answered\nTime Remaining: ${
                  timeRemaining !== null ? formatTime(timeRemaining) : '--:--'
                }`}
              </Text>

              <TouchableOpacity
                style={[tw`py-3 rounded-xl items-center border mb-2`, { borderColor: colors.border }]}
                onPress={() => setShowBackNavigationDialog(false)}
                activeOpacity={0.7}
                disabled={pausing || submitting}
              >
                <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={[tw`flex-1 flex-row items-center justify-center py-3 rounded-xl`, { backgroundColor: colors.tones.orange.bg }]}
                  onPress={() => {
                    setShowBackNavigationDialog(false);
                    setShowPauseDialog(true);
                  }}
                  activeOpacity={0.7}
                  disabled={pausing || submitting}
                >
                  <Ionicons name="pause" size={16} color={colors.tones.orange.fg} style={tw`mr-1.5`} />
                  <Text style={[tw`text-sm font-bold`, { color: colors.tones.orange.fg }]}>Pause</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[tw`flex-1 flex-row items-center justify-center py-3 rounded-xl`, { backgroundColor: colors.hero }]}
                  onPress={() => {
                    setShowBackNavigationDialog(false);
                    setShowSubmitDialog(true);
                  }}
                  activeOpacity={0.7}
                  disabled={pausing || submitting}
                >
                  <Ionicons name="checkmark-circle" size={16} color={colors.heroText} style={tw`mr-1.5`} />
                  <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Section Change Confirmation Modal ─────────── */}
        <Modal visible={showSectionChangeDialog} transparent animationType="fade" onRequestClose={() => setShowSectionChangeDialog(false)}>
          <View style={tw`flex-1 justify-center items-center bg-black/50 px-6`}>
            <View style={[tw`w-full rounded-2xl p-6`, { backgroundColor: colors.card }]}>
              <View style={tw`flex-row items-center justify-between mb-3`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <Ionicons name="warning" size={26} color={colors.tones.orange.fg} />
                  <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>Leave section?</Text>
                </View>
                <TouchableOpacity onPress={() => setShowSectionChangeDialog(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={30} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={[tw`text-sm leading-5 mb-5`, { color: colors.textSecondary }]}>
                {pendingSectionIndex !== null &&
                  currentSectionIndex !== null &&
                  sections[currentSectionIndex] &&
                  (() => {
                    const cs = sections[currentSectionIndex];
                    const csq = cs?.questions || [];
                    const attempted = csq.filter((sq) => {
                      const qId = (sq._id || sq).toString();
                      return answers.some((a) => {
                        const aId = (a.question?._id || a.question).toString();
                        return aId === qId && a.selectedAnswer !== null;
                      });
                    }).length;
                    return `You are about to leave "${cs.name}".\n\nAttempted: ${attempted} questions\nUnattempted: ${csq.length - attempted} questions\n\nOnce you leave, you won't be able to return.`;
                  })()}
              </Text>

              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={[tw`flex-1 py-3 rounded-xl items-center border`, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowSectionChangeDialog(false);
                    setPendingSectionIndex(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[tw`flex-1 py-3 rounded-xl items-center`, { backgroundColor: colors.hero }]}
                  onPress={() => {
                    if (pendingSectionIndex !== null) {
                      const ts = sections[pendingSectionIndex];
                      if (ts?.questions.length > 0) {
                        const fq = questions.findIndex((q) =>
                          ts.questions.some(
                            (sq) => (q._id || q).toString() === (sq._id || sq).toString()
                          )
                        );
                        if (fq >= 0) {
                          if (currentSectionIndex !== null) {
                            setCompletedSections((prev) => {
                              const ns = new Set(prev);
                              ns.add(currentSectionIndex);
                              completedSectionsRef.current = ns;
                              return ns;
                            });
                          }
                          saveAnswers();
                          setCurrentQuestionIndex(fq);
                          setCurrentSectionIndex(pendingSectionIndex);
                          currentSectionIndexRef.current = pendingSectionIndex;
                        }
                      }
                    }
                    setShowSectionChangeDialog(false);
                    setPendingSectionIndex(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
}
