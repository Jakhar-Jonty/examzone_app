import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { practiceSessionService } from '../services/practiceSessionService';

const SESSION_TYPE_LABELS = {
  random: 'Random',
  'subject-wise': 'Subject Wise',
  'topic-wise': 'Topic Wise',
  'difficulty-based': 'By Difficulty',
  'weak-areas': 'Weak Areas',
};

function getOptionLabel(option, index) {
  if (typeof option === 'string') return String.fromCharCode(65 + index);
  return option.optionLabel || option.option || String.fromCharCode(65 + index);
}

function getOptionText(option) {
  if (typeof option === 'string') return option;
  return option.optionText || option.text || '';
}

function normalizeOptions(options = []) {
  return (options || []).map((opt, i) => ({
    label: getOptionLabel(opt, i),
    text: getOptionText(opt),
  }));
}

function QuestionPaletteGrid({
  total,
  currentIndex,
  getStatus,
  onSelect,
  colors,
}) {
  const statusColor = (status) => {
    switch (status) {
      case 'correct': return colors.success;
      case 'wrong': return colors.error;
      case 'skipped': return '#f97316';
      case 'marked': return '#eab308';
      case 'unanswered': return colors.error;
      default: return colors.border;
    }
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {Array.from({ length: total }).map((_, index) => {
        const status = getStatus(index);
        const bg = statusColor(status);
        const isCurrent = index === currentIndex;
        return (
          <TouchableOpacity
            key={index}
            onPress={() => onSelect(index)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: bg,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: isCurrent ? 2 : 0,
              borderColor: colors.primary,
            }}
          >
            <Text style={{ fontWeight: '700', color: status ? '#fff' : colors.textSecondary, fontSize: 13 }}>
              {index + 1}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function PracticeInterfaceScreen({ route, navigation }) {
  const { sessionId, sessionType } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const questionStartRef = useRef(Date.now());

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState({});
  const [visitedIds, setVisitedIds] = useState(new Set());
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  const sessionTitle = SESSION_TYPE_LABELS[sessionType] || 'Practice';

  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentIndex]);

  useEffect(() => {
    (async () => {
      try {
        const { session } = await practiceSessionService.get(sessionId);
        const qs = session.questions || [];
        setQuestions(qs);

        const states = {};
        const visited = new Set();
        (session.answers || []).forEach((a) => {
          const qId = a.question?.toString?.() || a.question;
          states[qId] = {
            selected: a.selectedAnswer,
            revealed: true,
            skipped: a.selectedAnswer === null || a.selectedAnswer === undefined,
          };
          visited.add(qId);
        });
        setQuestionStates(states);
        setVisitedIds(visited);

        const firstUnanswered = qs.findIndex((q) => !states[q._id]);
        setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
        if (qs[0]) visited.add(qs[0]._id);
      } catch {
        Alert.alert('Error', 'Failed to load practice session', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigation]);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Exit Practice', 'Leave this session? Progress is saved.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Exit', onPress: () => navigation.goBack() },
      ]);
      return true;
    });
    return () => handler.remove();
  }, [navigation]);

  const currentQuestion = questions[currentIndex];
  const currentId = currentQuestion?._id;
  const currentState = questionStates[currentId] || { selected: null, revealed: false, skipped: false };
  const { selected, revealed, skipped } = currentState;

  const getTimeSpent = () => Math.max(1, Math.round((Date.now() - questionStartRef.current) / 1000));

  const goToQuestion = useCallback((index) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
    const qId = questions[index]?._id;
    if (qId) setVisitedIds((prev) => new Set(prev).add(qId));
    setShowPalette(false);
  }, [questions]);

  const getQuestionStatus = useCallback((index) => {
    const q = questions[index];
    if (!q) return undefined;
    const qId = q._id;
    if (markedForReview.has(qId)) return 'marked';
    const state = questionStates[qId];
    if (!state?.revealed) return visitedIds.has(qId) ? 'unanswered' : undefined;
    if (state.skipped) return 'skipped';
    if (state.selected === q.correctAnswer) return 'correct';
    return 'wrong';
  }, [questions, questionStates, visitedIds, markedForReview]);

  const handleAnswer = async (opt) => {
    if (!currentId || revealed) return;
    setQuestionStates((prev) => ({
      ...prev,
      [currentId]: { selected: opt, revealed: true, skipped: false },
    }));
    try {
      await practiceSessionService.answer(sessionId, {
        questionId: currentId,
        selectedAnswer: opt,
        timeSpent: getTimeSpent(),
      });
    } catch {
      Alert.alert('Error', 'Failed to save answer');
    }
  };

  const handleSkip = async () => {
    if (!currentId || revealed) return;
    setQuestionStates((prev) => ({
      ...prev,
      [currentId]: { selected: null, revealed: true, skipped: true },
    }));
    try {
      await practiceSessionService.answer(sessionId, {
        questionId: currentId,
        selectedAnswer: null,
        timeSpent: getTimeSpent(),
      });
    } catch {
      Alert.alert('Error', 'Failed to save skip');
    }
  };

  const handleMarkForReview = () => {
    if (!currentId) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentId)) next.delete(currentId);
      else next.add(currentId);
      return next;
    });
  };

  const finish = async () => {
    setCompleting(true);
    try {
      const { session } = await practiceSessionService.complete(sessionId);
      navigation.replace('PracticeResult', { session });
    } catch {
      Alert.alert('Error', 'Failed to complete session');
    } finally {
      setCompleting(false);
      setShowFinishDialog(false);
    }
  };

  const answeredCount = Object.values(questionStates).filter((s) => s.revealed).length;
  const styles = makeStyles(colors);

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!currentQuestion) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <Text style={styles.emptyText}>No questions in this session</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const opts = normalizeOptions(currentQuestion.options);
  const correctOpt = opts.find((o) => o.label === currentQuestion.correctAnswer);
  const isMarked = markedForReview.has(currentId);

  return (
    <ScreenWrapper>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topTitle} numberOfLines={1}>{sessionTitle} Practice</Text>
          <Text style={styles.topSub}>
            Q {currentIndex + 1}/{questions.length} · {answeredCount} done
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowPalette(true)} hitSlop={12}>
          <Ionicons name="grid-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.tagRow}>
          {currentQuestion.subject ? (
            <View style={styles.tag}><Text style={styles.tagText}>{currentQuestion.subject}</Text></View>
          ) : null}
          {currentQuestion.difficulty ? (
            <View style={[styles.tag, styles.tagBlue]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{currentQuestion.difficulty}</Text>
            </View>
          ) : null}
          {isMarked ? (
            <View style={[styles.tag, styles.tagOrange]}>
              <Text style={[styles.tagText, { color: '#ea580c' }]}>Marked</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

          {opts.map((opt) => {
            const isCorrect = revealed && opt.label === currentQuestion.correctAnswer;
            const isWrong = revealed && opt.label === selected && opt.label !== currentQuestion.correctAnswer;
            const isSelected = !revealed && selected === opt.label;

            return (
              <TouchableOpacity
                key={opt.label}
                disabled={revealed}
                onPress={() => handleAnswer(opt.label)}
                style={[
                  styles.option,
                  isCorrect && styles.optionCorrect,
                  isWrong && styles.optionWrong,
                  isSelected && styles.optionSelected,
                  revealed && !isCorrect && !isWrong && styles.optionDim,
                ]}
              >
                <View style={[
                  styles.optionBadge,
                  isCorrect && { backgroundColor: colors.success },
                  isWrong && { backgroundColor: colors.error },
                ]}>
                  <Text style={styles.optionBadgeText}>{opt.label}</Text>
                </View>
                <Text style={styles.optionText}>{opt.text}</Text>
                {isCorrect && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
                {isWrong && <Ionicons name="close-circle" size={22} color={colors.error} />}
              </TouchableOpacity>
            );
          })}

          {revealed && skipped && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Skipped. Correct: {correctOpt ? `${correctOpt.label}. ${correctOpt.text}` : currentQuestion.correctAnswer}
              </Text>
            </View>
          )}

          {revealed && currentQuestion.explanation ? (
            <View style={styles.explanationBox}>
              <Ionicons name="bulb-outline" size={18} color={colors.success} />
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
            disabled={currentIndex === 0}
            onPress={() => goToQuestion(currentIndex - 1)}
          >
            <Text style={styles.navBtnText}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={handleMarkForReview}>
            <Text style={styles.navBtnText}>{isMarked ? 'Unmark' : 'Mark'}</Text>
          </TouchableOpacity>
          {!revealed && (
            <TouchableOpacity style={styles.navBtn} onPress={handleSkip}>
              <Text style={styles.navBtnText}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.navBtn, currentIndex === questions.length - 1 && styles.navBtnDisabled]}
            disabled={currentIndex === questions.length - 1}
            onPress={() => goToQuestion(currentIndex + 1)}
          >
            <Text style={styles.navBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.finishBtn}
          onPress={() => setShowFinishDialog(true)}
          disabled={completing}
        >
          <Text style={styles.finishBtnText}>
            {completing ? 'Finishing...' : 'Finish Session'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showPalette} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Question Palette</Text>
              <TouchableOpacity onPress={() => setShowPalette(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <QuestionPaletteGrid
                total={questions.length}
                currentIndex={currentIndex}
                getStatus={getQuestionStatus}
                onSelect={goToQuestion}
                colors={colors}
              />
              <View style={{ marginTop: 16, gap: 6 }}>
                {[
                  ['Correct', colors.success],
                  ['Wrong', colors.error],
                  ['Skipped', '#f97316'],
                  ['Marked', '#eab308'],
                  ['Not visited', colors.border],
                ].map(([label, c]) => (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c }} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showFinishDialog} animationType="fade" transparent>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Finish Session?</Text>
            <Text style={styles.dialogDesc}>
              {answeredCount} of {questions.length} questions attempted.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogCancel} onPress={() => setShowFinishDialog(false)}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirm} onPress={finish} disabled={completing}>
                <Text style={styles.dialogConfirmText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const makeStyles = (colors) => ({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: colors.textSecondary },
  emptyText: { color: colors.textSecondary, marginBottom: 16 },
  primaryBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  topBarCenter: { flex: 1, marginHorizontal: 12 },
  topTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  topSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 24 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tagBlue: { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' },
  tagOrange: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  questionText: { fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 24, marginBottom: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 10,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  optionCorrect: { borderColor: colors.success, backgroundColor: colors.success + '12' },
  optionWrong: { borderColor: colors.error, backgroundColor: colors.error + '12' },
  optionDim: { opacity: 0.55 },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: { fontWeight: '800', color: colors.text },
  optionText: { flex: 1, fontSize: 15, color: colors.text },
  infoBox: { marginTop: 8, padding: 12, backgroundColor: colors.surface, borderRadius: 10 },
  infoText: { fontSize: 13, color: colors.textSecondary },
  explanationBox: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: colors.success + '12',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  explanationText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  navRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  navBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  finishBtn: {
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.card, borderRadius: 16, padding: 20 },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  dialogDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  dialogActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  dialogCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  dialogCancelText: { fontWeight: '600', color: colors.text },
  dialogConfirm: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center' },
  dialogConfirmText: { fontWeight: '700', color: '#fff' },
});
