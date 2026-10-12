import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import tw from 'twrnc';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { useCategories } from '../hooks/useCategories';

// ─── Constants (outside component) ──────────────────────
const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh',
];

const STUDY_GOALS = [30, 60, 90, 120, 180];

// ─── Extracted Sub-components (outside main component) ──
function SectionLabel({ title, icon, colors }) {
  return (
    <View style={tw`flex-row items-center gap-2 mt-6 mb-2 px-1`}>
      <Ionicons name={icon} size={16} color={colors.text} />
      <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function ToggleRow({ label, value, onChange, colors, isLast }) {
  return (
    <View
      style={[
        tw`flex-row items-center justify-between py-3`,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
      ]}
    >
      <Text style={[tw`text-sm font-medium flex-1 mr-3`, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary + '60' }}
        thumbColor={value ? colors.primary : colors.textSecondary}
      />
    </View>
  );
}

function ChipSelect({ options, selected, onSelect, multi = false, colors }) {
  return (
    <View style={tw`flex-row flex-wrap gap-2`}>
      {options.map((opt) => {
        const key = typeof opt === 'string' ? opt : opt.value || opt.key || opt._id;
        const label = typeof opt === 'string' ? opt : opt.label || opt.name;
        const isActive = multi
          ? Array.isArray(selected) && selected.includes(key)
          : selected === key;

        return (
          <TouchableOpacity
            key={key}
            style={[
              tw`flex-row items-center px-3.5 py-2 rounded-full border`,
              isActive
                ? { backgroundColor: colors.hero, borderColor: colors.hero }
                : { backgroundColor: colors.background, borderColor: colors.border },
            ]}
            onPress={() => onSelect(key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                tw`text-xs font-semibold`,
                { color: isActive ? colors.heroText : colors.text },
              ]}
            >
              {label}
            </Text>
            {isActive && multi && (
              <Ionicons name="checkmark" size={12} color={colors.heroText} style={tw`ml-1`} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────
export default function EditProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ─── Form State ────────────────────────────────────────
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const phoneNumber = user?.phoneNumber || '';
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [imageUri, setImageUri] = useState(user?.profileImage || null);
  const [gender, setGender] = useState(user?.gender || '');
  const [state, setState] = useState(user?.state || '');
  const [city, setCity] = useState(user?.city || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''
  );
  const [preferredLanguage, setPreferredLanguage] = useState(
    user?.preferredLanguage || 'English'
  );
  const [examPreparations, setExamPreparations] = useState(() => {
    const preps = user?.examPreparations || [];
    if (preps.length === 0) return [];
    if (typeof preps[0] === 'string') return preps;
    return [];
  });
  const [prefs, setPrefs] = useState({
    notificationsEnabled: user?.preferences?.notificationsEnabled ?? true,
    dailyStudyGoal: user?.preferences?.dailyStudyGoal ?? 60,
    showAnswersDuringTest: user?.preferences?.showAnswersDuringTest ?? false,
    showExplanationsAfterTest: user?.preferences?.showExplanationsAfterTest ?? true,
    enableTimer: user?.preferences?.enableTimer ?? true,
    enableNegativeMarking: user?.preferences?.enableNegativeMarking ?? true,
  });

  // ─── Track changes for unsaved warning ─────────────────
  useEffect(() => {
    setHasChanges(true);
  }, [name, email, gender, state, city, bio, dateOfBirth, preferredLanguage, examPreparations, prefs, profileImage]);

  // Match object-format examPreparations to category codes
  useEffect(() => {
    if (categories.length === 0) return;
    const preps = user?.examPreparations || [];
    if (preps.length === 0 || typeof preps[0] === 'string') return;
    const idToCode = {};
    categories.forEach((c) => (idToCode[c._id] = c.code));
    const codes = preps
      .map((p) => idToCode[p.category?.toString?.() || p.category])
      .filter(Boolean);
    if (codes.length > 0) setExamPreparations(codes);
  }, [categories]);

  // Warn on unsaved back
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasChanges || loading) return;
      e.preventDefault();
      Alert.alert('Discard changes?', 'You have unsaved changes. Are you sure you want to go back?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, hasChanges, loading]);

  // Request permissions
  useEffect(() => {
    if (Platform.OS !== 'web') {
      ImagePicker.requestMediaLibraryPermissionsAsync();
    }
  }, []);

  // ─── Image Handling ────────────────────────────────────
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        await uploadImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        await uploadImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadImage = async (uri) => {
    try {
      setUploading(true);
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const ext = /\.(\w+)$/.exec(filename);
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: ext ? `image/${ext[1]}` : 'image/jpeg',
      });
      const res = await api.post('/user/profile/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.url) {
        setProfileImage(res.data.url);
        setImageUri(res.data.url);
      }
    } catch {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ─── Form Helpers ──────────────────────────────────────
  const toggleExamPrep = (code) => {
    setExamPreparations((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const updatePref = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Save ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name is required');
      return;
    }
    try {
      setLoading(true);
      const res = await api.put('/user/profile', {
        name: name.trim(),
        email: email.trim() || undefined,
        preferredLanguage,
        examPreparations,
        profileImage,
        gender: gender || undefined,
        state: state || undefined,
        city: city || undefined,
        bio: bio || undefined,
        dateOfBirth: dateOfBirth || undefined,
        preferences: prefs,
      });
      if (res.data.user) {
        updateUser(res.data.user);
        setHasChanges(false);
        Alert.alert('Success', 'Profile updated', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render Helpers ────────────────────────────────────
  const InputField = ({ label, required, ...props }) => (
    <View style={tw`mb-4`}>
      <Text style={[tw`text-xs font-semibold mb-1.5 px-0.5`, { color: colors.textSecondary }]}>
        {label} {required && <Text style={{ color: colors.error }}>*</Text>}
      </Text>
      <TextInput
        style={[
          tw`rounded-xl px-3.5 py-3 text-sm border`,
          { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
        ]}
        placeholderTextColor={colors.textSecondary}
        {...props}
      />
    </View>
  );

  // ═══════════════════════════════════════════════════════
  return (
    <ScreenWrapper>
      <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
        {/* ─── Header ─────────────────────────────────── */}
        <View
          style={[
            tw`flex-row items-center justify-between px-4 pt-4 pb-3 border-b`,
            { borderColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[tw`text-base font-bold`, { color: colors.text }]}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={[tw`px-3 py-1.5 rounded-lg`, { backgroundColor: colors.surfaceMuted }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={tw`flex-1`}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`px-5 pb-12`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Avatar ─────────────────────────────── */}
            <View style={tw`items-center py-5`}>
              <TouchableOpacity
                style={tw`relative`}
                onPress={showImageOptions}
                disabled={uploading}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    tw`w-24 h-24 rounded-full items-center justify-center border-2 overflow-hidden`,
                    { borderColor: colors.hero, backgroundColor: colors.surface },
                  ]}
                >
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={tw`w-full h-full`} />
                  ) : (
                    <Ionicons name="person" size={48} color={colors.text} />
                  )}
                  {uploading && (
                    <View
                      style={tw`absolute inset-0 bg-black/40 items-center justify-center`}
                    >
                      <ActivityIndicator size="small" color={colors.heroText} />
                    </View>
                  )}
                </View>
                <View
                  style={[
                    tw`absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full items-center justify-center border-2`,
                    { backgroundColor: colors.hero, borderColor: colors.background },
                  ]}
                >
                  <Ionicons name="camera" size={14} color={colors.heroText} />
                </View>
              </TouchableOpacity>
              <Text style={[tw`text-xs mt-2`, { color: colors.textSecondary }]}>
                Tap to change photo
              </Text>
            </View>

            {/* ─── Basic Info ─────────────────────────── */}
            <SectionLabel title="Basic Information" icon="person-outline" colors={colors} />
            <View
              style={[
                tw`rounded-2xl p-4 border`,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <InputField
                label="Name"
                required
                value={name}
                onChangeText={setName}
                placeholder="Your name"
              />
              <InputField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Phone — read only */}
              <View style={tw`mb-4`}>
                <Text
                  style={[tw`text-xs font-semibold mb-1.5 px-0.5`, { color: colors.textSecondary }]}
                >
                  Phone Number
                </Text>
                <View
                  style={[
                    tw`rounded-xl px-3.5 py-3 border opacity-60`,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Text style={[tw`text-sm`, { color: colors.text }]}>{phoneNumber}</Text>
                </View>
                <Text style={[tw`text-[10px] mt-1 px-0.5`, { color: colors.textSecondary }]}>
                  Cannot be changed
                </Text>
              </View>

              <InputField
                label="Date of Birth"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                keyboardType="numeric"
              />

              {/* Bio */}
              <View style={tw`mb-0`}>
                <Text
                  style={[tw`text-xs font-semibold mb-1.5 px-0.5`, { color: colors.textSecondary }]}
                >
                  Bio
                </Text>
                <TextInput
                  style={[
                    tw`rounded-xl px-3.5 py-3 text-sm border min-h-[80px]`,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      textAlignVertical: 'top',
                    },
                  ]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
                <Text
                  style={[tw`text-[10px] mt-1 px-0.5 text-right`, { color: colors.textSecondary }]}
                >
                  {bio.length}/500
                </Text>
              </View>
            </View>

            {/* ─── Gender ─────────────────────────────── */}
            <SectionLabel title="Gender" icon="male-female-outline" colors={colors} />
            <View
              style={[
                tw`rounded-2xl p-4 border`,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <ChipSelect
                options={GENDERS}
                selected={gender}
                onSelect={setGender}
                colors={colors}
              />
            </View>

            {/* ─── Location ───────────────────────────── */}
            <SectionLabel title="Location" icon="location-outline" colors={colors} />
            <View
              style={[
                tw`rounded-2xl p-4 border`,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {/* State Dropdown */}
              <View style={tw`mb-4`}>
                <Text
                  style={[tw`text-xs font-semibold mb-1.5 px-0.5`, { color: colors.textSecondary }]}
                >
                  State
                </Text>
                <TouchableOpacity
                  style={[
                    tw`rounded-xl px-3.5 py-3 border flex-row items-center justify-between`,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                  onPress={() => setShowStateDropdown(!showStateDropdown)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      tw`text-sm`,
                      { color: state ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {state || 'Select your state'}
                  </Text>
                  <Ionicons
                    name={showStateDropdown ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {showStateDropdown && (
                  <View
                    style={[
                      tw`mt-1 rounded-xl border overflow-hidden`,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <ScrollView style={tw`max-h-44`} nestedScrollEnabled>
                      {INDIAN_STATES.map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            tw`px-3.5 py-2.5 border-b`,
                            { borderColor: colors.border + '60' },
                            state === s && { backgroundColor: colors.surfaceMuted },
                          ]}
                          onPress={() => {
                            setState(s);
                            setShowStateDropdown(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              tw`text-sm`,
                              {
                                color: colors.text,
                                fontWeight: state === s ? '600' : '400',
                              },
                            ]}
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <InputField
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="Your city"
              />
            </View>

            {/* ─── Exam Preparation ───────────────────── */}
            <SectionLabel title="Exam Preparation" icon="school-outline" colors={colors} />
            <View
              style={[
                tw`rounded-2xl p-4 border`,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {categoriesLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <ChipSelect
                  options={categories.map((c) => ({ key: c.code, label: c.name }))}
                  selected={examPreparations}
                  onSelect={toggleExamPrep}
                  multi
                  colors={colors}
                />
              )}
            </View>

            {/* ─── Language ───────────────────────────── */}
            <SectionLabel title="Preferred Language" icon="language-outline" colors={colors} />
            <View
              style={[
                tw`rounded-2xl p-4 border`,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <ChipSelect
                options={['English', 'Hindi', 'Both']}
                selected={preferredLanguage}
                onSelect={setPreferredLanguage}
                colors={colors}
              />
            </View>

            {/* ─── Study Preferences ──────────────────── */}
            <SectionLabel title="Preferences" icon="settings-outline" colors={colors} />
            <View
              style={[
                tw`rounded-2xl p-4 border`,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {/* Daily Goal */}
              <View style={tw`mb-4`}>
                <Text
                  style={[tw`text-xs font-semibold mb-2 px-0.5`, { color: colors.textSecondary }]}
                >
                  Daily Study Goal
                </Text>
                <ChipSelect
                  options={STUDY_GOALS.map((m) => ({ key: m, label: `${m}m` }))}
                  selected={prefs.dailyStudyGoal}
                  onSelect={(v) => updatePref('dailyStudyGoal', v)}
                  colors={colors}
                />
              </View>

              {/* Toggles */}
              {[
                {
                  label: 'Push Notifications',
                  key: 'notificationsEnabled',
                },
                {
                  label: 'Show Answers During Test',
                  key: 'showAnswersDuringTest',
                },
                {
                  label: 'Show Explanations After Test',
                  key: 'showExplanationsAfterTest',
                },
                { label: 'Enable Timer', key: 'enableTimer' },
                {
                  label: 'Enable Negative Marking',
                  key: 'enableNegativeMarking',
                },
              ].map((toggle, i, arr) => (
                <ToggleRow
                  key={toggle.key}
                  label={toggle.label}
                  value={prefs[toggle.key]}
                  onChange={(v) => updatePref(toggle.key, v)}
                  colors={colors}
                  isLast={i === arr.length - 1}
                />
              ))}
            </View>

            {/* ─── Save Button ────────────────────────── */}
            <TouchableOpacity
              style={[
                tw`flex-row items-center justify-center py-4 rounded-2xl mt-6 gap-2`,
                {
                  backgroundColor: colors.hero,
                  opacity: loading ? 0.6 : 1,
                  shadowColor: colors.hero,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 6,
                },
              ]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.heroText} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={colors.heroText} />
                  <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ScreenWrapper>
  );
}
