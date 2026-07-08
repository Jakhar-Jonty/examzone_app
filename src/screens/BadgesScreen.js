import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { gamificationService } from '../services/gamificationService';

export default function BadgesScreen({ navigation }) {
  const { colors } = useTheme();
  const [badges, setBadges] = useState([]);
  const [summary, setSummary] = useState({ earnedCount: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await gamificationService.getMyBadges();
      setBadges(res.badges || []);
      setSummary({ earnedCount: res.earnedCount || 0, total: res.total || 0 });
    } catch (e) {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const styles = makeStyles(colors);

  const renderBadge = ({ item }) => {
    const accent = item.color || colors.primary;
    return (
      <View
        style={[
          styles.badge,
          item.earned && { borderColor: accent },
          !item.earned && styles.badgeLocked,
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: item.earned ? accent + '22' : colors.border },
          ]}
        >
          {item.earned ? (
            <Text style={styles.emoji}>{item.icon || '🏅'}</Text>
          ) : (
            <Ionicons name="lock-closed" size={24} color={colors.textSecondary} />
          )}
        </View>
        <Text style={styles.badgeName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.badgeDesc} numberOfLines={2}>{item.description}</Text>
        {item.earned && item.earnedAt && (
          <Text style={[styles.earnedAt, { color: accent }]}>
            {new Date(item.earnedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Badges</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={badges}
          keyExtractor={(item) => item.id}
          renderItem={renderBadge}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {summary.earnedCount} of {summary.total} earned
              </Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
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
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    summary: { marginBottom: 4 },
    summaryText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    badge: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      alignItems: 'center',
    },
    badgeLocked: { opacity: 0.6 },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    emoji: { fontSize: 28 },
    badgeName: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },
    badgeDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    earnedAt: { fontSize: 10, color: colors.primary, marginTop: 6, fontWeight: '600' },
  });
