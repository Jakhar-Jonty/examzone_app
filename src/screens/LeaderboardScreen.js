import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { gamificationService } from '../services/gamificationService';

const MEDALS = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

export default function LeaderboardScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [data, setData] = useState({ leaderboard: [], me: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await gamificationService.getLeaderboard(50);
      setData(res);
    } catch (e) {
      // leave existing data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const styles = makeStyles(colors);
  const meId = user?._id || data.me?.userId;

  const initials = (name) =>
    (name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const renderRow = ({ item }) => {
    const isMe = String(item.userId) === String(meId);
    const medal = MEDALS[item.position];
    return (
      <View style={[styles.row, isMe && styles.rowMe]}>
        <View style={styles.posWrap}>
          {medal ? (
            <Ionicons name="medal" size={22} color={medal} />
          ) : (
            <Text style={styles.pos}>{item.position}</Text>
          )}
        </View>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{initials(item.name)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}{isMe ? ' (You)' : ''}
          </Text>
          <Text style={styles.rank}>{item.rank}</Text>
        </View>
        <View style={styles.xpWrap}>
          <Text style={styles.xp}>{item.xp}</Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={data.leaderboard}
          keyExtractor={(item) => String(item.userId)}
          renderItem={renderRow}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No rankings yet. Take an exam to get on the board!</Text>
          }
        />
      )}

      {/* Sticky "your position" bar when off-screen */}
      {data.me && data.me.position > 10 && (
        <View style={styles.meBar}>{renderRow({ item: data.me })}</View>
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowMe: { borderColor: colors.primary, borderWidth: 2 },
    posWrap: { width: 32, alignItems: 'center' },
    pos: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
    avatar: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 10 },
    avatarFallback: {
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    name: { fontSize: 15, fontWeight: '600', color: colors.text },
    rank: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    xpWrap: { alignItems: 'flex-end', marginLeft: 8 },
    xp: { fontSize: 16, fontWeight: '800', color: colors.primary },
    xpLabel: { fontSize: 10, color: colors.textSecondary },
    empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
    meBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 12,
      paddingBottom: 16,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
