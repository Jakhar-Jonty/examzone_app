import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { practiceSessionService } from '../services/practiceSessionService';
import { buildPyqPaperHtml, pyqPdfFileName } from '../utils/pyqPaperPdf';
import { downloadPyqPdf, printPyqHtml } from '../utils/exportPyqPdf';

import { t as tr } from '../i18n';
const MAX_PAPER = 100;

export default function PyqScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [meta, setMeta] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [papers, setPapers] = useState([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [view, setView] = useState('list');
  const [activePaper, setActivePaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsPage, setQuestionsPage] = useState(1);
  const [questionsPagination, setQuestionsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalQuestions: 0,
  });
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [practicing, setPracticing] = useState(false);
  const [exportingKey, setExportingKey] = useState(null);

  const fetchMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const res = await api.get('/pyq/meta');
      const exams = res.data?.exams || [];
      setMeta(exams);
      setSelectedExam((prev) => prev || exams[0]?.sourceExam || null);
    } catch (err) {
      Alert.alert(tr("Error"), err.response?.data?.message || tr("Failed to load PYQ data"));
      setMeta([]);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const fetchPapers = useCallback(async (exam) => {
    if (!exam) return;
    setPapersLoading(true);
    try {
      const params = new URLSearchParams({ sourceExam: exam });
      const res = await api.get(`/pyq/papers?${params.toString()}`);
      setPapers(res.data.papers || []);
    } catch (err) {
      Alert.alert(tr("Error"), err.response?.data?.message || tr("Failed to load papers"));
      setPapers([]);
    } finally {
      setPapersLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async (paper, exam, page = 1) => {
    if (!paper || !exam) return;
    setQuestionsLoading(true);
    try {
      const params = new URLSearchParams({
        sourceExam: exam,
        year: String(paper.year),
        page: String(page),
        limit: '20',
      });
      if (paper.shift) params.set('shift', paper.shift);
      else if (paper.paperSet) params.set('paperSet', paper.paperSet);
      const res = await api.get(`/pyq/questions?${params.toString()}`);
      setQuestions(res.data.questions || []);
      setQuestionsPagination(
        res.data.pagination || { currentPage: 1, totalPages: 1, totalQuestions: 0 }
      );
      setQuestionsPage(page);
      setExpandedIds(new Set());
    } catch (err) {
      Alert.alert(tr("Error"), err.response?.data?.message || tr("Failed to load questions"));
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    if (selectedExam) {
      fetchPapers(selectedExam);
      setView('list');
      setActivePaper(null);
    } else {
      setPapers([]);
    }
  }, [selectedExam, fetchPapers]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSolutions = (paper) => {
    setActivePaper(paper);
    setView('solutions');
    fetchQuestions(paper, selectedExam, 1);
  };

  const fetchPaperQuestions = async (paper) => {
    const params = new URLSearchParams({
      sourceExam: selectedExam,
      year: String(paper.year),
      page: '1',
      limit: '100',
    });
    if (paper.shift) params.set('shift', paper.shift);
    else if (paper.paperSet) params.set('paperSet', paper.paperSet);
    const res = await api.get(`/pyq/questions?${params.toString()}`);
    return res.data.questions || [];
  };

  const handleExport = async (paper, mode) => {
    const key = `${tr(paper.label)}-${mode}`;
    setExportingKey(key);
    try {
      const qs = await fetchPaperQuestions(paper);
      if (!qs.length) {
        Alert.alert(tr("Nothing to export"), tr("No questions found for this paper"));
        return;
      }
      const html = buildPyqPaperHtml({ title: paper.label, questions: qs });
      if (mode === 'print') {
        await printPyqHtml(html);
      } else {
        await downloadPyqPdf(html, pyqPdfFileName(paper.label));
      }
    } catch (err) {
      Alert.alert(
        mode === 'print' ? tr("Print failed") : tr("Download failed"),
        err.response?.data?.message || err.message || tr("Could not export paper")
      );
    } finally {
      setExportingKey(null);
    }
  };

  const startPaper = async (paper) => {
    if (paper.curatedExamId) {
      navigation.navigate('ExamDetail', { examId: paper.curatedExamId });
      return;
    }
    setPracticing(true);
    try {
      const questionCount = Math.min(paper.questionCount || 0, MAX_PAPER);
      const filters = {
        sourceExam: selectedExam,
        sourceYear: paper.year,
      };
      if (paper.shift) filters.shift = paper.shift;
      else if (paper.paperSet) filters.paperSet = paper.paperSet;

      const { session } = await practiceSessionService.create({
        sessionType: 'pyq',
        questionCount,
        filters,
      });
      navigation.navigate('PracticeInterface', { sessionId: session._id });
    } catch (err) {
      Alert.alert(tr("Error"), err.response?.data?.message || tr("Could not start paper"));
    } finally {
      setPracticing(false);
    }
  };

  const offset = ((questionsPagination.currentPage || 1) - 1) * 20;

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (view === 'solutions') {
                setView('list');
                setActivePaper(null);
                return;
              }
              navigation.goBack();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {view === 'solutions' && activePaper ? activePaper.label : tr("Previous Year Questions")}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {view === 'solutions'
                ? tr("{0} Qs · Solutions", activePaper?.questionCount || 0)
                : tr("Attempt past papers")}
            </Text>
          </View>
          {view === 'solutions' && activePaper ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                disabled={!!exportingKey}
                onPress={() => handleExport(activePaper, 'download')}
              >
                {exportingKey === `${tr(activePaper.label)}-download` ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="download-outline" size={20} color={colors.text} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                disabled={!!exportingKey}
                onPress={() => handleExport(activePaper, 'print')}
              >
                {exportingKey === `${tr(activePaper.label)}-print` ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="print-outline" size={20} color={colors.text} />
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {metaLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {view === 'list' ? (
              <>
                {meta.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons name="document-text-outline" size={36} color={colors.textSecondary} />
                    <Text style={styles.emptyTitle}>{tr("No PYQ yet")}</Text>
                    <Text style={styles.emptySub}>
                      {tr("Previous-year questions will appear once tagged.")}
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                    style={styles.chipScroll}
                  >
                    {meta.map((exam) => {
                      const active = selectedExam === exam.sourceExam;
                      return (
                        <TouchableOpacity
                          key={exam.sourceExam}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setSelectedExam(exam.sourceExam)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {exam.sourceExam}
                          </Text>
                          <Text style={[styles.chipCount, active && styles.chipCountActive]}>
                            {exam.totalQuestions}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {!selectedExam && meta.length > 0 ? (
                  <View style={styles.promptBox}>
                    <Text style={styles.promptText}>{tr("Select an exam to see papers")}</Text>
                  </View>
                ) : null}

                {selectedExam ? (
                  papersLoading ? (
                    <View style={styles.centered}>
                      <ActivityIndicator size="large" color={colors.text} />
                    </View>
                  ) : papers.length === 0 ? (
                    <View style={styles.empty}>
                      <Text style={styles.emptyTitle}>{tr("No papers")}</Text>
                      <Text style={styles.emptySub}>{tr("No PYQ papers for {0} yet.", selectedExam)}</Text>
                    </View>
                  ) : (
                    <View style={styles.listCard}>
                      {papers.map((paper, index) => (
                        <View
                          key={`${paper.year}-${paper.shift || ''}-${paper.paperSet || ''}`}
                          style={[
                            styles.paperRow,
                            index < papers.length - 1 && styles.paperRowBorder,
                          ]}
                        >
                          <View style={styles.paperIcon}>
                            <Ionicons name="document-text" size={18} color={colors.text} />
                          </View>
                          <View style={styles.paperBody}>
                            <Text style={styles.paperTitle} numberOfLines={2}>
                              {tr(paper.label)}
                            </Text>
                            <Text style={styles.paperMeta}>
                              {tr("Previous year paper · {0} Qs", paper.questionCount)}
                            </Text>
                            <View style={styles.paperActions}>
                              <TouchableOpacity
                                style={styles.startBtn}
                                onPress={() => startPaper(paper)}
                                disabled={practicing || !paper.questionCount}
                                activeOpacity={0.85}
                              >
                                {practicing ? (
                                  <ActivityIndicator color={colors.heroText} size="small" />
                                ) : (
                                  <>
                                    <Ionicons name="play" size={14} color={colors.heroText} />
                                    <Text style={styles.startBtnText}>{tr("Start")}</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => openSolutions(paper)}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                              >
                                <Text style={styles.solutionsLink}>{tr("Solutions")}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.iconAction}
                                disabled={!!exportingKey || !paper.questionCount}
                                onPress={() => handleExport(paper, 'download')}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                              >
                                {exportingKey === `${tr(paper.label)}-download` ? (
                                  <ActivityIndicator size="small" color={colors.text} />
                                ) : (
                                  <Ionicons name="download-outline" size={18} color={colors.text} />
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.iconAction}
                                disabled={!!exportingKey || !paper.questionCount}
                                onPress={() => handleExport(paper, 'print')}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                              >
                                {exportingKey === `${tr(paper.label)}-print` ? (
                                  <ActivityIndicator size="small" color={colors.text} />
                                ) : (
                                  <Ionicons name="print-outline" size={18} color={colors.text} />
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )
                ) : null}
              </>
            ) : questionsLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.text} />
              </View>
            ) : questions.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{tr("No questions")}</Text>
              </View>
            ) : (
              <>
                {questions.map((q, idx) => {
                  const expanded = expandedIds.has(q._id);
                  return (
                    <View key={q._id} style={styles.qCard}>
                      <View style={styles.qMetaRow}>
                        <View style={styles.qPill}>
                          <Text style={styles.qPillText}>Q{offset + idx + 1}</Text>
                        </View>
                        {q.subject ? (
                          <Text style={styles.qMeta} numberOfLines={1}>
                            {q.subject}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.qText}>{q.questionText}</Text>
                      {(q.options || []).map((opt) => {
                        const label = opt.optionLabel || opt.option;
                        const text = opt.optionText || opt.text || '';
                        const isCorrect = expanded && label === q.correctAnswer;
                        return (
                          <View
                            key={label}
                            style={[styles.optRow, isCorrect && styles.optRowCorrect]}
                          >
                            <Text style={[styles.optLabel, isCorrect && styles.optLabelCorrect]}>
                              {label}.
                            </Text>
                            <Text style={[styles.optText, isCorrect && styles.optLabelCorrect]}>
                              {text}
                            </Text>
                          </View>
                        );
                      })}
                      <TouchableOpacity
                        style={styles.answerBtn}
                        onPress={() => toggleExpanded(q._id)}
                      >
                        <Ionicons
                          name={expanded ? 'eye-off-outline' : 'eye-outline'}
                          size={15}
                          color={colors.text}
                        />
                        <Text style={styles.answerBtnText}>
                          {expanded ? tr("Hide answer") : tr("Show answer")}
                        </Text>
                      </TouchableOpacity>
                      {expanded ? (
                        <View style={styles.answerBox}>
                          <Text style={styles.answerCorrect}>{tr("Correct: {0}", q.correctAnswer)}</Text>
                          {q.explanation ? (
                            <Text style={styles.answerExpl}>{q.explanation}</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                {questionsPagination.totalPages > 1 ? (
                  <View style={styles.pagerRow}>
                    <TouchableOpacity
                      style={[styles.pagerBtn, questionsPage <= 1 && styles.pagerBtnDisabled]}
                      disabled={questionsPage <= 1}
                      onPress={() => fetchQuestions(activePaper, selectedExam, questionsPage - 1)}
                    >
                      <Text style={styles.pagerBtnText}>{tr("Previous")}</Text>
                    </TouchableOpacity>
                    <Text style={styles.pagerLabel}>
                      {questionsPage} / {questionsPagination.totalPages}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.pagerBtn,
                        questionsPage >= questionsPagination.totalPages && styles.pagerBtnDisabled,
                      ]}
                      disabled={questionsPage >= questionsPagination.totalPages}
                      onPress={() => fetchQuestions(activePaper, selectedExam, questionsPage + 1)}
                    >
                      <Text style={styles.pagerBtnText}>{tr("Next")}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </ScreenWrapper>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 4,
    },
    backBtn: { padding: 6 },
    headerTextWrap: { flex: 1 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    headerIconBtn: { padding: 8 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 28 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 10 },
    emptySub: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
    chipScroll: { maxHeight: 48, marginTop: 12, marginBottom: 8 },
    chipRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 6,
    },
    chipActive: { backgroundColor: colors.hero, borderColor: colors.hero },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
    chipTextActive: { color: colors.heroText },
    chipCount: { fontSize: 12, color: colors.textSecondary },
    chipCountActive: { color: colors.heroTextSecondary },
    promptBox: {
      marginHorizontal: 16,
      marginTop: 24,
      paddingVertical: 28,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    promptText: { fontSize: 13, color: colors.textSecondary },
    listCard: {
      marginHorizontal: 16,
      marginTop: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    paperRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 10,
    },
    paperRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    paperIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.cardMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    paperBody: { flex: 1, minWidth: 0 },
    paperTitle: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 19 },
    paperMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    paperActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 10,
    },
    startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.hero,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      minWidth: 72,
      justifyContent: 'center',
    },
    startBtnText: { color: colors.heroText, fontSize: 13, fontWeight: '700' },
    solutionsLink: { fontSize: 13, fontWeight: '700', color: colors.text },
    iconAction: { padding: 4 },
    qCard: {
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    qMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    qPill: {
      backgroundColor: colors.cardMuted,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 5,
    },
    qPillText: { fontSize: 11, fontWeight: '800', color: colors.text },
    qMeta: { flex: 1, fontSize: 11, color: colors.textSecondary },
    qText: { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20, marginBottom: 8 },
    optRow: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.cardMuted,
      marginBottom: 4,
    },
    optRowCorrect: { backgroundColor: colors.tones.green.bg, borderWidth: 1, borderColor: colors.tones.green.fg },
    optLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
    optLabelCorrect: { color: colors.tones.green.fg },
    optText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
    answerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingVertical: 4,
    },
    answerBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },
    answerBox: {
      marginTop: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.tones.green.bg,
      borderWidth: 1,
      borderColor: colors.tones.green.fg,
    },
    answerCorrect: { fontSize: 13, fontWeight: '700', color: colors.tones.green.fg },
    answerExpl: { fontSize: 12, color: colors.text, marginTop: 4, lineHeight: 17 },
    pagerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    pagerBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    pagerBtnDisabled: { opacity: 0.4 },
    pagerBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
    pagerLabel: { fontSize: 13, color: colors.textSecondary },
  });
