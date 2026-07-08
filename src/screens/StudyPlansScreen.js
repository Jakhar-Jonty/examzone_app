import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { studyPlanService } from '../services/studyPlanService';

const STATUS_CYCLE = ['not-started', 'in-progress', 'completed'];
const STATUS_LABEL = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
};
const STATUS_COLOR = {
  'not-started': '#9ca3af',
  'in-progress': '#3b82f6',
  completed: '#16a34a',
};

function ProgressBar({ value, colors }) {
  return (
    <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
      <View style={{ height: '100%', width: `${Math.min(100, value)}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
    </View>
  );
}

function PlanCard({ plan, colors, onDelete, onTopicToggle, onMilestoneComplete }) {
  const [expanded, setExpanded] = useState(false);
  const styles = cardStyles(colors);

  const totalTopics = (plan.subjects || []).reduce((n, s) => n + (s.topics?.length || 0), 0);
  const completedTopics = (plan.subjects || []).reduce(
    (n, s) => n + (s.topics || []).filter((t) => t.status === 'completed').length,
    0,
  );
  const progress = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const cycleTopicStatus = (si, ti, current) => {
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    onTopicToggle(plan._id, si, ti, next);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{plan.title}</Text>
          <Text style={styles.meta}>{fmt(plan.startDate)} → {fmt(plan.endDate)}</Text>
          {plan.description ? <Text style={styles.desc} numberOfLines={expanded ? undefined : 1}>{plan.description}</Text> : null}
          <ProgressBar value={progress} colors={colors} />
          <Text style={styles.progressText}>{progress}% · {completedTopics}/{totalTopics} topics</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => onDelete(plan._id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {(plan.subjects || []).map((subject, si) => (
            <View key={`${subject.subject}-${si}`} style={styles.subjectBlock}>
              <Text style={styles.subjectTitle}>{subject.subject}</Text>
              {(subject.topics || []).map((topic, ti) => (
                <TouchableOpacity
                  key={`${topic.name}-${ti}`}
                  style={styles.topicRow}
                  onPress={() => cycleTopicStatus(si, ti, topic.status)}
                >
                  <Ionicons
                    name={topic.status === 'completed' ? 'checkmark-circle' : topic.status === 'in-progress' ? 'ellipse' : 'ellipse-outline'}
                    size={18}
                    color={STATUS_COLOR[topic.status] || STATUS_COLOR['not-started']}
                  />
                  <Text style={styles.topicName}>{topic.name}</Text>
                  <Text style={[styles.topicStatus, { color: STATUS_COLOR[topic.status] }]}>
                    {STATUS_LABEL[topic.status] || topic.status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {(plan.milestones || []).length > 0 && (
            <View style={styles.milestoneBlock}>
              <Text style={styles.sectionLabel}>Milestones</Text>
              {plan.milestones.map((m) => (
                <TouchableOpacity
                  key={m._id}
                  style={styles.milestoneRow}
                  onPress={() => !m.isCompleted && onMilestoneComplete(plan._id, m._id)}
                  disabled={m.isCompleted}
                >
                  <Ionicons
                    name={m.isCompleted ? 'checkmark-circle' : 'flag-outline'}
                    size={18}
                    color={m.isCompleted ? colors.success : colors.textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.milestoneTitle, m.isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                      {m.title}
                    </Text>
                    <Text style={styles.milestoneDate}>{fmt(m.targetDate)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function StudyPlansScreen({ navigation }) {
  const { colors } = useTheme();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { plans: list } = await studyPlanService.list();
      setPlans(list || []);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const handleDelete = (id) => {
    Alert.alert('Delete Plan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await studyPlanService.delete(id);
            setPlans((prev) => prev.filter((p) => p._id !== id));
          } catch {
            Alert.alert('Error', 'Could not delete plan');
          }
        },
      },
    ]);
  };

  const handleTopicToggle = async (planId, si, ti, status) => {
    try {
      const { plan } = await studyPlanService.updateTopicStatus(planId, { subjectIndex: si, topicIndex: ti, status });
      setPlans((prev) => prev.map((p) => (p._id === planId ? plan : p)));
    } catch {
      Alert.alert('Error', 'Could not update topic');
    }
  };

  const handleMilestoneComplete = async (planId, milestoneId) => {
    try {
      const { plan } = await studyPlanService.completeMilestone(planId, milestoneId);
      setPlans((prev) => prev.map((p) => (p._id === planId ? plan : p)));
    } catch {
      Alert.alert('Error', 'Could not update milestone');
    }
  };

  const styles = makeStyles(colors);

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Plans</Text>
        <TouchableOpacity onPress={() => navigation.navigate('StudyPlanCreate')} hitSlop={12}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => String(item._id)}
          renderItem={({ item }) => (
            <PlanCard
              plan={item}
              colors={colors}
              onDelete={handleDelete}
              onTopicToggle={handleTopicToggle}
              onMilestoneComplete={handleMilestoneComplete}
            />
          )}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No study plans yet</Text>
              <Text style={styles.emptyDesc}>Create a plan to track subjects, topics, and milestones.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('StudyPlanCreate')}>
                <Text style={styles.emptyBtnText}>Create Plan</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
    emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6 },
    emptyBtn: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
    emptyBtnText: { color: '#fff', fontWeight: '700' },
  });

const cardStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      overflow: 'hidden',
    },
    cardHeader: { flexDirection: 'row', padding: 16, gap: 12 },
    title: { fontSize: 16, fontWeight: '800', color: colors.text },
    meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    desc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    progressText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    headerActions: { alignItems: 'flex-end', gap: 12 },
    body: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
    subjectBlock: { marginBottom: 16 },
    subjectTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
    topicRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    topicName: { flex: 1, fontSize: 14, color: colors.text },
    topicStatus: { fontSize: 11, fontWeight: '600' },
    milestoneBlock: { marginTop: 4 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
    milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    milestoneTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    milestoneDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  });
