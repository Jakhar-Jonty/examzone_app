import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import RewardCelebration from '../components/RewardCelebration';
import { useTheme } from '../context/ThemeContext';
import { t as tr } from '../i18n';

const SESSION_TYPE_LABELS = {
  random: 'Random',
  'subject-wise': 'Subject Wise',
  'topic-wise': 'Topic Wise',
  'difficulty-based': 'By Difficulty',
  'weak-areas': 'Weak Areas',
  mistakes: 'Wrong Book',
  pyq: 'PYQ',
  'daily-quiz': 'Daily Quiz',
};

export default function PracticeResultScreen({ route, navigation }) {
  const { session, rewards } = route.params;
  const { colors } = useTheme();
  const [showCelebration, setShowCelebration] = useState(!!rewards);
  const styles = makeStyles(colors);
  const typeLabel = tr(SESSION_TYPE_LABELS[session.sessionType] || 'Practice');

  const stats = [
    { label: tr("Accuracy"), value: `${session.accuracy}%`, color: colors.success, icon: 'trophy' },
    { label: tr("Correct"), value: session.correctAnswers, color: colors.success, icon: 'checkmark-circle' },
    { label: tr("Wrong"), value: session.incorrectAnswers, color: colors.error, icon: 'close-circle' },
    { label: tr("Skipped"), value: session.skipped ?? 0, color: colors.textSecondary, icon: 'play-skip-forward' },
  ];

  return (
    <ScreenWrapper>
      <RewardCelebration
        rewards={rewards}
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
      />
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name="trophy" size={40} color={colors.success} />
          </View>
          <Text style={styles.title}>{tr("Session Complete!")}</Text>
          <Text style={styles.subtitle}>{tr("{0} · {1} questions", typeLabel, session.totalQuestions)}</Text>
          {session.totalTime > 0 && (
            <Text style={styles.time}>
              {tr("{0}m {1}s total", Math.floor(session.totalTime / 60), session.totalTime % 60)}
            </Text>
          )}
        </View>

        <View style={styles.statsGrid}>
          {stats.map(({ label, value, color, icon }) => (
            <View key={label} style={styles.statCard}>
              <Ionicons name={icon} size={20} color={color} />
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{tr(label)}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('PracticeSessions')}>
          <Ionicons name="arrow-back" size={18} color={colors.heroText} />
          <Text style={styles.btnText}>{tr("Back to Practice")}</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, padding: 24 },
    hero: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.tones.green.bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
    time: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
    statCard: {
      width: '47%',
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      alignItems: 'center',
      gap: 4,
    },
    statValue: { fontSize: 24, fontWeight: '800' },
    statLabel: { fontSize: 12, color: colors.textSecondary },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.hero,
      paddingVertical: 14,
      borderRadius: 12,
    },
    btnText: { color: colors.heroText, fontWeight: '800', fontSize: 16 },
  });
