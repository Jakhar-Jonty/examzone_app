import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import StableTextInput from './StableTextInput';
import { t as tr } from '../i18n';

const REASONS = [
  { key: 'WrongAnswer', label: 'Wrong answer' },
  { key: 'Incorrect', label: 'Mistake in question or options' },
  { key: 'TypoError', label: 'Spelling or translation error' },
  { key: 'Unclear', label: 'Question is unclear' },
  { key: 'Outdated', label: 'Information is outdated' },
  { key: 'Duplicate', label: 'Repeated question' },
];

/** Small "Report" link that opens a sheet to report a wrong/unclear question. */
export default function ReportQuestionButton({ questionId, style }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  if (!questionId) return null;

  const close = () => {
    setOpen(false);
    setReason(null);
    setComment('');
  };

  const send = async () => {
    if (!reason || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/questions/${questionId}/report`, { type: reason, comment: comment.trim() });
      setDone(true);
      close();
      Alert.alert(tr('Report sent'), tr(res.data?.message || 'Thanks! We will check this question.'));
    } catch (e) {
      Alert.alert(tr('Could not send'), tr(e?.response?.data?.message || 'Please try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => !done && setOpen(true)}
        disabled={done}
        hitSlop={8}
        activeOpacity={0.7}
        accessibilityRole="button"
        style={[tw`flex-row items-center self-start`, style]}
      >
        <Ionicons name={done ? 'checkmark-circle-outline' : 'flag-outline'} size={14} color={colors.textSecondary} />
        <Text style={[tw`text-xs font-semibold ml-1`, { color: colors.textSecondary }]}>
          {done ? tr('Reported') : tr('Report a problem')}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tw`flex-1`}>
          <Pressable style={tw`flex-1 justify-end bg-black/45`} onPress={close}>
            <Pressable style={[tw`rounded-t-3xl px-5 pb-8`, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={tw`items-center pt-3 pb-2`}>
                <View style={[tw`w-10 h-1 rounded-full`, { backgroundColor: colors.border }]} />
              </View>
              <View style={tw`flex-row items-center justify-between pb-1`}>
                <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>{tr('Report a problem')}</Text>
                <TouchableOpacity onPress={close} hitSlop={12} activeOpacity={0.7} accessibilityLabel={tr('Close')}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[tw`text-xs mb-4`, { color: colors.textSecondary }]}>
                {tr('What is wrong with this question?')}
              </Text>

              {REASONS.map((r) => {
                const on = reason === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setReason(r.key)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[
                      tw`flex-row items-center px-4 py-3 rounded-2xl border mb-2`,
                      { borderColor: on ? colors.hero : colors.border, backgroundColor: on ? colors.surfaceMuted : colors.card },
                    ]}
                  >
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={18} color={on ? colors.text : colors.textSecondary} />
                    <Text style={[tw`text-sm ml-2.5`, { color: colors.text }]}>{tr(r.label)}</Text>
                  </TouchableOpacity>
                );
              })}

              <StableTextInput
                value={comment}
                onChangeText={setComment}
                placeholder={tr('Tell us more (optional) — e.g. the correct answer')}
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={500}
                style={[
                  tw`mt-2 px-4 py-3 rounded-2xl text-sm`,
                  { minHeight: 72, textAlignVertical: 'top', backgroundColor: colors.surfaceMuted, color: colors.text },
                ]}
              />

              <TouchableOpacity
                onPress={send}
                disabled={!reason || sending}
                activeOpacity={0.85}
                style={[tw`mt-4 rounded-2xl items-center justify-center`, { height: 52, backgroundColor: colors.hero, opacity: reason ? 1 : 0.5 }]}
              >
                {sending ? (
                  <ActivityIndicator color={colors.heroText} />
                ) : (
                  <Text style={[tw`text-base font-bold`, { color: colors.heroText }]}>{tr('Send report')}</Text>
                )}
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
