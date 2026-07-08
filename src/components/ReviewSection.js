import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { reviewService } from '../services/reviewService';

/**
 * ReviewSection — drop-in ratings + reviews block for any target.
 * Props: targetType ('exam' | 'test-series'), targetId.
 */
export default function ReviewSection({ targetType, targetId, canReview = false }) {
  const { colors } = useTheme();
  const [data, setData] = useState({ reviews: [], summary: { average: 0, count: 0, distribution: {} } });
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!canReview) {
        const list = await reviewService.list(targetType, targetId, 1, 1);
        setData({ reviews: [], summary: list.summary });
      } else {
        const [list, my] = await Promise.all([
          reviewService.list(targetType, targetId, 1, 5),
          reviewService.mine(targetType, targetId).catch(() => ({ review: null })),
        ]);
        setData(list);
        if (my) setMine(my.review);
      }
    } catch (e) {
      // keep
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId, canReview]);

  useEffect(() => {
    load();
  }, [load]);

  const styles = makeStyles(colors);
  const { summary, reviews } = data;

  const Stars = ({ value, size = 14 }) => (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(value) ? 'star' : 'star-outline'}
          size={size}
          color="#f59e0b"
        />
      ))}
    </View>
  );

  // Rating-only strip before first attempt
  if (!canReview) {
    if (loading) return <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        <Stars value={summary.average} size={14} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
          {(summary.average || 0).toFixed(1)}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          ({summary.count} review{summary.count === 1 ? '' : 's'})
        </Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>· Attempt to read & write reviews</Text>
      </View>
    );
  }


  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Ratings & Reviews</Text>
        <TouchableOpacity onPress={() => setModal(true)} hitSlop={8}>
          <Text style={styles.write}>{mine ? 'Edit yours' : 'Write a review'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : (
        <>
          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.avgBox}>
              <Text style={styles.avgNum}>{summary.average?.toFixed(1) || '0.0'}</Text>
              <Stars value={summary.average} size={13} />
              <Text style={styles.count}>{summary.count} review{summary.count === 1 ? '' : 's'}</Text>
            </View>
            <View style={styles.bars}>
              {[5, 4, 3, 2, 1].map((star) => {
                const c = summary.distribution?.[star] || 0;
                const pct = summary.count > 0 ? (c / summary.count) * 100 : 0;
                return (
                  <View key={star} style={styles.barRow}>
                    <Text style={styles.barStar}>{star}</Text>
                    <Ionicons name="star" size={10} color="#f59e0b" />
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* List */}
          {reviews.length === 0 ? (
            <Text style={styles.empty}>No reviews yet. Be the first!</Text>
          ) : (
            reviews.map((r) => (
              <View key={r._id} style={styles.review}>
                <View style={styles.reviewHead}>
                  {r.user?.profileImage ? (
                    <Image source={{ uri: r.user.profileImage }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarText}>
                        {(r.user?.name || 'U').slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{r.user?.name || 'User'}</Text>
                    <Stars value={r.rating} size={12} />
                  </View>
                </View>
                {r.title ? <Text style={styles.reviewTitle}>{r.title}</Text> : null}
                {r.comment ? <Text style={styles.reviewBody}>{r.comment}</Text> : null}
              </View>
            ))
          )}
        </>
      )}

      <ReviewModal
        visible={modal}
        onClose={() => setModal(false)}
        existing={mine}
        colors={colors}
        onSubmit={async ({ rating, title, comment }) => {
          try {
            await reviewService.submit({ targetType, targetId, rating, title, comment });
            setModal(false);
            load();
          } catch (e) {
            Alert.alert('Error', e?.response?.data?.message || 'Could not save review.');
          }
        }}
      />
    </View>
  );
}

function ReviewModal({ visible, onClose, existing, onSubmit, colors }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [title, setTitle] = useState(existing?.title || '');
  const [comment, setComment] = useState(existing?.comment || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setRating(existing?.rating || 0);
      setTitle(existing?.title || '');
      setComment(existing?.comment || '');
    }
  }, [visible, existing]);

  const styles = makeStyles(colors);

  const submit = async () => {
    if (rating < 1) return;
    setSaving(true);
    await onSubmit({ rating, title, comment });
    setSaving(false);
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{existing ? 'Edit Review' : 'Write a Review'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Star picker */}
          <View style={styles.starPicker}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity key={i} onPress={() => setRating(i)} hitSlop={6}>
                <Ionicons
                  name={i <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color="#f59e0b"
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Title (optional)"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Share your experience (optional)"
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
          />

          <TouchableOpacity
            style={[styles.modalCta, (rating < 1 || saving) && { opacity: 0.6 }]}
            onPress={submit}
            disabled={rating < 1 || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.modalCtaText}>{existing ? 'Update' : 'Submit'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    wrap: { marginTop: 24 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 16, fontWeight: '700', color: colors.text },
    write: { fontSize: 14, fontWeight: '600', color: colors.primary },
    summary: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 16,
      marginBottom: 12,
    },
    avgBox: { alignItems: 'center', justifyContent: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: colors.border },
    avgNum: { fontSize: 32, fontWeight: '900', color: colors.text },
    count: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    bars: { flex: 1, justifyContent: 'center', gap: 4 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    barStar: { fontSize: 11, color: colors.textSecondary, width: 8 },
    barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginLeft: 4 },
    barFill: { height: '100%', backgroundColor: '#f59e0b' },
    empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 12, textAlign: 'center' },
    review: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
    reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    avatarFallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    reviewName: { fontSize: 13, fontWeight: '700', color: colors.text },
    reviewTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
    reviewBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
    modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    starPicker: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.card,
      marginBottom: 12,
    },
    textarea: { height: 90, textAlignVertical: 'top' },
    modalCta: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
    modalCtaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
