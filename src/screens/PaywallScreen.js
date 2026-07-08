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
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { subscriptionService } from '../services/subscriptionService';

/**
 * PaywallScreen — shows pricing plans and runs checkout.
 *
 * Today it uses the backend mock-payment flow (subscriptionService.purchaseMock),
 * which activates premium without a real gateway. Swap purchaseMock for native
 * Razorpay / store IAP once payment compliance is decided.
 *
 * Navigate here from anywhere: navigation.navigate('Paywall').
 * Optional route param `reason` (string) renders a context line at the top,
 * e.g. navigation.navigate('Paywall', { reason: 'This exam is Premium' }).
 */
export default function PaywallScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { isPremium, user, refreshUser } = useAuth();
  const reason = route?.params?.reason;

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('yearly');
  const [purchasing, setPurchasing] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { plans: data } = await subscriptionService.getPlans();
      setPlans(data || []);
    } catch (e) {
      Alert.alert('Error', 'Could not load plans. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handlePurchase = async () => {
    if (selected === 'free') return;
    try {
      setPurchasing(true);
      const result = await subscriptionService.purchaseMock(selected);
      await refreshUser();
      Alert.alert(
        'You are Premium! 🎉',
        result?.message || 'Subscription activated.',
        [{ text: 'Continue', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert(
        'Payment Failed',
        e?.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setPurchasing(false);
    }
  };

  const styles = makeStyles(colors);
  const paidPlans = plans.filter((p) => p.id !== 'free');

  // Already premium — show status instead of plans.
  if (isPremium) {
    return (
      <ScreenWrapper>
        <Header colors={colors} onClose={() => navigation.goBack()} title="Premium" />
        <View style={styles.activeWrap}>
          <View style={styles.activeBadge}>
            <Ionicons name="diamond" size={40} color="#fff" />
          </View>
          <Text style={styles.activeTitle}>You're Premium</Text>
          <Text style={styles.activeSub}>
            {user?.subscriptionExpiry
              ? `Active until ${new Date(user.subscriptionExpiry).toLocaleDateString()}`
              : 'Enjoy unlimited access.'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header colors={colors} onClose={() => navigation.goBack()} title="Go Premium" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="rocket" size={36} color="#fff" />
            <Text style={styles.heroTitle}>Unlock Everything</Text>
            <Text style={styles.heroSub}>
              {reason || 'Unlimited exams, all study material, ad-free.'}
            </Text>
          </LinearGradient>

          {/* Plan cards */}
          {paidPlans.map((plan) => {
            const isSel = selected === plan.id;
            const isYear = plan.id === 'yearly';
            return (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.85}
                onPress={() => setSelected(plan.id)}
                style={[styles.card, isSel && styles.cardSel]}
              >
                {isYear && (
                  <View style={styles.bestBadge}>
                    <Text style={styles.bestText}>BEST VALUE</Text>
                  </View>
                )}
                <View style={styles.cardHeadRow}>
                  <View style={styles.radio}>
                    {isSel && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDuration}>{plan.duration}</Text>
                  </View>
                  <View style={styles.priceCol}>
                    {plan.originalPrice ? (
                      <Text style={styles.strike}>₹{plan.originalPrice}</Text>
                    ) : null}
                    <Text style={styles.price}>₹{plan.price}</Text>
                  </View>
                </View>

                {plan.savings ? (
                  <View style={styles.saveTag}>
                    <Text style={styles.saveText}>Save ₹{plan.savings}</Text>
                  </View>
                ) : null}

                <View style={styles.features}>
                  {(plan.features || []).map((f, i) => (
                    <View key={i} style={styles.featRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.success}
                      />
                      <Text style={styles.featText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={styles.fineprint}>
            Mock checkout — no real charge. Cancel anytime.
          </Text>
        </ScrollView>
      )}

      {/* Sticky CTA */}
      {!loading && (
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={purchasing}
            onPress={handlePurchase}
            style={[styles.cta, purchasing && { opacity: 0.7 }]}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                {selected === 'yearly'
                  ? 'Start Yearly Premium'
                  : 'Start Monthly Premium'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenWrapper>
  );
}

function Header({ colors, onClose, title }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={10}>
        <Ionicons name="close" size={26} color={colors.text} />
      </TouchableOpacity>
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
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    scroll: { padding: 16, paddingBottom: 24 },
    hero: {
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      marginBottom: 20,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#fff',
      marginTop: 10,
    },
    heroSub: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginTop: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    cardSel: { borderColor: colors.primary },
    bestBadge: {
      position: 'absolute',
      top: -10,
      right: 16,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    bestText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    cardHeadRow: { flexDirection: 'row', alignItems: 'center' },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.primary,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    planName: { fontSize: 16, fontWeight: '700', color: colors.text },
    planDuration: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    priceCol: { alignItems: 'flex-end' },
    strike: {
      fontSize: 12,
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    },
    price: { fontSize: 22, fontWeight: '800', color: colors.text },
    saveTag: {
      alignSelf: 'flex-start',
      backgroundColor: colors.success + '22',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginTop: 10,
    },
    saveText: { color: colors.success, fontSize: 12, fontWeight: '700' },
    features: { marginTop: 14, gap: 8 },
    featRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    featText: { fontSize: 14, color: colors.text, flex: 1 },
    fineprint: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    ctaWrap: {
      padding: 16,
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
    activeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    activeBadge: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    activeTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
    activeSub: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
  });
