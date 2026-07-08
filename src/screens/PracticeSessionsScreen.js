import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { practiceSessionService } from '../services/practiceSessionService';

const SESSION_TYPES = [
  { value: 'random', label: 'Random', icon: 'shuffle' },
  { value: 'subject-wise', label: 'Subject Wise', icon: 'book-outline' },
  { value: 'topic-wise', label: 'Topic Wise', icon: 'locate-outline' },
  { value: 'difficulty-based', label: 'By Difficulty', icon: 'bar-chart-outline' },
  { value: 'weak-areas', label: 'Weak Areas', icon: 'flash-outline' },
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function ProgressBar({ value, colors }) {
  return (
    <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
      <View style={{ height: '100%', width: `${Math.min(100, value)}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
    </View>
  );
}

function CreateSessionModal({ visible, onClose, onCreated, colors }) {
  const [form, setForm] = useState({
    sessionType: 'random',
    categoryId: '',
    subject: '',
    topics: [],
    difficulty: [],
    questionCount: '20',
  });
  const [categories, setCategories] = useState([]);
  const [subjectsAndTopics, setSubjectsAndTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    api.get('/categories').then((r) => setCategories(r.data.categories || [])).catch(() => {});
  }, [visible]);

  useEffect(() => {
    if (!form.categoryId) {
      setSubjectsAndTopics([]);
      return;
    }
    setLoadingTopics(true);
    api.get(`/user/subjects-topics?category=${encodeURIComponent(form.categoryId)}`)
      .then((r) => setSubjectsAndTopics(r.data?.subjectsAndTopics || []))
      .catch(() => setSubjectsAndTopics([]))
      .finally(() => setLoadingTopics(false));
  }, [form.categoryId]);

  const toggleDifficulty = (d) =>
    setForm((f) => ({
      ...f,
      difficulty: f.difficulty.includes(d) ? f.difficulty.filter((x) => x !== d) : [...f.difficulty, d],
    }));

  const toggleTopic = (topic) =>
    setForm((f) => ({
      ...f,
      topics: f.topics.includes(topic) ? f.topics.filter((t) => t !== topic) : [...f.topics, topic],
    }));

  const validate = () => {
    if (form.sessionType === 'subject-wise' && !form.subject) {
      Alert.alert('Required', 'Select a subject');
      return false;
    }
    if (form.sessionType === 'topic-wise' && form.topics.length === 0) {
      Alert.alert('Required', 'Select at least one topic');
      return false;
    }
    if (form.sessionType === 'difficulty-based' && form.difficulty.length === 0) {
      Alert.alert('Required', 'Select at least one difficulty');
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const filters = {};
      if (form.categoryId) filters.category = form.categoryId;
      if (form.subject) filters.subject = form.subject;
      if (form.topics.length) filters.topics = form.topics;
      if (form.difficulty.length) filters.difficulty = form.difficulty;

      const { session } = await practiceSessionService.create({
        sessionType: form.sessionType,
        filters,
        questionCount: Number(form.questionCount) || 20,
      });
      onCreated(session);
      onClose();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create session');
    } finally {
      setSaving(false);
    }
  };

  const showSubject = ['subject-wise', 'topic-wise'].includes(form.sessionType);
  const showTopics = form.sessionType === 'topic-wise';
  const showDifficulty = ['difficulty-based', 'random'].includes(form.sessionType);
  const styles = modalStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>New Practice Session</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Session Type</Text>
            <View style={styles.typeGrid}>
              {SESSION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeCard, form.sessionType === t.value && styles.typeCardActive]}
                  onPress={() => setForm((f) => ({ ...f, sessionType: t.value }))}
                >
                  <Ionicons name={t.icon} size={20} color={form.sessionType === t.value ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.typeLabel, form.sessionType === t.value && { color: colors.primary }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Category (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.chip, !form.categoryId && styles.chipActive]}
                onPress={() => setForm((f) => ({ ...f, categoryId: '', subject: '', topics: [] }))}
              >
                <Text style={[styles.chipText, !form.categoryId && styles.chipTextActive]}>Any</Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c._id}
                  style={[styles.chip, form.categoryId === c._id && styles.chipActive]}
                  onPress={() => setForm((f) => ({ ...f, categoryId: c._id, subject: '', topics: [] }))}
                >
                  <Text style={[styles.chipText, form.categoryId === c._id && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {showSubject && form.categoryId ? (
              <>
                <Text style={styles.label}>Subject</Text>
                {loadingTopics ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
                ) : (
                  <View style={styles.chipWrap}>
                    {subjectsAndTopics.map((s) => (
                      <TouchableOpacity
                        key={s.subject}
                        style={[styles.chip, form.subject === s.subject && styles.chipActive]}
                        onPress={() => setForm((f) => ({ ...f, subject: s.subject, topics: [] }))}
                      >
                        <Text style={[styles.chipText, form.subject === s.subject && styles.chipTextActive]}>{s.subject}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : null}

            {showTopics && form.subject ? (
              <>
                <Text style={styles.label}>Topics</Text>
                {(() => {
                  const subj = subjectsAndTopics.find((s) => s.subject === form.subject);
                  const topics = subj?.topics || [];
                  return (
                    <View style={styles.chipWrap}>
                      {topics.map((topic) => (
                        <TouchableOpacity
                          key={topic}
                          style={[styles.chip, form.topics.includes(topic) && styles.chipActive]}
                          onPress={() => toggleTopic(topic)}
                        >
                          <Text style={[styles.chipText, form.topics.includes(topic) && styles.chipTextActive]}>{topic}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })()}
              </>
            ) : null}

            {showDifficulty ? (
              <>
                <Text style={styles.label}>Difficulty</Text>
                <View style={styles.chipWrap}>
                  {DIFFICULTIES.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.chip, form.difficulty.includes(d) && styles.chipActive]}
                      onPress={() => toggleDifficulty(d)}
                    >
                      <Text style={[styles.chipText, form.difficulty.includes(d) && styles.chipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.label}>Number of Questions</Text>
            <TextInput
              style={styles.input}
              value={form.questionCount}
              onChangeText={(v) => setForm((f) => ({ ...f, questionCount: v }))}
              keyboardType="number-pad"
              placeholder="20"
              placeholderTextColor={colors.textSecondary}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.startBtn} onPress={submit} disabled={saving}>
              <Text style={styles.startText}>{saving ? 'Starting...' : 'Start Session'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PracticeSessionsScreen({ navigation }) {
  const { colors } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        practiceSessionService.list({ limit: 20 }),
        practiceSessionService.stats().catch(() => ({ stats: null })),
      ]);
      setSessions(listRes.sessions || []);
      setStats(statsRes.stats || null);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startSession = (session) => {
    navigation.navigate('PracticeInterface', {
      sessionId: session._id,
      sessionType: session.sessionType,
    });
  };

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const styles = makeStyles(colors);

  const renderItem = ({ item: s }) => {
    const typeMeta = SESSION_TYPES.find((t) => t.value === s.sessionType);
    return (
      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <Ionicons name={typeMeta?.icon || 'flash-outline'} size={22} color={colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{typeMeta?.label || s.sessionType}</Text>
              <Text style={styles.cardMeta}>{s.totalQuestions} questions · {fmt(s.createdAt)}</Text>
            </View>
            {s.isCompleted ? (
              <Text style={styles.accuracy}>{s.accuracy}%</Text>
            ) : (
              <TouchableOpacity style={styles.resumeBtn} onPress={() => startSession(s)}>
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.resumeText}>Resume</Text>
              </TouchableOpacity>
            )}
          </View>
          {s.isCompleted && (
            <>
              <View style={styles.statsRow}>
                <Text style={styles.statGreen}>✓ {s.correctAnswers}</Text>
                <Text style={styles.statRed}>✗ {s.incorrectAnswers}</Text>
                <Text style={styles.statGray}>{s.skipped || 0} skipped</Text>
              </View>
              <ProgressBar value={s.accuracy || 0} colors={colors} />
            </>
          )}
          <View style={[styles.badge, s.isCompleted ? styles.badgeDone : styles.badgeProgress]}>
            <Text style={[styles.badgeText, s.isCompleted ? styles.badgeTextDone : styles.badgeTextProgress]}>
              {s.isCompleted ? 'Done' : 'In Progress'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Practice</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} hitSlop={12}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {stats && stats.totalSessions > 0 && (
        <View style={styles.statsGrid}>
          {[
            { label: 'Sessions', value: stats.totalSessions },
            { label: 'Questions', value: stats.totalQuestions },
            { label: 'Correct', value: stats.totalCorrect },
            { label: 'Accuracy', value: `${stats.avgAccuracy}%` },
          ].map(({ label, value }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flash-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No practice sessions yet</Text>
              <Text style={styles.emptyDesc}>Start a focused drill on weak areas or specific topics.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={styles.emptyBtnText}>Start Practice</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <CreateSessionModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={startSession}
        colors={colors}
      />
    </ScreenWrapper>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    statValue: { fontSize: 16, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      gap: 12,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    accuracy: { fontSize: 20, fontWeight: '800', color: colors.success },
    resumeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    resumeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    statsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    statGreen: { fontSize: 12, color: colors.success, fontWeight: '600' },
    statRed: { fontSize: 12, color: colors.error, fontWeight: '600' },
    statGray: { fontSize: 12, color: colors.textSecondary },
    badge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeDone: { backgroundColor: colors.success + '18' },
    badgeProgress: { backgroundColor: '#fef3c7' },
    badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    badgeTextDone: { color: colors.success },
    badgeTextProgress: { color: '#d97706' },
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
    emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6 },
    emptyBtn: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
    emptyBtnText: { color: '#fff', fontWeight: '700' },
  });

const modalStyles = (colors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    body: { padding: 16, maxHeight: 480 },
    label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8, marginTop: 12 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeCard: {
      width: '47%',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: 6,
    },
    typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
    typeLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginRight: 8,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
    chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    chipTextActive: { color: colors.primary, fontWeight: '700' },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    cancelText: { fontWeight: '600', color: colors.text },
    startBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
    startText: { fontWeight: '700', color: '#fff' },
  });
