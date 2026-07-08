import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { testSeriesService } from '../services/testSeriesService';

export default function MyTestSeriesScreen({ navigation }) {
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await testSeriesService.myEnrollments();
      setItems(res.enrollments || []);
    } catch (e) {
      // keep
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh each time the screen is focused (progress changes after tests).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const styles = makeStyles(colors);

  const renderItem = ({ item }) => {
    const ts = item.testSeries || {};
    const p = item.progress || {};
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('TestSeriesDetail', { id: ts._id })}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <Ionicons name="albums" size={18} color={colors.primary} />
          <Text style={styles.title} numberOfLines={1}>{ts.title || 'Test Series'}</Text>
          {item.status === 'completed' && (
            <View style={styles.doneTag}>
              <Text style={styles.doneText}>Completed</Text>
            </View>
          )}
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${p.progressPercentage || 0}%` }]} />
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {p.testsCompleted || 0}/{p.totalTests || 0} tests
          </Text>
          <Text style={styles.meta}>{p.progressPercentage || 0}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Test Series</Text>
        <View style={{ width: 24 }} />
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>You haven't enrolled in any series yet</Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => navigation.navigate('TestSeriesList')}
              >
                <Text style={styles.browseText}>Browse Test Series</Text>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    doneTag: {
      backgroundColor: colors.success + '22',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    doneText: { fontSize: 10, fontWeight: '700', color: colors.success },
    bar: { height: 8, borderRadius: 4, backgroundColor: colors.border, marginTop: 12, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    meta: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { color: colors.textSecondary, marginTop: 12, fontSize: 14, textAlign: 'center' },
    browseBtn: {
      marginTop: 16,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
    },
    browseText: { color: '#fff', fontWeight: '700' },
  });
