import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { studyPlanService } from '../services/studyPlanService';

const STEPS = ['Basics', 'Curriculum', 'Milestones', 'Review'];

function topicKey(subject, name) {
  return `${subject}::${name}`;
}

function buildSubjectsPayload(selectedTopics) {
  const bySubject = {};
  selectedTopics.forEach(({ subject, name }) => {
    if (!bySubject[subject]) bySubject[subject] = { subject, topics: [] };
    bySubject[subject].topics.push({ name, status: 'not-started' });
  });
  return Object.values(bySubject);
}

export default function StudyPlanCreateScreen({ navigation }) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subjectsAndTopics, setSubjectsAndTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    studyHoursPerDay: '4',
    categoryId: '',
  });

  const [selectedTopicKeys, setSelectedTopicKeys] = useState(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [manualSubject, setManualSubject] = useState('');
  const [manualTopic, setManualTopic] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [milestoneDraft, setMilestoneDraft] = useState({ title: '', targetDate: '' });

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

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

  const selectedTopics = useMemo(
    () => [...selectedTopicKeys].map((key) => {
      const [subject, name] = key.split('::');
      return { subject, name };
    }),
    [selectedTopicKeys],
  );

  const toggleTopic = (subject, name) => {
    const key = topicKey(subject, name);
    setSelectedTopicKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addManualTopic = () => {
    const subject = manualSubject.trim();
    const name = manualTopic.trim();
    if (!subject || !name) {
      Alert.alert('Required', 'Enter subject and topic name');
      return;
    }
    const key = topicKey(subject, name);
    if (selectedTopicKeys.has(key)) {
      Alert.alert('Duplicate', 'Topic already added');
      return;
    }
    setSelectedTopicKeys((prev) => new Set(prev).add(key));
    setManualTopic('');
  };

  const addMilestone = () => {
    const title = milestoneDraft.title.trim();
    const targetDate = milestoneDraft.targetDate;
    if (!title || !targetDate) {
      Alert.alert('Required', 'Milestone needs a title and date');
      return;
    }
    setMilestones((prev) => [...prev, { title, targetDate }]);
    setMilestoneDraft({ title: '', targetDate: '' });
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.title.trim()) {
        Alert.alert('Required', 'Title is required');
        return false;
      }
      if (!form.endDate) {
        Alert.alert('Required', 'End date is required');
        return false;
      }
      if (new Date(form.endDate) <= new Date(form.startDate)) {
        Alert.alert('Invalid', 'End date must be after start date');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        dailySchedule: { studyHoursPerDay: Number(form.studyHoursPerDay) || 4 },
        subjects: buildSubjectsPayload(selectedTopics),
        milestones: milestones.map((m) => ({ title: m.title, targetDate: m.targetDate })),
      };
      if (form.categoryId) payload.targetExam = { category: form.categoryId };

      await studyPlanService.create(payload);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  const styles = makeStyles(colors);

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step > 1 ? setStep((s) => s - 1) : navigation.goBack())}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>New Study Plan</Text>
          <Text style={styles.headerSub}>Step {step} of {STEPS.length} — {STEPS[step - 1]}</Text>
        </View>
      </View>

      <View style={styles.stepRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.stepDot,
              i + 1 === step && styles.stepDotActive,
              i + 1 < step && styles.stepDotDone,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder="e.g. SSC CGL 2025 Prep"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="What are you preparing for?"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Text style={styles.label}>Target Exam (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.chip, !form.categoryId && styles.chipActive]}
                onPress={() => setForm((f) => ({ ...f, categoryId: '' }))}
              >
                <Text style={[styles.chipText, !form.categoryId && styles.chipTextActive]}>None</Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c._id}
                  style={[styles.chip, form.categoryId === c._id && styles.chipActive]}
                  onPress={() => setForm((f) => ({ ...f, categoryId: c._id }))}
                >
                  <Text style={[styles.chipText, form.categoryId === c._id && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>Start Date</Text>
            <TextInput style={styles.input} value={form.startDate} onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />
            <Text style={styles.label}>End Date *</Text>
            <TextInput style={styles.input} value={form.endDate} onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />
            <Text style={styles.label}>Study Hours / Day</Text>
            <TextInput style={styles.input} value={form.studyHoursPerDay} onChangeText={(v) => setForm((f) => ({ ...f, studyHoursPerDay: v }))} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
          </>
        )}

        {step === 2 && (
          <>
            {form.categoryId ? (
              loadingTopics ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
              ) : (
                subjectsAndTopics.map((s) => (
                  <View key={s.subject} style={styles.subjectBlock}>
                    <TouchableOpacity
                      style={styles.subjectHeader}
                      onPress={() => setExpandedSubjects((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.subject)) next.delete(s.subject);
                        else next.add(s.subject);
                        return next;
                      })}
                    >
                      <Text style={styles.subjectTitle}>{s.subject}</Text>
                      <Ionicons name={expandedSubjects.has(s.subject) ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {expandedSubjects.has(s.subject) && (s.topics || []).map((topic) => {
                      const key = topicKey(s.subject, topic);
                      const selected = selectedTopicKeys.has(key);
                      return (
                        <TouchableOpacity key={topic} style={styles.topicRow} onPress={() => toggleTopic(s.subject, topic)}>
                          <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={20} color={selected ? colors.primary : colors.textSecondary} />
                          <Text style={styles.topicText}>{topic}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              )
            ) : (
              <Text style={styles.hint}>Select a target exam in step 1 to load subjects, or add topics manually below.</Text>
            )}
            <Text style={styles.label}>Add Topic Manually</Text>
            <TextInput style={styles.input} value={manualSubject} onChangeText={setManualSubject} placeholder="Subject" placeholderTextColor={colors.textSecondary} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={manualTopic} onChangeText={setManualTopic} placeholder="Topic name" placeholderTextColor={colors.textSecondary} />
              <TouchableOpacity style={styles.addBtn} onPress={addManualTopic}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {selectedTopics.length > 0 && (
              <Text style={styles.selectedCount}>{selectedTopics.length} topics selected</Text>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.label}>Add Milestone</Text>
            <TextInput style={styles.input} value={milestoneDraft.title} onChangeText={(v) => setMilestoneDraft((d) => ({ ...d, title: v }))} placeholder="Milestone title" placeholderTextColor={colors.textSecondary} />
            <TextInput style={styles.input} value={milestoneDraft.targetDate} onChangeText={(v) => setMilestoneDraft((d) => ({ ...d, targetDate: v }))} placeholder="Target date (YYYY-MM-DD)" placeholderTextColor={colors.textSecondary} />
            <TouchableOpacity style={styles.addBtn} onPress={addMilestone}>
              <Text style={styles.addBtnText}>Add Milestone</Text>
            </TouchableOpacity>
            {milestones.map((m, i) => (
              <View key={i} style={styles.milestoneItem}>
                <Text style={styles.milestoneTitle}>{m.title}</Text>
                <Text style={styles.milestoneDate}>{m.targetDate}</Text>
                <TouchableOpacity onPress={() => setMilestones((prev) => prev.filter((_, j) => j !== i))}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {milestones.length === 0 && (
              <Text style={styles.hint}>Milestones are optional. Skip if you prefer.</Text>
            )}
          </>
        )}

        {step === 4 && (
          <View style={styles.review}>
            <Text style={styles.reviewTitle}>{form.title}</Text>
            {form.description ? <Text style={styles.reviewDesc}>{form.description}</Text> : null}
            <Text style={styles.reviewMeta}>{form.startDate} → {form.endDate}</Text>
            <Text style={styles.reviewMeta}>{form.studyHoursPerDay} hrs/day · {selectedTopics.length} topics · {milestones.length} milestones</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < STEPS.length ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={nextStep}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? 'Creating...' : 'Create Plan'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenWrapper>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 12 },
    stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    stepDotActive: { width: 24, backgroundColor: colors.primary },
    stepDotDone: { backgroundColor: colors.primary + '80' },
    body: { padding: 16, paddingBottom: 32 },
    label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    textArea: { minHeight: 72, textAlignVertical: 'top' },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      backgroundColor: colors.surface,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
    chipText: { fontSize: 13, color: colors.textSecondary },
    chipTextActive: { color: colors.primary, fontWeight: '700' },
    hint: { fontSize: 13, color: colors.textSecondary, marginVertical: 8 },
    subjectBlock: { marginBottom: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden' },
    subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.surface },
    subjectTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    topicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
    topicText: { fontSize: 14, color: colors.text },
    selectedCount: { marginTop: 12, fontSize: 13, color: colors.primary, fontWeight: '600' },
    addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignSelf: 'flex-start', marginTop: 8 },
    addBtnText: { color: '#fff', fontWeight: '700' },
    milestoneItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginTop: 8 },
    milestoneTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    milestoneDate: { fontSize: 12, color: colors.textSecondary },
    review: { padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    reviewTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    reviewDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
    reviewMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
    primaryBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  });
