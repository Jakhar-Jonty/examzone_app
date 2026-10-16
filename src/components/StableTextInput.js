import React from 'react';
import { TextInput } from 'react-native';

/**
 * TextInput that lets the native field own its text.
 *
 * A controlled input whose value is rewritten on every keystroke (digits only,
 * max length, upper-case) drops characters on React Native's new architecture —
 * students had to press each key 2–3 times in the OTP and phone fields. Here we
 * only read changes; `transform` cleans the copy we keep in state.
 * Change `resetKey` to clear the field (it remounts with `value`).
 */
export default function StableTextInput({ value, onChangeText, transform, resetKey, ...props }) {
  return (
    <TextInput
      key={resetKey}
      defaultValue={value}
      onChangeText={(text) => onChangeText(transform ? transform(text) : text)}
      {...props}
    />
  );
}
