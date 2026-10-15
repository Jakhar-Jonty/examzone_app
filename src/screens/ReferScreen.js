import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { referralService, inviteMessage, shareOnWhatsApp } from '../services/referralService';
import { t as tr } from '../i18n';

/** Refer & earn: share your code, track friends, or enter a friend's code. */
export default function ReferScreen({ navigation }) {
  const { colors } = useTheme();
  const [ref, setRef] = useState(null);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  const load = async () => {
    try {
      setRef(await referralService.me());
    } catch {
      Alert.alert(tr('Refer & earn'), tr('Could not load. Pull down to retry.'));
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const copy = async () => {
    await Clipboard.setStringAsync(ref.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const apply = async () => {
    if (!code.trim() || applying) return;
    try {
      setApplying(true);
      const res = await referralService.apply(code.trim());
      Alert.alert(tr('Code applied'), tr(res.message));
      setCode('');
      load();
    } catch (e) {
      Alert.alert(tr('Could not apply'), tr(e?.response?.data?.message || 'Please try again.'));
    } finally {
      setApplying(false);
    }
  };

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={tw`flex-row items-center px-3 pt-2 pb-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel={tr('Back')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[tw`text-xl font-extrabold ml-1`, { color: colors.text }]}>{tr('Refer & earn')}</Text>
      </View>

      {!ref ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={tw`px-5 pt-2 pb-12`} showsVerticalScrollIndicator={false}>
          {/* Offer + code */}
          <View style={[tw`p-5 rounded-3xl mb-5`, { backgroundColor: colors.hero }]}>
            <Text style={[tw`text-2xl font-extrabold`, { color: colors.heroText }]}>
              {tr('Get {0} premium days for every friend', ref.rewards.referrerDays)}
            </Text>
            <Text style={[tw`text-sm mt-2 leading-5`, { color: colors.heroTextSecondary }]}>
              {tr('Your friend gets {0} days too, once they finish their first test.', ref.rewards.friendDays)}
            </Text>

            <TouchableOpacity
              onPress={copy}
              activeOpacity={0.85}
              accessibilityLabel={tr('Copy code {0}', ref.code)}
              style={[tw`flex-row items-center justify-between mt-5 px-4 h-14 rounded-2xl`, { backgroundColor: colors.heroRaised }]}
            >
              <Text style={[tw`text-2xl font-extrabold tracking-widest`, { color: colors.heroText }]}>{ref.code}</Text>
              <View style={tw`flex-row items-center`}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.heroAccent} />
                <Text style={[tw`text-xs font-bold ml-1`, { color: colors.heroAccent }]}>{copied ? tr('Copied') : tr('Copy')}</Text>
              </View>
            </TouchableOpacity>

            <View style={tw`flex-row gap-2.5 mt-3`}>
              <TouchableOpacity
                onPress={() => shareOnWhatsApp(inviteMessage(ref))}
                activeOpacity={0.85}
                style={[tw`flex-1 flex-row items-center justify-center h-12 rounded-2xl`, { backgroundColor: colors.heroText }]}
              >
                <Ionicons name="logo-whatsapp" size={18} color={colors.hero} />
                <Text style={[tw`text-sm font-bold ml-1.5`, { color: colors.hero }]}>{tr('Invite on WhatsApp')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Share.share({ message: inviteMessage(ref) })}
                activeOpacity={0.85}
                accessibilityLabel={tr('More sharing options')}
                style={[tw`w-12 h-12 items-center justify-center rounded-2xl`, { backgroundColor: colors.heroRaised }]}
              >
                <Ionicons name="share-social-outline" size={18} color={colors.heroText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress */}
          <View style={tw`flex-row gap-2.5 mb-5`}>
            {[
              [ref.joined, tr('Friends joined')],
              [ref.activated, tr('Finished a test')],
              [ref.daysEarned, tr('Days earned')],
            ].map(([n, label]) => (
              <View key={label} style={[tw`flex-1 p-3 rounded-2xl items-center`, card]}>
                <Text style={[tw`text-xl font-extrabold`, { color: colors.text }]}>{n}</Text>
                <Text style={[tw`text-[11px] mt-0.5 text-center`, { color: colors.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>

          {/* How it works */}
          <Text style={[tw`text-base font-extrabold mb-2.5`, { color: colors.text }]}>{tr('How it works')}</Text>
          <View style={[tw`p-4 rounded-3xl mb-5`, card]}>
            {[
              tr('Share your code or link with friends preparing for HSSC.'),
              tr('They sign up and add your code (within 7 days).'),
              tr('When they finish their first test, you both get premium days.'),
            ].map((line, i) => (
              <View key={line} style={[tw`flex-row items-start`, i > 0 && tw`mt-3`]}>
                <View style={[tw`w-6 h-6 rounded-full items-center justify-center mr-3`, { backgroundColor: colors.surfaceMuted }]}>
                  <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>{i + 1}</Text>
                </View>
                <Text style={[tw`flex-1 text-sm leading-5`, { color: colors.text }]}>{line}</Text>
              </View>
            ))}
          </View>

          {/* Enter a friend's code (new students only) */}
          {ref.canApply && (
            <View style={[tw`p-4 rounded-3xl`, card]}>
              <Text style={[tw`text-sm font-bold mb-2`, { color: colors.text }]}>{tr('Have a friend’s code?')}</Text>
              <View style={tw`flex-row gap-2`}>
                <TextInput
                  value={code}
                  onChangeText={(v) => setCode(v.toUpperCase())}
                  placeholder={tr('Enter code')}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[
                    tw`flex-1 h-11 px-3 rounded-xl text-base font-bold tracking-widest`,
                    { backgroundColor: colors.surfaceMuted, color: colors.text },
                  ]}
                />
                <TouchableOpacity
                  onPress={apply}
                  disabled={!code.trim() || applying}
                  style={[tw`px-4 h-11 rounded-xl items-center justify-center`, { backgroundColor: colors.hero, opacity: code.trim() ? 1 : 0.5 }]}
                >
                  {applying ? (
                    <ActivityIndicator color={colors.heroText} />
                  ) : (
                    <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>{tr('Apply')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
