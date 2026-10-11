import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

function Bone({ style, colors }) {
  return (
    <View
      style={[
        { backgroundColor: colors.border + '99', borderRadius: 8 },
        style,
      ]}
    />
  );
}

export function ExamCardSkeleton({ colors }) {
  const cardBg = colors.card || colors.surface;
  return (
    <View
      style={[
        tw`rounded-2xl border px-4 pt-3.5 pb-3.5`,
        { backgroundColor: cardBg, borderColor: colors.border },
      ]}
    >
      <Bone style={tw`w-14 h-4 mb-3`} colors={colors} />
      <Bone style={tw`w-full h-4 mb-2`} colors={colors} />
      <Bone style={tw`w-2/3 h-3 mb-3`} colors={colors} />
      <View style={tw`flex-row gap-2 mb-3`}>
        <Bone style={tw`flex-1 h-14`} colors={colors} />
        <Bone style={tw`flex-1 h-14`} colors={colors} />
        <Bone style={tw`flex-1 h-14`} colors={colors} />
      </View>
      <Bone style={tw`w-full h-10 rounded-xl`} colors={colors} />
    </View>
  );
}

export function ExamCardSkeletonList({ count = 4, colors }) {
  return (
    <View style={tw`gap-3`}>
      {Array.from({ length: count }, (_, i) => (
        <ExamCardSkeleton key={i} colors={colors} />
      ))}
    </View>
  );
}
