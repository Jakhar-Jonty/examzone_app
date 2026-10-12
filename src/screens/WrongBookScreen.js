import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { practiceSessionService } from '../services/practiceSessionService';
import { buildWrongBookAnswerKeyHtml } from '../utils/wrongBookPdf';
import { exportWrongBookPdf } from '../utils/exportWrongBookPdf';

const MAX_EXPORT = 100;

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All status' },
  { value: 'needs-review', label: 'Needs review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'mastered', label: 'Mastered' },
];

const STATUS_CHOICES = [
  {
    value: 'needs-review',
    label: 'Needs review',
    hint: 'Still weak — come back to this',
    icon: 'alert-circle',
    tone: 'orange',
  },
  {
    value: 'reviewed',
    label: 'Reviewed',
    hint: 'Checked once — keep drilling',
    icon: 'eye',
    tone: 'blue',
  },
  {
    value: 'mastered',
    label: 'Mastered',
    hint: 'You own this question',
    icon: 'checkmark-circle',
    tone: 'green',
  },
];

const PRACTICE_COUNTS = [10, 15, 20];

const PRACTICE_STATUS_OPTIONS = [
  {
    value: 'needs-review',
    label: 'Needs review',
    hint: 'Still weak',
    tone: 'orange',
  },
  {
    value: 'reviewed',
    label: 'Reviewed',
    hint: 'Checked once',
    tone: 'blue',
  },
  {
    value: 'mastered',
    label: 'Mastered',
    hint: 'Optional refresher',
    tone: 'green',
  },
];

const DEFAULT_PRACTICE_OPTS = {
  statuses: ['needs-review', 'reviewed'],
  subject: '',
  topic: '',
  revisitOnly: false,
  pickMode: 'random', // random | priority
};

function formatWrongDate(date) {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

// Needs review = orange, reviewed = blue, mastered = green ({ fg, bg } theme tone).
function statusTone(status, colors) {
  if (status === 'mastered') return colors.tones.green;
  if (status === 'reviewed') return colors.tones.blue;
  return colors.tones.orange;
}

function statusLabel(status) {
  return (status || 'needs-review').replace('-', ' ');
}

export default function WrongBookScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, needsReview: 0, revisit: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPracticeSheet, setShowPracticeSheet] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [practiceCount, setPracticeCount] = useState(15);
  const [practiceOpts, setPracticeOpts] = useState(DEFAULT_PRACTICE_OPTS);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filters, setFilters] = useState({
    status: '',
    subject: '',
    topic: '',
    revisitOnly: '',
  });
  const filtersRef = useRef(filters);
  // Keep an always-current snapshot for `fetchList` without forcing re-creations.
  filtersRef.current = filters;
  const [draftFilters, setDraftFilters] = useState(filters);
  const [subjectsAndTopics, setSubjectsAndTopics] = useState([]);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showPicker, setShowPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pickerItems, setPickerItems] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const fetchList = useCallback(
    async ({ pageNum = 1, append = false, filterOverride } = {}) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const active = filterOverride || filtersRef.current;

      try {
        const params = new URLSearchParams({
          source: 'auto',
          page: String(pageNum),
          limit: '20',
          sortBy: 'lastWrongAt',
          sortOrder: 'desc',
        });
        if (active.status) params.set('status', active.status);
        if (active.subject) params.set('subject', active.subject);
        if (active.topic) params.set('topic', active.topic);
        if (active.revisitOnly) params.set('revisitOnly', active.revisitOnly);

        const res = await api.get(`/user/questions/saved?${params.toString()}`);
        const list = res.data.savedQuestions || [];
        const pagination = res.data.pagination || {};

        setItems((prev) => (append ? [...prev, ...list] : list));
        setStats(res.data.stats || { total: 0, needsReview: 0, revisit: 0 });
        setPage(pageNum);
        setHasMore(pageNum < (pagination.totalPages || 1));
      } catch (err) {
        console.error('Wrong Book fetch failed:', err);
        if (!append) setItems([]);
        Alert.alert('Error', err.response?.data?.message || 'Failed to load Wrong Book');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [filtersRef]
  );

  useEffect(() => {
    fetchList({ pageNum: 1 });
  }, [fetchList]);

  useEffect(() => {
    api
      .get('/user/subjects-topics')
      .then((r) => setSubjectsAndTopics(r.data?.subjectsAndTopics || []))
      .catch(() => setSubjectsAndTopics([]));
  }, []);

  const availableSubjects = [...new Set(subjectsAndTopics.map((s) => s.subject).filter(Boolean))].sort();
  const availableTopics =
    subjectsAndTopics.find(
      (s) => s.subject?.toLowerCase() === draftFilters.subject?.toLowerCase()
    )?.topics || [];
  const practiceTopics =
    subjectsAndTopics.find(
      (s) => s.subject?.toLowerCase() === practiceOpts.subject?.toLowerCase()
    )?.topics || [];

  const onRefresh = () => {
    setRefreshing(true);
    fetchList({ pageNum: 1 });
  };

  const togglePracticeStatus = (value) => {
    setPracticeOpts((prev) => {
      const has = prev.statuses.includes(value);
      let next = has
        ? prev.statuses.filter((s) => s !== value)
        : [...prev.statuses, value];
      // Always keep at least one status selected
      if (next.length === 0) next = [value];
      return { ...prev, statuses: next };
    });
  };

  const openPracticeSheet = () => {
    if ((stats.total || 0) === 0) return;
    const preferred = PRACTICE_COUNTS.includes(practiceCount) ? practiceCount : 15;
    setPracticeCount(preferred);
    // Seed from list filters so practice matches what you're browsing
    setPracticeOpts({
      statuses: filters.status
        ? [filters.status]
        : [...DEFAULT_PRACTICE_OPTS.statuses],
      subject: filters.subject || '',
      topic: filters.topic || '',
      revisitOnly: filters.revisitOnly === 'true',
      pickMode: 'random',
    });
    setShowPracticeSheet(true);
  };

  const handlePractice = async () => {
    if (practicing || (stats.total || 0) === 0) return;
    if (!practiceOpts.statuses.length) {
      Alert.alert('Pick a status', 'Select at least one status to practice.');
      return;
    }
    setPracticing(true);
    try {
      const count = Math.min(Math.max(practiceCount, 5), 100);
      const { session } = await practiceSessionService.create({
        sessionType: 'mistakes',
        questionCount: count,
        filters: {
          statuses: practiceOpts.statuses,
          subject: practiceOpts.subject || undefined,
          topic: practiceOpts.topic || undefined,
          revisitOnly: practiceOpts.revisitOnly || undefined,
          pickMode: practiceOpts.pickMode || 'random',
        },
      });
      setShowPracticeSheet(false);
      navigation.navigate('PracticeInterface', { sessionId: session._id });
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Could not start practice from Wrong Book'
      );
    } finally {
      setPracticing(false);
    }
  };

  const applyStatus = async (nextStatus) => {
    if (!statusTarget || updatingStatus) return;
    if (statusTarget.status === nextStatus) {
      setStatusTarget(null);
      return;
    }
    setUpdatingStatus(true);
    try {
      await api.put(`/user/questions/saved/${statusTarget._id}`, { status: nextStatus });
      setItems((prev) =>
        prev.map((sq) =>
          sq._id === statusTarget._id ? { ...sq, status: nextStatus } : sq
        )
      );
      setStats((prev) => {
        const wasNeeds = statusTarget.status === 'needs-review';
        const nowNeeds = nextStatus === 'needs-review';
        let needsReview = prev.needsReview || 0;
        if (wasNeeds && !nowNeeds) needsReview = Math.max(0, needsReview - 1);
        if (!wasNeeds && nowNeeds) needsReview += 1;
        return { ...prev, needsReview };
      });
      setStatusTarget(null);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRemove = (item) => {
    const qId = item.question?._id;
    if (!qId) return;
    Alert.alert('Remove', 'Remove this question from Wrong Book?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/user/questions/unsave/${qId}`);
            setItems((prev) => prev.filter((sq) => sq._id !== item._id));
            setStats((prev) => ({
              ...prev,
              total: Math.max(0, (prev.total || 0) - 1),
              needsReview:
                item.status === 'needs-review'
                  ? Math.max(0, (prev.needsReview || 0) - 1)
                  : prev.needsReview,
              revisit:
                (item.wrongCount || 0) >= 2
                  ? Math.max(0, (prev.revisit || 0) - 1)
                  : prev.revisit,
            }));
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to remove');
          }
        },
      },
    ]);
  };

  const activeFilterCount = [
    filters.status,
    filters.subject,
    filters.topic,
    filters.revisitOnly,
  ].filter(Boolean).length;

  const practiceStatusSummary = practiceOpts.statuses
    .map((s) => statusLabel(s))
    .join(', ');
  const practicePickLabel =
    practiceOpts.pickMode === 'priority' ? 'most-wrong first' : 'random mix';
  const practiceScopeBits = [
    practiceOpts.subject || null,
    practiceOpts.topic || null,
    practiceOpts.revisitOnly ? 'wrong 2+ times' : null,
  ].filter(Boolean);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size >= MAX_EXPORT) {
        Alert.alert('Limit reached', `Max ${MAX_EXPORT} questions per export`);
        return prev;
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (next.size >= MAX_EXPORT) break;
        next.add(item._id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const fetchPickerItems = useCallback(async () => {
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({
        source: 'auto',
        page: '1',
        limit: '100',
        sortBy: 'lastWrongAt',
        sortOrder: 'desc',
      });
      if (pickerSearch.trim()) params.set('search', pickerSearch.trim());
      const res = await api.get(`/user/questions/saved?${params.toString()}`);
      setPickerItems(res.data.savedQuestions || []);
    } catch {
      setPickerItems([]);
    } finally {
      setPickerLoading(false);
    }
  }, [pickerSearch]);

  useEffect(() => {
    if (showPicker) fetchPickerItems();
  }, [showPicker, fetchPickerItems]);

  const handleExportPdf = async () => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    try {
      const res = await api.post('/user/questions/saved/batch', {
        ids: [...selectedIds],
      });
      const exportItems = res.data.savedQuestions || [];
      if (exportItems.length < selectedIds.size) {
        Alert.alert(
          'Partial export',
          `${exportItems.length} of ${selectedIds.size} questions included`
        );
      }
      if (exportItems.length === 0) {
        Alert.alert('Nothing to export', 'No valid Wrong Book questions found');
        return;
      }
      const html = buildWrongBookAnswerKeyHtml({ savedQuestions: exportItems });
      const fileName = `Wrong_Book_Answer_Key_${new Date().toISOString().slice(0, 10)}.pdf`;
      await exportWrongBookPdf(html, fileName);
    } catch (err) {
      Alert.alert(
        'Export failed',
        err.response?.data?.message || err.message || 'Could not generate PDF'
      );
    } finally {
      setExporting(false);
    }
  };

  const renderItem = ({ item }) => {
    const q = item.question;
    if (!q) return null;
    const wrongDate = formatWrongDate(item.lastWrongAt || item.savedAt);
    const badge = statusTone(item.status, colors);

    const isSelected = selectedIds.has(item._id);

    return (
      <View style={[styles.card, selectMode && isSelected && styles.cardSelected]}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            if (selectMode) {
              toggleSelect(item._id);
              return;
            }
            navigation.navigate('QuestionDetail', {
              questionId: q._id,
              savedQuestionId: item._id,
            });
          }}
        >
          <View style={styles.cardHeader}>
            {selectMode ? (
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? colors.text : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
            ) : null}
            <TouchableOpacity
              style={[styles.statusPill, { backgroundColor: badge.bg }]}
              onPress={() => setStatusTarget(item)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={[styles.statusPillText, { color: badge.fg }]}>
                {statusLabel(item.status)}
              </Text>
              <Ionicons name="chevron-down" size={12} color={badge.fg} />
            </TouchableOpacity>
            {(item.wrongCount || 0) > 0 && (
              <View style={styles.wrongPill}>
                <Text style={styles.wrongPillText}>Wrong ×{item.wrongCount}</Text>
              </View>
            )}
          </View>

          <Text style={styles.questionText} numberOfLines={4}>
            {q.questionText}
          </Text>

          <View style={styles.metaRow}>
            {q.subject ? <Text style={styles.metaText}>{q.subject}</Text> : null}
            {q.topic ? <Text style={styles.metaText}>· {q.topic}</Text> : null}
            {wrongDate ? <Text style={styles.metaText}>· {wrongDate}</Text> : null}
          </View>

          {item.lastWrongAnswer ? (
            <Text style={styles.wrongAnswer}>Your answer: {item.lastWrongAnswer}</Text>
          ) : null}
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.statusActionBtn]}
            onPress={() => setStatusTarget(item)}
          >
            <Ionicons name="swap-horizontal" size={16} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Change status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemove(item)}>
            <Ionicons name="trash-outline" size={16} color={colors.tones.red.fg} />
            <Text style={[styles.actionText, { color: colors.tones.red.fg }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Wrong Book</Text>
            <Text style={styles.headerSub}>Your mistakes, ready to drill</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setDraftFilters(filters);
              setShowFilters(true);
            }}
            style={styles.filterBtn}
          >
            <Ionicons name="filter" size={20} color={colors.text} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectMode((m) => !m)}
            style={styles.filterBtn}
            disabled={(stats.total || 0) === 0}
          >
            <Ionicons
              name={selectMode ? 'close-circle-outline' : 'checkbox-outline'}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {selectMode && (
          <View style={styles.selectBar}>
            <Text style={styles.selectBarText}>{selectedIds.size} selected</Text>
            <TouchableOpacity onPress={selectPage} style={styles.selectBarBtn}>
              <Text style={styles.selectBarBtnText}>Page</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearSelection} style={styles.selectBarBtn}>
              <Text style={styles.selectBarBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.selectBarBtn}>
              <Text style={styles.selectBarBtnText}>More</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleExportPdf}
              style={[styles.exportBtn, (exporting || selectedIds.size === 0) && styles.exportBtnDisabled]}
              disabled={exporting || selectedIds.size === 0}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.heroText} />
              ) : (
                <>
                  <Ionicons name="document-text" size={16} color={colors.heroText} />
                  <Text style={styles.exportBtnText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.tones.orange.fg }]}>{stats.needsReview || 0}</Text>
            <Text style={styles.statLabel}>Needs review</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.tones.red.fg }]}>{stats.revisit || 0}</Text>
            <Text style={styles.statLabel}>Revisit 2+</Text>
          </View>
        </View>

        <View style={styles.practiceCard}>
          <View style={styles.practiceCardText}>
            <Text style={styles.practiceCardTitle}>Drill your wrongs</Text>
            <Text style={styles.practiceCardSub}>
              {(stats.total || 0) > 0
                ? 'Pick status, subject, random or most-wrong — then start'
                : 'Complete an exam to fill Wrong Book'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.practiceBtn,
              ((stats.total || 0) === 0 || practicing) && styles.practiceBtnDisabled,
            ]}
            onPress={openPracticeSheet}
            disabled={(stats.total || 0) === 0 || practicing}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={16} color={colors.heroText} />
            <Text style={styles.practiceBtnText}>Practice</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
            }
            onEndReached={() => {
              if (hasMore && !loadingMore && !loading) {
                fetchList({ pageNum: page + 1, append: true });
              }
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              <View style={styles.listFooter}>
                {loadingMore ? (
                  <ActivityIndicator style={{ marginVertical: 8 }} color={colors.text} />
                ) : null}
                {!loading && items.length > 0 ? (
                  <Text style={styles.listFooterText}>
                    Showing {items.length}
                    {stats.total ? ` of ${stats.total}` : ''}
                    {hasMore ? ' · scroll for more' : ''}
                  </Text>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="book-outline" size={56} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Wrong Book is empty</Text>
                <Text style={styles.emptySub}>
                  Complete an exam — wrong answers land here automatically.
                </Text>
              </View>
            }
          />
        )}

        {/* Status sheet */}
        <Modal
          visible={!!statusTarget}
          animationType="slide"
          transparent
          onRequestClose={() => setStatusTarget(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setStatusTarget(null)} />
            <View style={styles.modalSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.modalTitle}>Update status</Text>
              <Text style={styles.sheetHint} numberOfLines={2}>
                {statusTarget?.question?.questionText || 'Choose how this question is tagged'}
              </Text>
              {STATUS_CHOICES.map((opt) => {
                const tone = colors.tones[opt.tone];
                const color = tone.fg;
                const selected = statusTarget?.status === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.statusOption,
                      selected && { borderColor: color, backgroundColor: tone.bg },
                    ]}
                    onPress={() => applyStatus(opt.value)}
                    disabled={updatingStatus}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.statusIconWrap, { backgroundColor: tone.bg }]}>
                      <Ionicons name={opt.icon} size={20} color={color} />
                    </View>
                    <View style={styles.statusOptionText}>
                      <Text style={[styles.statusOptionLabel, { color: colors.text }]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.statusOptionHint}>{opt.hint}</Text>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={color} />
                    ) : (
                      <View style={styles.statusRadio} />
                    )}
                  </TouchableOpacity>
                );
              })}
              {updatingStatus && (
                <ActivityIndicator style={{ marginTop: 12 }} color={colors.text} />
              )}
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setStatusTarget(null)}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Practice sheet */}
        <Modal
          visible={showPracticeSheet}
          animationType="slide"
          transparent
          onRequestClose={() => setShowPracticeSheet(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => !practicing && setShowPracticeSheet(false)}
            />
            <View style={[styles.modalSheet, styles.practiceModalSheet]}>
              <View style={styles.sheetHandle} />
              <View style={styles.practiceSheetHeader}>
                <View style={[styles.practiceIconBadge, { backgroundColor: colors.tones.orange.bg }]}>
                  <Ionicons name="flash" size={22} color={colors.tones.orange.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Build your drill</Text>
                  <Text style={styles.sheetHint}>
                    Choose which Wrong Book questions to include
                  </Text>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.filterLabel}>Include status</Text>
                <Text style={styles.sectionMicroHint}>
                  Tap to toggle. Mastered is off by default.
                </Text>
                <View style={styles.chipWrap}>
                  {PRACTICE_STATUS_OPTIONS.map((opt) => {
                    const active = practiceOpts.statuses.includes(opt.value);
                    const tone = colors.tones[opt.tone];
                    const tint = tone.fg;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.statusToggleChip,
                          active && {
                            backgroundColor: tone.bg,
                            borderColor: tint,
                          },
                        ]}
                        onPress={() => togglePracticeStatus(opt.value)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={active ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={active ? tint : colors.textSecondary}
                        />
                        <View>
                          <Text
                            style={[
                              styles.statusToggleLabel,
                              active && { color: tint },
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <Text style={styles.statusToggleHint}>{opt.hint}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.filterLabel}>Subject & topic</Text>
                <View style={styles.chipWrap}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      !practiceOpts.subject && styles.chipActive,
                    ]}
                    onPress={() =>
                      setPracticeOpts((p) => ({ ...p, subject: '', topic: '' }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        !practiceOpts.subject && styles.chipTextActive,
                      ]}
                    >
                      Any subject
                    </Text>
                  </TouchableOpacity>
                  {availableSubjects.map((subj) => {
                    const active = practiceOpts.subject === subj;
                    return (
                      <TouchableOpacity
                        key={subj}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() =>
                          setPracticeOpts((p) => ({
                            ...p,
                            subject: subj,
                            topic: '',
                          }))
                        }
                      >
                        <Text
                          style={[styles.chipText, active && styles.chipTextActive]}
                        >
                          {subj}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {practiceOpts.subject && practiceTopics.length > 0 ? (
                  <>
                    <Text style={[styles.filterLabel, { marginTop: 4 }]}>Topic</Text>
                    <View style={styles.chipWrap}>
                      <TouchableOpacity
                        style={[
                          styles.chip,
                          !practiceOpts.topic && styles.chipActive,
                        ]}
                        onPress={() =>
                          setPracticeOpts((p) => ({ ...p, topic: '' }))
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            !practiceOpts.topic && styles.chipTextActive,
                          ]}
                        >
                          Any topic
                        </Text>
                      </TouchableOpacity>
                      {practiceTopics.map((t) => {
                        const active = practiceOpts.topic === t;
                        return (
                          <TouchableOpacity
                            key={t}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() =>
                              setPracticeOpts((p) => ({ ...p, topic: t }))
                            }
                          >
                            <Text
                              style={[
                                styles.chipText,
                                active && styles.chipTextActive,
                              ]}
                            >
                              {t}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                <Text style={styles.filterLabel}>Extra focus</Text>
                <TouchableOpacity
                  style={[
                    styles.focusRow,
                    practiceOpts.revisitOnly && styles.focusRowActive,
                  ]}
                  onPress={() =>
                    setPracticeOpts((p) => ({
                      ...p,
                      revisitOnly: !p.revisitOnly,
                    }))
                  }
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.focusRowTitle}>Wrong 2+ times only</Text>
                    <Text style={styles.focusRowHint}>
                      Skip one-offs — drill repeats
                    </Text>
                  </View>
                  <Ionicons
                    name={practiceOpts.revisitOnly ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={
                      practiceOpts.revisitOnly
                        ? colors.text
                        : colors.textSecondary
                    }
                  />
                </TouchableOpacity>

                <Text style={styles.filterLabel}>How to pick</Text>
                <View style={styles.modeRow}>
                  {[
                    {
                      value: 'random',
                      label: 'Random',
                      icon: 'shuffle',
                      hint: 'Mixed order',
                    },
                    {
                      value: 'priority',
                      label: 'Most wrong',
                      icon: 'trending-up',
                      hint: 'Highest × first',
                    },
                  ].map((mode) => {
                    const active = practiceOpts.pickMode === mode.value;
                    return (
                      <TouchableOpacity
                        key={mode.value}
                        style={[styles.modeCard, active && styles.modeCardActive]}
                        onPress={() =>
                          setPracticeOpts((p) => ({ ...p, pickMode: mode.value }))
                        }
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={mode.icon}
                          size={18}
                          color={active ? colors.heroText : colors.text}
                        />
                        <Text
                          style={[
                            styles.modeCardLabel,
                            active && styles.modeCardLabelActive,
                          ]}
                        >
                          {mode.label}
                        </Text>
                        <Text
                          style={[
                            styles.modeCardHint,
                            active && styles.modeCardHintActive,
                          ]}
                        >
                          {mode.hint}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.filterLabel}>How many?</Text>
                <View style={styles.countRow}>
                  {PRACTICE_COUNTS.map((n) => {
                    const active = practiceCount === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[styles.countChip, active && styles.countChipActive]}
                        onPress={() => setPracticeCount(n)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.countChipText,
                            active && styles.countChipTextActive,
                          ]}
                        >
                          {n}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.practiceSummary}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={colors.text}
                  />
                  <Text style={styles.practiceSummaryText}>
                    {practiceCount} Q · {practiceStatusSummary} · {practicePickLabel}
                    {practiceScopeBits.length
                      ? ` · ${practiceScopeBits.join(' · ')}`
                      : ''}
                  </Text>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.startPracticeBtn, practicing && styles.practiceBtnDisabled]}
                onPress={handlePractice}
                disabled={practicing}
                activeOpacity={0.85}
              >
                {practicing ? (
                  <ActivityIndicator color={colors.heroText} />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color={colors.heroText} />
                    <Text style={styles.startPracticeBtnText}>
                      Start {practiceCount}-question drill
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetCancel}
                onPress={() => setShowPracticeSheet(false)}
                disabled={practicing}
              >
                <Text style={styles.sheetCancelText}>Not now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Picker sheet for PDF export */}
        <Modal
          visible={showPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowPicker(false)}
            />
            <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.modalTitle}>Choose questions</Text>
              <Text style={styles.sheetHint}>Max {MAX_EXPORT} for answer-key PDF</Text>
              <TextInput
                style={styles.pickerSearch}
                placeholder="Search questions…"
                placeholderTextColor={colors.textSecondary}
                value={pickerSearch}
                onChangeText={setPickerSearch}
                onSubmitEditing={fetchPickerItems}
                returnKeyType="search"
              />
              {pickerLoading ? (
                <ActivityIndicator style={{ marginVertical: 24 }} color={colors.text} />
              ) : (
                <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                  {pickerItems.map((sq) => {
                    const q = sq.question;
                    if (!q) return null;
                    const checked = selectedIds.has(sq._id);
                    return (
                      <TouchableOpacity
                        key={sq._id}
                        style={[styles.pickerRow, checked && styles.pickerRowActive]}
                        onPress={() => toggleSelect(sq._id)}
                      >
                        <Ionicons
                          name={checked ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={checked ? colors.text : colors.textSecondary}
                        />
                        <Text style={styles.pickerRowText} numberOfLines={2}>
                          {q.questionText}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowPicker(false)}>
                <Text style={styles.sheetCancelText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Filters sheet */}
        <Modal
          visible={showFilters}
          animationType="slide"
          transparent
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.chipWrap}>
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value || 'all'}
                      style={[styles.chip, draftFilters.status === opt.value && styles.chipActive]}
                      onPress={() => setDraftFilters((f) => ({ ...f, status: opt.value }))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          draftFilters.status === opt.value && styles.chipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.filterLabel}>Subject</Text>
                <View style={styles.chipWrap}>
                  <TouchableOpacity
                    style={[styles.chip, !draftFilters.subject && styles.chipActive]}
                    onPress={() => setDraftFilters((f) => ({ ...f, subject: '', topic: '' }))}
                  >
                    <Text style={[styles.chipText, !draftFilters.subject && styles.chipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {availableSubjects.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, draftFilters.subject === s && styles.chipActive]}
                      onPress={() => setDraftFilters((f) => ({ ...f, subject: s, topic: '' }))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          draftFilters.subject === s && styles.chipTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {draftFilters.subject ? (
                  <>
                    <Text style={styles.filterLabel}>Topic</Text>
                    <View style={styles.chipWrap}>
                      <TouchableOpacity
                        style={[styles.chip, !draftFilters.topic && styles.chipActive]}
                        onPress={() => setDraftFilters((f) => ({ ...f, topic: '' }))}
                      >
                        <Text
                          style={[styles.chipText, !draftFilters.topic && styles.chipTextActive]}
                        >
                          All
                        </Text>
                      </TouchableOpacity>
                      {availableTopics.map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.chip, draftFilters.topic === t && styles.chipActive]}
                          onPress={() => setDraftFilters((f) => ({ ...f, topic: t }))}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              draftFilters.topic === t && styles.chipTextActive,
                            ]}
                          >
                            {t}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : null}

                <Text style={styles.filterLabel}>Revisit</Text>
                <View style={styles.chipWrap}>
                  <TouchableOpacity
                    style={[styles.chip, !draftFilters.revisitOnly && styles.chipActive]}
                    onPress={() => setDraftFilters((f) => ({ ...f, revisitOnly: '' }))}
                  >
                    <Text
                      style={[styles.chipText, !draftFilters.revisitOnly && styles.chipTextActive]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      draftFilters.revisitOnly === 'true' && styles.chipActive,
                    ]}
                    onPress={() => setDraftFilters((f) => ({ ...f, revisitOnly: 'true' }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draftFilters.revisitOnly === 'true' && styles.chipTextActive,
                      ]}
                    >
                      Wrong 2+ times
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() =>
                    setDraftFilters({ status: '', subject: '', topic: '', revisitOnly: '' })
                  }
                >
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => {
                    setFilters(draftFilters);
                    setShowFilters(false);
                    fetchList({ pageNum: 1, filterOverride: draftFilters });
                  }}
                >
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
      gap: 8,
    },
    backBtn: { padding: 6 },
    headerTextWrap: { flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
    headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    filterBtn: { padding: 8 },
    filterBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.hero,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: { color: colors.heroText, fontSize: 10, fontWeight: '700' },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      alignItems: 'center',
    },
    statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    practiceCard: {
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      padding: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    practiceCardText: { flex: 1 },
    practiceCardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    practiceCardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
    practiceBtn: {
      backgroundColor: colors.hero,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    practiceBtnDisabled: { opacity: 0.5 },
    practiceBtnText: { color: colors.heroText, fontSize: 13, fontWeight: '700' },
    listContent: { padding: 16, paddingBottom: 40, flexGrow: 1 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    cardSelected: {
      borderColor: colors.hero,
      borderWidth: 1.5,
      backgroundColor: colors.surfaceMuted,
    },
    selectBar: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 10,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
    },
    selectBarText: { fontSize: 13, fontWeight: '700', color: colors.text, marginRight: 4 },
    selectBarBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    selectBarBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.hero,
    },
    exportBtnDisabled: { opacity: 0.5 },
    exportBtnText: { color: colors.heroText, fontSize: 12, fontWeight: '700' },
    pickerSearch: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
      color: colors.text,
      backgroundColor: colors.card,
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      backgroundColor: colors.card,
    },
    pickerRowActive: {
      borderColor: colors.hero,
      backgroundColor: colors.surfaceMuted,
    },
    pickerRowText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
    cardHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    wrongPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.tones.red.bg,
    },
    wrongPillText: { fontSize: 10, fontWeight: '700', color: colors.tones.red.fg },
    questionText: { fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 21 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 4 },
    metaText: { fontSize: 11, color: colors.textSecondary },
    wrongAnswer: { fontSize: 12, color: colors.tones.red.fg, marginTop: 6, fontWeight: '600' },
    cardActions: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusActionBtn: { flex: 1 },
    actionText: { fontSize: 12, fontWeight: '600' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 14 },
    emptySub: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 18,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 28,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 14,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
    sheetHint: { fontSize: 13, color: colors.textSecondary, marginBottom: 14, lineHeight: 18 },
    statusOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      backgroundColor: colors.card,
    },
    statusIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusOptionText: { flex: 1 },
    statusOptionLabel: { fontSize: 15, fontWeight: '700' },
    statusOptionHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    statusRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    sheetCancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
    sheetCancelText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    practiceSheetHeader: { flexDirection: 'row', gap: 12, marginBottom: 8, alignItems: 'flex-start' },
    practiceModalSheet: { maxHeight: '92%' },
    practiceIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionMicroHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: -4,
      marginBottom: 8,
    },
    statusToggleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      minWidth: '47%',
      flexGrow: 1,
    },
    statusToggleLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
    statusToggleHint: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    focusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 4,
    },
    focusRowActive: {
      borderColor: colors.hero,
      backgroundColor: colors.surfaceMuted,
    },
    focusRowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    focusRowHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    modeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
    modeCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 4,
    },
    modeCardActive: {
      backgroundColor: colors.hero,
      borderColor: colors.hero,
    },
    modeCardLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    modeCardLabelActive: { color: colors.heroText },
    modeCardHint: { fontSize: 11, color: colors.textSecondary },
    modeCardHintActive: { color: colors.heroTextSecondary },
    listFooter: { paddingVertical: 16, alignItems: 'center' },
    listFooterText: { fontSize: 12, color: colors.textSecondary },
    countRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    countChip: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
    },
    countChipActive: { backgroundColor: colors.hero, borderColor: colors.hero },
    countChipMuted: { opacity: 0.55 },
    countChipText: { fontSize: 16, fontWeight: '700', color: colors.text },
    countChipTextActive: { color: colors.heroText },
    practiceSummary: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
      marginBottom: 14,
    },
    practiceSummaryText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
    startPracticeBtn: {
      backgroundColor: colors.hero,
      borderRadius: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    startPracticeBtnText: { color: colors.heroText, fontSize: 15, fontWeight: '700' },
    filterLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 12,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipActive: { backgroundColor: colors.hero, borderColor: colors.hero },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: colors.heroText },
    modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
    clearBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    clearBtnText: { fontWeight: '600', color: colors.text },
    applyBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.hero,
      alignItems: 'center',
    },
    applyBtnText: { fontWeight: '700', color: colors.heroText },
  });
