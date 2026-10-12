import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import tw from 'twrnc';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import {
  getLocalizedQuestionText,
  getLocalizedQuestionOptions,
} from '../utils/questionLanguage';

const OPTIONS = ['A', 'B', 'C', 'D'];

function AnswerCell({ index, selected, onSelect, colors }) {
  return (
    <View
      style={[
        tw`flex-row items-center py-2 px-3 mb-2 rounded-xl border`,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[tw`w-8 text-sm font-bold`, { color: colors.text }]}>Q{index + 1}</Text>
      <View style={tw`flex-1 flex-row gap-2 justify-end`}>
        {OPTIONS.map((opt) => {
          const active = selected === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onSelect(active ? null : opt)}
              style={[
                tw`w-9 h-9 rounded-lg items-center justify-center border`,
                {
                  backgroundColor: active ? colors.hero : colors.card,
                  borderColor: active ? colors.hero : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[tw`text-xs font-bold`, { color: active ? colors.heroText : colors.text }]}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function OmrEntryScreen({ route, navigation }) {
  const { examId, attemptId, exam: initialExam, attempt: initialAttempt } = route.params;
  const { colors } = useTheme();
  const [exam, setExam] = useState(initialExam || null);
  const [attempt, setAttempt] = useState(initialAttempt || null);
  const [selections, setSelections] = useState(() => {
    const map = {};
    (initialAttempt?.answers || []).forEach((ans, idx) => {
      const qId = ans.question?._id?.toString?.() || ans.question?.toString?.();
      if (qId) map[qId] = ans.selectedAnswer || null;
      else map[`idx-${idx}`] = ans.selectedAnswer || null;
    });
    return map;
  });
  const [activeTab, setActiveTab] = useState('grid');
  const [loadingPaper, setLoadingPaper] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const questions = useMemo(() => {
    if (attempt?.answers?.length) {
      return attempt.answers.map((a) => a.question).filter(Boolean);
    }
    return exam?.questions || [];
  }, [attempt, exam]);

  const questionKeys = useMemo(
    () =>
      questions.map((q, idx) => q?._id?.toString?.() || q?.toString?.() || `idx-${idx}`),
    [questions]
  );

  const answeredCount = useMemo(
    () => questionKeys.filter((key) => selections[key]).length,
    [questionKeys, selections]
  );

  const loadPaper = useCallback(async () => {
    if (exam?.questions?.length) return;
    try {
      setLoadingPaper(true);
      const res = await api.get(`/exams/${examId}/omr-paper`);
      setExam(res.data.exam);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load question paper');
    } finally {
      setLoadingPaper(false);
    }
  }, [exam, examId]);

  const handleSharePaper = async () => {
    try {
      if (!exam?.questions?.length) await loadPaper();
      const title = exam?.title || 'Exam';
      const lines = (exam?.questions || questions).map((q, i) => {
        const text = getLocalizedQuestionText(q, 'English') || `Question ${i + 1}`;
        return `${i + 1}. ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`;
      });
      await Share.share({
        message: `${title} — Question Paper\n\n${lines.join('\n\n')}`,
        title: `${title} Paper`,
      });
    } catch {
      Alert.alert('Error', 'Could not share question paper');
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    Alert.alert(
      'Submit OMR',
      `Submit ${answeredCount}/${questions.length} marked answers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              const formatted = (attempt?.answers || []).map((ans, idx) => {
                const qId = ans.question?._id?.toString?.() || ans.question?.toString?.();
                const key = qId || `idx-${idx}`;
                const selected = selections[key] || null;
                return {
                  question: qId || ans.question,
                  selectedAnswer: selected,
                  isCorrect: false,
                  marksAwarded: 0,
                  marksDeducted: 0,
                  netMarks: 0,
                  timeSpent: 0,
                  isMarkedForReview: false,
                  isSkipped: !selected,
                };
              });

              await api.put(`/exams/attempt/${attemptId}`, { answers: formatted });
              const response = await api.post(`/exams/attempt/${attemptId}/submit`, {
                answers: formatted,
              });
              navigation.replace('Result', {
                attemptId,
                rewards: response.data.rewards,
              });
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to submit OMR');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper>
      <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
        <View
          style={[
            tw`flex-row items-center px-4 py-3 border-b`,
            { borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 mr-1`}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-base font-bold`, { color: colors.text }]} numberOfLines={1}>
              OMR Entry
            </Text>
            <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
              {exam?.title || 'Exam'} · {answeredCount}/{questions.length} filled
            </Text>
          </View>
          <TouchableOpacity onPress={handleSharePaper} style={tw`p-2`}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[tw`flex-row mx-4 mt-3 mb-2`, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          {[
            { key: 'grid', label: 'Answer Grid' },
            { key: 'paper', label: 'Question Paper' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                setActiveTab(tab.key);
                if (tab.key === 'paper') loadPaper();
              }}
              style={[
                tw`flex-1 py-2.5 items-center`,
                activeTab === tab.key && { borderBottomWidth: 2, borderBottomColor: colors.hero, marginBottom: -1 },
              ]}
            >
              <Text
                style={[
                  tw`text-sm font-semibold`,
                  { color: activeTab === tab.key ? colors.text : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'grid' ? (
          <ScrollView contentContainerStyle={tw`px-4 pb-28 pt-2`}>
            {questions.map((q, idx) => (
              <AnswerCell
                key={questionKeys[idx]}
                index={idx}
                selected={selections[questionKeys[idx]]}
                onSelect={(val) =>
                  setSelections((prev) => ({ ...prev, [questionKeys[idx]]: val }))
                }
                colors={colors}
              />
            ))}
          </ScrollView>
        ) : loadingPaper ? (
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={tw`px-4 pb-28 pt-2`}>
            {(exam?.questions || questions).map((q, idx) => {
              const text = getLocalizedQuestionText(q, 'English');
              const opts = getLocalizedQuestionOptions(q, 'English') || {};
              return (
                <View
                  key={questionKeys[idx]}
                  style={[
                    tw`mb-4 p-4 rounded-2xl border`,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={[tw`text-sm font-bold mb-2`, { color: colors.text }]}>
                    Q{idx + 1}
                  </Text>
                  <Text style={[tw`text-sm mb-3`, { color: colors.text }]}>{text}</Text>
                  {['A', 'B', 'C', 'D'].map((k) =>
                    opts[k] ? (
                      <Text key={k} style={[tw`text-xs mb-1`, { color: colors.textSecondary }]}>
                        ({k}) {opts[k]}
                      </Text>
                    ) : null
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        <View
          style={[
            tw`absolute bottom-0 left-0 right-0 px-4 py-4 border-t`,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={[tw`py-3.5 rounded-2xl items-center`, { backgroundColor: colors.hero }]}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.heroText} />
            ) : (
              <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Submit OMR Sheet</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}
