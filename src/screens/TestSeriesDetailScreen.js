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
import ReviewSection from '../components/ReviewSection';
import { useTheme } from '../context/ThemeContext';
import { testSeriesService } from '../services/testSeriesService';

export default function TestSeriesDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await testSeriesService.detail(id);
      setData(res);
    } catch (e) {
      Alert.alert('Error', 'Could not load this series.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [id, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  const styles = makeStyles(colors);

  if (loading || !data) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </ScreenWrapper>
    );
  }

  const { series, isEnrolled, progress } = data;
  const isPaid = series.accessType === 'paid' || series.isPremium || series.price > 0;
  const priceText = isPaid
    ? `₹${series.discountPrice && series.discountPrice < series.price ? series.discountPrice : series.price}`
    : 'Free';

  const doEnroll = async (payment = {}) => {
    try {
      setEnrolling(true);
      await testSeriesService.enroll(id, payment);
      await load();
      Alert.alert('Enrolled 🎉', 'You can now take all tests in this series.');
    } catch (e) {
      Alert.alert('Failed', e?.response?.data?.message || 'Could not enroll.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnroll = () => {
    if (isPaid) {
      Alert.alert(
        'Enroll',
        `This series costs ${priceText}. Continue? (mock payment)`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay & Enroll', onPress: () => doEnroll({ isMock: true }) },
        ]
      );
    } else {
      doEnroll();
    }
  };

  const openTest = (entry) => {
    if (entry.locked) {
      Alert.alert(
        'Locked',
        isEnrolled
          ? 'Complete the previous test to unlock this one.'
          : 'Enroll in this series to access its tests.'
      );
      return;
    }
    const examId = entry.exam?._id || entry.exam;
    navigation.navigate('ExamDetail', { examId });
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Test Series</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <Text style={styles.title}>{series.title}</Text>
        {series.description ? (
          <Text style={styles.desc}>{series.description}</Text>
        ) : null}

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat icon="document-text" label="Tests" value={series.totalTests || (series.exams || []).length} colors={colors} />
          {series.estimatedDuration ? (
            <Stat icon="time" label="Hours" value={series.estimatedDuration} colors={colors} />
          ) : null}
          <Stat icon="people" label="Enrolled" value={series.enrollments || 0} colors={colors} />
        </View>

        {/* Progress when enrolled */}
        {isEnrolled && (
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>Your Progress</Text>
              <Text style={styles.progressPct}>{progress.progressPercentage}%</Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${progress.progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressSub}>
              {progress.testsCompleted}/{progress.totalTests} done · avg {progress.averageScore}%
            </Text>
          </View>
        )}

        {/* Tests list */}
        <Text style={styles.sectionTitle}>Tests</Text>
        {(series.exams || []).map((entry, idx) => {
          const exam = entry.exam || {};
          return (
            <TouchableOpacity
              key={String(exam._id || idx)}
              activeOpacity={0.8}
              onPress={() => openTest(entry)}
              style={styles.testRow}
            >
              <View style={[styles.testNum, entry.completed && { backgroundColor: colors.success }]}>
                {entry.completed ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={styles.testNumText}>{idx + 1}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.testTitle} numberOfLines={1}>{exam.title || 'Test'}</Text>
                <Text style={styles.testMeta}>
                  {exam.duration ? `${exam.duration} min` : ''}
                  {exam.totalMarks ? ` · ${exam.totalMarks} marks` : ''}
                </Text>
              </View>
              <Ionicons
                name={entry.locked ? 'lock-closed' : 'chevron-forward'}
                size={18}
                color={entry.locked ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>
          );
        })}

        {/* Ratings & reviews */}
        <ReviewSection targetType="test-series" targetId={id} />
      </ScrollView>

      {/* Enroll CTA */}
      {!isEnrolled && (
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.cta, enrolling && { opacity: 0.7 }]}
            disabled={enrolling}
            activeOpacity={0.85}
            onPress={handleEnroll}
          >
            {enrolling ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                {isPaid ? `Enroll · ${priceText}` : 'Enroll for Free'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenWrapper>
  );
}

function Stat({ icon, label, value, colors }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    desc: { fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    stat: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    statValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    progressCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 16,
    },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    progressPct: { fontSize: 16, fontWeight: '800', color: colors.primary },
    bar: { height: 8, borderRadius: 4, backgroundColor: colors.border, marginTop: 10, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
    progressSub: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 22, marginBottom: 10 },
    testRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
    },
    testNum: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    testNumText: { fontSize: 14, fontWeight: '700', color: colors.primary },
    testTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    testMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    ctaWrap: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      paddingBottom: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    cta: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
