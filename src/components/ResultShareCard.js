import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { t as tr } from '../i18n';

/**
 * Image card for sharing a result (rendered off-screen and captured with
 * react-native-view-shot). Carries the referral code so every share is an invite.
 */
const ResultShareCard = forwardRef(function ResultShareCard({ colors, result, air, referralCode, siteHost }, ref) {
  const pct = Math.round(result?.percentage || 0);
  return (
    <View
      ref={ref}
      collapsable={false}
      style={[tw`p-6 rounded-3xl`, { width: 360, backgroundColor: colors.hero }]}
    >
      <Text style={[tw`text-xs font-extrabold tracking-widest`, { color: colors.heroAccent }]}>EXAMZONE · HSSC</Text>
      <Text style={[tw`text-lg font-extrabold mt-3`, { color: colors.heroText }]} numberOfLines={2}>
        {result?.exam?.title}
      </Text>

      <View style={tw`flex-row items-end mt-4`}>
        <Text style={[tw`text-6xl font-extrabold`, { color: colors.heroText }]}>{pct}</Text>
        <Text style={[tw`text-2xl font-extrabold mb-2 ml-1`, { color: colors.heroTextSecondary }]}>%</Text>
        <Text style={[tw`text-base font-bold mb-3 ml-3`, { color: colors.heroTextSecondary }]}>
          {result?.totalScore}/{result?.exam?.totalMarks} {tr('marks')}
        </Text>
      </View>

      {air?.headline && (
        <View style={[tw`mt-3 px-3 py-2.5 rounded-2xl`, { backgroundColor: colors.heroRaised }]}>
          <Text style={[tw`text-sm font-extrabold`, { color: colors.heroText }]}>🏆 {air.headline}</Text>
          {!!air.subline && <Text style={[tw`text-xs mt-0.5`, { color: colors.heroTextSecondary }]}>{air.subline}</Text>}
        </View>
      )}

      <View style={tw`flex-row gap-4 mt-4`}>
        <Stat colors={colors} n={result?.correctAnswers ?? 0} label={tr('Correct')} />
        <Stat colors={colors} n={result?.incorrectAnswers ?? 0} label={tr('Wrong')} />
        <Stat colors={colors} n={result?.unattempted ?? 0} label={tr('Skipped')} />
      </View>

      {!!referralCode && (
        <View style={[tw`mt-5 pt-4`, { borderTopWidth: 1, borderTopColor: colors.heroRaised }]}>
          <Text style={[tw`text-xs`, { color: colors.heroTextSecondary }]}>{tr('Practise with me — join with code')}</Text>
          <Text style={[tw`text-xl font-extrabold tracking-widest mt-0.5`, { color: colors.heroText }]}>{referralCode}</Text>
          {!!siteHost && <Text style={[tw`text-xs mt-1`, { color: colors.heroMuted }]}>{siteHost}</Text>}
        </View>
      )}
    </View>
  );
});

function Stat({ colors, n, label }) {
  return (
    <View>
      <Text style={[tw`text-lg font-extrabold`, { color: colors.heroText }]}>{n}</Text>
      <Text style={[tw`text-[11px]`, { color: colors.heroMuted }]}>{label}</Text>
    </View>
  );
}

export default ResultShareCard;
