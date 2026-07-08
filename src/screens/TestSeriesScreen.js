import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { testSeriesService } from '../services/testSeriesService';

export default function TestSeriesScreen({ navigation }) {
  const { colors } = useTheme();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await testSeriesService.list({ limit: 30 });
      setSeries(res.series || []);
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

  const styles = makeStyles(colors);

  const priceLabel = (s) => {
    const paid = s.accessType === 'paid' || s.isPremium || s.price > 0;
    if (!paid) return 'Free';
    if (s.discountPrice && s.discountPrice < s.price) return `₹${s.discountPrice}`;
    return `₹${s.price}`;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate('TestSeriesDetail', { id: item._id })}
      style={styles.card}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="albums" size={28} color={colors.primary} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.tagRow}>
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>{item.seriesType || 'mock'}</Text>
          </View>
          {item.isEnrolled && (
            <View style={[styles.typeTag, { backgroundColor: colors.success + '22' }]}>
              <Text style={[styles.typeText, { color: colors.success }]}>Enrolled</Text>
            </View>
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Ionicons name="document-text-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.totalTests || 0} tests</Text>
          </View>
          {item.estimatedDuration ? (
            <View style={styles.meta}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.estimatedDuration}h</Text>
            </View>
          ) : null}
          <Text style={styles.price}>{priceLabel(item)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Test Series</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MyTestSeries')} hitSlop={10}>
          <Text style={styles.myLink}>My Series</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={series}
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
              <Ionicons name="albums-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No test series available yet</Text>
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
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
    myLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      overflow: 'hidden',
    },
    thumb: { width: 96, height: 'auto', minHeight: 110 },
    thumbFallback: {
      backgroundColor: colors.primary + '12',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, padding: 12 },
    tagRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
    typeTag: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    typeText: { fontSize: 10, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
    title: { fontSize: 15, fontWeight: '700', color: colors.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: 12, color: colors.textSecondary },
    price: { marginLeft: 'auto', fontSize: 15, fontWeight: '800', color: colors.primary },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { color: colors.textSecondary, marginTop: 12, fontSize: 14 },
  });
