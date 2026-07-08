import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { notificationApi } from '../services/notificationService';

// Map notification type → Ionicon.
const TYPE_ICON = {
  'exam-reminder': 'alarm',
  'test-series-update': 'albums',
  'streak-reminder': 'flame',
  achievement: 'ribbon',
  'rank-update': 'trophy',
  'new-content': 'newspaper',
  subscription: 'diamond',
  system: 'information-circle',
  promotional: 'pricetag',
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await notificationApi.list(1, 30);
      setItems(res.notifications || []);
      setUnread(res.unreadCount || 0);
    } catch (e) {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onItemPress = async (item) => {
    if (!item.isRead) {
      setItems((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
      try { await notificationApi.markRead(item._id); } catch (e) {}
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try { await notificationApi.markAllRead(); } catch (e) {}
  };

  const styles = makeStyles(colors);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onItemPress(item)}
      style={[styles.row, !item.isRead && styles.rowUnread]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: (item.iconColor || colors.primary) + '22' },
        ]}
      >
        <Ionicons
          name={TYPE_ICON[item.type] || 'notifications'}
          size={20}
          color={item.iconColor || colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unread > 0 ? (
          <TouchableOpacity onPress={markAll} hitSlop={10}>
            <Text style={styles.markAll}>Mark all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No notifications yet</Text>
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
    markAll: { fontSize: 14, fontWeight: '600', color: colors.primary, width: 56, textAlign: 'right' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowUnread: { backgroundColor: colors.primary + '08', borderColor: colors.primary + '40' },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    title: { fontSize: 15, fontWeight: '700', color: colors.text },
    message: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    time: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    dot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.primary,
      marginLeft: 8,
    },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { color: colors.textSecondary, marginTop: 12, fontSize: 14 },
  });
