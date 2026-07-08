import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// Lightweight confetti — a burst of colored dots, no extra dependency.
const CONFETTI_COLORS = ['#16a34a', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];
const PIECES = 22;

function ConfettiPiece({ delay }) {
  const fall = useRef(new Animated.Value(0)).current;
  const startX = useRef(Math.random() * width).current;
  const drift = useRef((Math.random() - 0.5) * 120).current;
  const color = useRef(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]).current;
  const size = useRef(6 + Math.random() * 6).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(fall, {
        toValue: 1,
        duration: 2200 + Math.random() * 1200,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [fall, delay]);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-40, 360] });
  const translateX = fall.interpolate({ inputRange: [0, 1], outputRange: [0, drift] });
  const rotate = fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const opacity = fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: 0,
        width: size,
        height: size,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

/**
 * RewardCelebration — post-exam modal showing XP gained, rank-up, and any new
 * badges. Driven by the `rewards` object the submit endpoint returns:
 *   { xpGained, totalXp, rank, rankedUp, newBadges: [{ name, description, icon }] }
 *
 * Renders nothing if there's nothing worth celebrating.
 */
export default function RewardCelebration({ rewards, visible, onClose }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hasReward =
    rewards && (rewards.xpGained > 0 || rewards.rankedUp || (rewards.newBadges || []).length > 0);

  useEffect(() => {
    if (visible && hasReward) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.7);
      opacity.setValue(0);
    }
  }, [visible, hasReward, scale, opacity]);

  if (!hasReward) return null;

  const styles = makeStyles(colors);
  const newBadges = rewards.newBadges || [];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* confetti layer */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: PIECES }).map((_, i) => (
            <ConfettiPiece key={i} delay={i * 80} />
          ))}
        </View>

        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="trophy" size={44} color="#fff" />
            <Text style={styles.heroTitle}>Great work!</Text>
          </LinearGradient>

          <View style={styles.body}>
            {/* XP */}
            {rewards.xpGained > 0 && (
              <View style={styles.xpRow}>
                <Ionicons name="flash" size={22} color={colors.primary} />
                <Text style={styles.xpText}>+{rewards.xpGained} XP</Text>
                <Text style={styles.xpSub}>({rewards.totalXp} total)</Text>
              </View>
            )}

            {/* Rank up */}
            {rewards.rankedUp && (
              <View style={styles.rankRow}>
                <Ionicons name="arrow-up-circle" size={20} color={colors.success} />
                <Text style={styles.rankText}>
                  Ranked up to <Text style={{ fontWeight: '800' }}>{rewards.rank}</Text>!
                </Text>
              </View>
            )}

            {/* New badges */}
            {newBadges.length > 0 && (
              <View style={styles.badgesWrap}>
                <Text style={styles.badgesLabel}>
                  New badge{newBadges.length > 1 ? 's' : ''} unlocked
                </Text>
                <View style={styles.badgesRow}>
                  {newBadges.map((b) => (
                    <View key={b.id || b.name} style={styles.badge}>
                      <Text style={styles.badgeIcon}>{b.icon || '🏅'}</Text>
                      <Text style={styles.badgeName} numberOfLines={1}>{b.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.cta} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.ctaText}>Awesome!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 24,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    hero: { alignItems: 'center', paddingVertical: 28 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 8 },
    body: { padding: 22, gap: 16 },
    xpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    xpText: { fontSize: 26, fontWeight: '900', color: colors.primary },
    xpSub: { fontSize: 13, color: colors.textSecondary },
    rankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    rankText: { fontSize: 15, color: colors.text },
    badgesWrap: { alignItems: 'center', gap: 10 },
    badgesLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
    badge: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 12,
      width: 92,
    },
    badgeIcon: { fontSize: 30 },
    badgeName: { fontSize: 11, fontWeight: '700', color: colors.text, marginTop: 4, textAlign: 'center' },
    cta: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    ctaText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  });
