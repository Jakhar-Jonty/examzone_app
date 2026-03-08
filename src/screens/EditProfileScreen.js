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
      <Ionicons name={icon} size={16} color={colors.primary} />
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
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.background, borderColor: colors.border },
            ]}
            onPress={() => onSelect(key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                tw`text-xs font-semibold`,
                { color: isActive ? '#fff' : colors.text },
              ]}
            >
              {label}
            </Text>
            {isActive && multi && (
              <Ionicons name="checkmark" size={12} color="#fff" style={tw`ml-1`} />
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
            style={[tw`px-3 py-1.5 rounded-lg`, { backgroundColor: colors.primary + '15' }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[tw`text-sm font-semibold`, { color: colors.primary }]}>Save</Text>
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
                    { borderColor: colors.primary, backgroundColor: colors.surface },
                  ]}
                >
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={tw`w-full h-full`} />
                  ) : (
                    <Ionicons name="person" size={48} color={colors.primary} />
                  )}
                  {uploading && (
                    <View
                      style={tw`absolute inset-0 bg-black/40 items-center justify-center`}
                    >
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </View>
                <View
                  style={[
                    tw`absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full items-center justify-center border-2`,
                    { backgroundColor: colors.primary, borderColor: colors.background },
                  ]}
                >
                  <Ionicons name="camera" size={14} color="#fff" />
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
                            state === s && { backgroundColor: colors.primary + '10' },
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
                                color: state === s ? colors.primary : colors.text,
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
                <ActivityIndicator size="small" color={colors.primary} />
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
                  backgroundColor: colors.primary,
                  opacity: loading ? 0.6 : 1,
                  shadowColor: colors.primary,
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={tw`text-sm font-bold text-white`}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ScreenWrapper>
  );
}






// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   TextInput,
//   Alert,
//   ActivityIndicator,
//   Image,
//   Platform,
//   Switch,
// } from 'react-native';
// import ScreenWrapper from '../components/ScreenWrapper';
// import { useTheme } from '../context/ThemeContext';
// import { useAuth } from '../context/AuthContext';
// import { Ionicons } from '@expo/vector-icons';
// import * as ImagePicker from 'expo-image-picker';
// import api from '../services/api';
// import { useCategories } from '../hooks/useCategories';


// const GENDERS = [
//   { label: 'Male', value: 'male' },
//   { label: 'Female', value: 'female' },
//   { label: 'Other', value: 'other' },
//   { label: 'Prefer not to say', value: 'prefer-not-to-say' },
// ];
// const INDIAN_STATES = [
//   'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
//   'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
//   'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
//   'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
//   'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
//   'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh',
// ];
// const THEMES = ['light', 'dark', 'auto'];
// const STUDY_GOALS = [30, 60, 90, 120, 180]; // minutes

// // Helper to extract examPrep codes from any format
// const getExamPrepCodes = (examPreparations) => {
//   if (!examPreparations || examPreparations.length === 0) return [];
//   const first = examPreparations[0];
//   if (typeof first === 'string') return examPreparations;
//   // Object format — we just show all EXAM_PREPS as selected if category matches
//   return [];
// };

// export default function EditProfileScreen({ navigation }) {
//   const { colors, isDark } = useTheme();
//   const { user, updateUser } = useAuth();
//   const { categories, loading: categoriesLoading } = useCategories();
//   const [loading, setLoading] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [showStateDropdown, setShowStateDropdown] = useState(false);

//   // Personal Info
//   const [name, setName] = useState(user?.name || '');
//   const [email, setEmail] = useState(user?.email || '');
//   const [phoneNumber] = useState(user?.phoneNumber || '');
//   const [profileImage, setProfileImage] = useState(user?.profileImage || null);
//   const [imageUri, setImageUri] = useState(user?.profileImage || null);
//   const [gender, setGender] = useState(user?.gender || '');
//   const [state, setState] = useState(user?.state || '');
//   const [city, setCity] = useState(user?.city || '');
//   const [bio, setBio] = useState(user?.bio || '');
//   const [dateOfBirth, setDateOfBirth] = useState(
//     user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''
//   );

//   // Exam & Language — store selected category codes
//   const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'English');
//   const [examPreparations, setExamPreparations] = useState(() => {
//     // Support both string array and object array formats
//     const preps = user?.examPreparations || [];
//     if (preps.length === 0) return [];
//     if (typeof preps[0] === 'string') return preps;
//     // Object format — codes not directly available, will be matched after categories load
//     return [];
//   });

//   // Preferences
//   const [prefs, setPrefs] = useState({
//     notificationsEnabled: user?.preferences?.notificationsEnabled ?? true,
//     dailyStudyGoal: user?.preferences?.dailyStudyGoal ?? 60,
//     theme: user?.preferences?.theme ?? 'light',
//     showAnswersDuringTest: user?.preferences?.showAnswersDuringTest ?? false,
//     showExplanationsAfterTest: user?.preferences?.showExplanationsAfterTest ?? true,
//     enableTimer: user?.preferences?.enableTimer ?? true,
//     enableNegativeMarking: user?.preferences?.enableNegativeMarking ?? true,
//   });

//   const styles = createStyles(colors);

//   // When categories load, pre-select chips for users with object-format examPreparations
//   useEffect(() => {
//     if (categories.length === 0) return;
//     const preps = user?.examPreparations || [];
//     if (preps.length === 0 || typeof preps[0] === 'string') return;
//     // Object format: match category ObjectIds to codes
//     const categoryIdToCode = {};
//     categories.forEach(cat => { categoryIdToCode[cat._id] = cat.code; });
//     const codes = preps
//       .map(p => categoryIdToCode[p.category?.toString?.() || p.category])
//       .filter(Boolean);
//     if (codes.length > 0) setExamPreparations(codes);
//   }, [categories]);

//   useEffect(() => {
//     (async () => {
//       if (Platform.OS !== 'web') {
//         const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
//         if (status !== 'granted') {
//           Alert.alert('Permission Required', 'We need access to your photos to set a profile picture.');
//         }
//       }
//     })();

//   }, []);

//   const pickImage = async () => {
//     try {
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaType.Images,
//         allowsEditing: true,
//         aspect: [1, 1],
//         quality: 0.8,
//       });
//       if (!result.canceled && result.assets[0]) {
//         setImageUri(result.assets[0].uri);
//         await uploadImage(result.assets[0].uri);
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to pick image');
//     }
//   };

//   const takePhoto = async () => {
//     try {
//       const { status } = await ImagePicker.requestCameraPermissionsAsync();
//       if (status !== 'granted') {
//         Alert.alert('Permission Required', 'We need camera access to take a photo.');
//         return;
//       }
//       const result = await ImagePicker.launchCameraAsync({
//         allowsEditing: true, aspect: [1, 1], quality: 0.8,
//       });
//       if (!result.canceled && result.assets[0]) {
//         setImageUri(result.assets[0].uri);
//         await uploadImage(result.assets[0].uri);
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to take photo');
//     }
//   };

//   const uploadImage = async (uri) => {
//     try {
//       setUploading(true);
//       const formData = new FormData();
//       const filename = uri.split('/').pop();
//       const match = /\.(\w+)$/.exec(filename);
//       const type = match ? `image/${match[1]}` : 'image/jpeg';
//       formData.append('file', {
//         uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
//         name: filename,
//         type,
//       });
//       const response = await api.post('/user/profile/upload-image', formData, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//       });
//       if (response.data.url) {
//         setProfileImage(response.data.url);
//         setImageUri(response.data.url);
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to upload image');
//     } finally {
//       setUploading(false);
//     }
//   };

//   const toggleExamPrep = (prep) => {
//     setExamPreparations(prev =>
//       prev.includes(prep) ? prev.filter(p => p !== prep) : [...prev, prep]
//     );
//   };

//   const handleSave = async () => {
//     if (!name.trim()) {
//       Alert.alert('Validation Error', 'Name is required');
//       return;
//     }
//     try {
//       setLoading(true);
//       const response = await api.put('/user/profile', {
//         name: name.trim(),
//         email: email.trim() || undefined,
//         preferredLanguage,
//         examPreparations,
//         profileImage,
//         gender: gender || undefined,
//         state: state || undefined,
//         city: city || undefined,
//         bio: bio || undefined,
//         dateOfBirth: dateOfBirth || undefined,
//         preferences: prefs,
//       });
//       if (response.data.user) {
//         updateUser(response.data.user);
//         Alert.alert('Success', 'Profile updated successfully', [
//           { text: 'OK', onPress: () => navigation.goBack() },
//         ]);
//       }
//     } catch (error) {
//       Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const SectionHeader = ({ title, icon }) => (
//     <View style={styles.sectionHeader}>
//       <Ionicons name={icon} size={18} color={colors.primary} />
//       <Text style={styles.sectionTitle}>{title}</Text>
//     </View>
//   );

//   const ToggleRow = ({ label, value, onChange }) => (
//     <View style={styles.toggleRow}>
//       <Text style={styles.toggleLabel}>{label}</Text>
//       <Switch
//         value={value}
//         onValueChange={onChange}
//         trackColor={{ false: colors.border, true: colors.primary + '80' }}
//         thumbColor={value ? colors.primary : colors.textSecondary}
//       />
//     </View>
//   );

//   return (
//     <ScreenWrapper>
//       <View style={styles.container}>
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={24} color={colors.text} />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Edit Profile</Text>
//           <View style={{ width: 24 }} />
//         </View>

//         <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

//           {/* ── Profile Image ── */}
//           <View style={styles.imageSection}>
//             <View style={styles.avatarContainer}>
//               {imageUri ? (
//                 <Image source={{ uri: imageUri }} style={styles.avatarImage} />
//               ) : (
//                 <Ionicons name="person" size={60} color={colors.primary} />
//               )}
//               {uploading && (
//                 <View style={styles.uploadingOverlay}>
//                   <ActivityIndicator size="small" color="#FFF" />
//                 </View>
//               )}
//             </View>
//             <View style={styles.imageButtons}>
//               <TouchableOpacity style={[styles.imageButton, styles.imageButtonPrimary]} onPress={pickImage} disabled={uploading}>
//                 <Ionicons name="image-outline" size={18} color="#FFF" />
//                 <Text style={styles.imageButtonText}>Gallery</Text>
//               </TouchableOpacity>
//               <TouchableOpacity style={[styles.imageButton, styles.imageButtonSecondary]} onPress={takePhoto} disabled={uploading}>
//                 <Ionicons name="camera-outline" size={18} color={colors.primary} />
//                 <Text style={[styles.imageButtonText, { color: colors.primary }]}>Camera</Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* ── Basic Info ── */}
//           <SectionHeader title="Basic Information" icon="person-outline" />
//           <View style={styles.card}>
//             <View style={styles.inputGroup}>
//               <Text style={styles.label}>Name *</Text>
//               <TextInput style={styles.input} value={name} onChangeText={setName}
//                 placeholder="Your name" placeholderTextColor={colors.textSecondary} />
//             </View>
//             <View style={styles.inputGroup}>
//               <Text style={styles.label}>Email</Text>
//               <TextInput style={styles.input} value={email} onChangeText={setEmail}
//                 placeholder="your@email.com" placeholderTextColor={colors.textSecondary}
//                 keyboardType="email-address" autoCapitalize="none" />
//             </View>
//             <View style={styles.inputGroup}>
//               <Text style={styles.label}>Phone Number</Text>
//               <TextInput style={[styles.input, styles.inputDisabled]} value={phoneNumber} editable={false} />
//               <Text style={styles.helperText}>Phone number cannot be changed</Text>
//             </View>
//             <View style={styles.inputGroup}>
//               <Text style={styles.label}>Date of Birth</Text>
//               <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth}
//                 placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary}
//                 keyboardType="numeric" />
//             </View>
//             <View style={styles.inputGroup}>
//               <Text style={styles.label}>Bio</Text>
//               <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio}
//                 placeholder="Tell us about yourself (max 500 chars)"
//                 placeholderTextColor={colors.textSecondary}
//                 multiline numberOfLines={3} maxLength={500} />
//               <Text style={styles.helperText}>{bio.length}/500</Text>
//             </View>
//           </View>

//           {/* ── Gender ── */}
//           <SectionHeader title="Gender" icon="male-female-outline" />
//           <View style={styles.card}>
//             <View style={styles.chipContainer}>
//               {GENDERS.map(g => (
//                 <TouchableOpacity key={g.value}
//                   style={[styles.chip, gender === g.value && styles.chipSelected]}
//                   onPress={() => setGender(g.value)}>
//                   <Text style={[styles.chipText, gender === g.value && styles.chipTextSelected]}>
//                     {g.label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>

//           {/* ── Location ── */}
//           <SectionHeader title="Location" icon="location-outline" />
//           <View style={styles.card}>
//             <View style={styles.inputGroup}>
//               <Text style={styles.label}>State</Text>
//               <TouchableOpacity style={styles.input} onPress={() => setShowStateDropdown(!showStateDropdown)}>
//                 <Text style={state ? { color: colors.text } : { color: colors.textSecondary }}>
//                   {state || 'Select your state'}
//                 </Text>
//               </TouchableOpacity>
//               {showStateDropdown && (
//                 <View style={styles.dropdown}>
//                   <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
//                     {INDIAN_STATES.map(s => (
//                       <TouchableOpacity key={s} style={styles.dropdownItem}
//                         onPress={() => { setState(s); setShowStateDropdown(false); }}>
//                         <Text style={[styles.dropdownText, state === s && { color: colors.primary, fontWeight: '700' }]}>
//                           {s}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </View>
//               )}
//             </View>
//             <View style={styles.inputGroup}>
//               <Text style={styles.label}>City</Text>
//               <TextInput style={styles.input} value={city} onChangeText={setCity}
//                 placeholder="Your city" placeholderTextColor={colors.textSecondary} />
//             </View>
//           </View>

//           {/* ── Exam Preparation ── */}
//           <SectionHeader title="Exam Preparation" icon="school-outline" />
//           <View style={styles.card}>
//             {categoriesLoading ? (
//               <ActivityIndicator size="small" color={colors.primary} />
//             ) : (
//               <View style={styles.chipContainer}>
//                 {categories.map(cat => (
//                   <TouchableOpacity key={cat._id}
//                     style={[styles.chip, examPreparations.includes(cat.code) && styles.chipSelected]}
//                     onPress={() => toggleExamPrep(cat.code)}>
//                     <Text style={[styles.chipText, examPreparations.includes(cat.code) && styles.chipTextSelected]}>
//                       {cat.name}
//                     </Text>
//                     {examPreparations.includes(cat.code) && (
//                       <Ionicons name="checkmark" size={14} color="#FFF" style={{ marginLeft: 4 }} />
//                     )}
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}
//           </View>

//           {/* ── Language ── */}
//           <SectionHeader title="Preferred Language" icon="language-outline" />
//           <View style={styles.card}>
//             <View style={styles.chipContainer}>
//               {['English', 'Hindi', 'Both'].map(lang => (
//                 <TouchableOpacity key={lang}
//                   style={[styles.chip, preferredLanguage === lang && styles.chipSelected]}
//                   onPress={() => setPreferredLanguage(lang)}>
//                   <Text style={[styles.chipText, preferredLanguage === lang && styles.chipTextSelected]}>
//                     {lang}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>

//           {/* ── Study Preferences ── */}
//           <SectionHeader title="Study Preferences" icon="settings-outline" />
//           <View style={styles.card}>
//             {/* Daily Study Goal */}
//             <View style={styles.inputGroup}>
//               <Text style={styles.label}>Daily Study Goal</Text>
//               <View style={styles.chipContainer}>
//                 {STUDY_GOALS.map(mins => (
//                   <TouchableOpacity key={mins}
//                     style={[styles.chip, prefs.dailyStudyGoal === mins && styles.chipSelected]}
//                     onPress={() => setPrefs(p => ({ ...p, dailyStudyGoal: mins }))}>
//                     <Text style={[styles.chipText, prefs.dailyStudyGoal === mins && styles.chipTextSelected]}>
//                       {mins}m
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>

//             {/* Theme */}
//             <View style={styles.inputGroup}>
//               <Text style={styles.label}>Theme</Text>
//               <View style={styles.chipContainer}>
//                 {THEMES.map(t => (
//                   <TouchableOpacity key={t}
//                     style={[styles.chip, prefs.theme === t && styles.chipSelected]}
//                     onPress={() => setPrefs(p => ({ ...p, theme: t }))}>
//                     <Text style={[styles.chipText, prefs.theme === t && styles.chipTextSelected]}>
//                       {t.charAt(0).toUpperCase() + t.slice(1)}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>

//             <ToggleRow label="Push Notifications"
//               value={prefs.notificationsEnabled}
//               onChange={v => setPrefs(p => ({ ...p, notificationsEnabled: v }))} />
//             <ToggleRow label="Show Answers During Test"
//               value={prefs.showAnswersDuringTest}
//               onChange={v => setPrefs(p => ({ ...p, showAnswersDuringTest: v }))} />
//             <ToggleRow label="Show Explanations After Test"
//               value={prefs.showExplanationsAfterTest}
//               onChange={v => setPrefs(p => ({ ...p, showExplanationsAfterTest: v }))} />
//             <ToggleRow label="Enable Timer"
//               value={prefs.enableTimer}
//               onChange={v => setPrefs(p => ({ ...p, enableTimer: v }))} />
//             <ToggleRow label="Enable Negative Marking"
//               value={prefs.enableNegativeMarking}
//               onChange={v => setPrefs(p => ({ ...p, enableNegativeMarking: v }))} />
//           </View>

//           {/* ── Save Button ── */}
//           <TouchableOpacity
//             style={[styles.saveButton, loading && styles.saveButtonDisabled]}
//             onPress={handleSave}
//             disabled={loading}
//           >
//             {loading ? (
//               <ActivityIndicator size="small" color="#FFF" />
//             ) : (
//               <>
//                 <Ionicons name="checkmark-circle" size={20} color="#FFF" />
//                 <Text style={styles.saveButtonText}>Save Changes</Text>
//               </>
//             )}
//           </TouchableOpacity>

//         </ScrollView>
//       </View>
//     </ScreenWrapper>
//   );
// }

// const createStyles = (colors) =>
//   StyleSheet.create({
//     container: { flex: 1, backgroundColor: colors.background },
//     header: {
//       flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//       paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
//       borderBottomWidth: 1, borderBottomColor: colors.border,
//     },
//     backButton: { padding: 8 },
//     headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
//     scrollView: { flex: 1 },
//     scrollContent: { padding: 16, paddingBottom: 48 },

//     // Section
//     sectionHeader: {
//       flexDirection: 'row', alignItems: 'center', gap: 8,
//       marginTop: 20, marginBottom: 8, paddingHorizontal: 4,
//     },
//     sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
//     card: {
//       backgroundColor: colors.surface,
//       borderRadius: 16, padding: 16,
//       borderWidth: 1, borderColor: colors.border,
//     },

//     // Image
//     imageSection: { alignItems: 'center', marginBottom: 8 },
//     avatarContainer: {
//       width: 110, height: 110, borderRadius: 55,
//       backgroundColor: colors.surface,
//       justifyContent: 'center', alignItems: 'center',
//       marginBottom: 12, borderWidth: 3, borderColor: colors.primary,
//       overflow: 'hidden', position: 'relative',
//     },
//     avatarImage: { width: '100%', height: '100%' },
//     uploadingOverlay: {
//       position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
//       backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
//     },
//     imageButtons: { flexDirection: 'row', gap: 10 },
//     imageButton: {
//       flexDirection: 'row', alignItems: 'center',
//       paddingVertical: 9, paddingHorizontal: 14,
//       borderRadius: 12, gap: 6,
//     },
//     imageButtonPrimary: { backgroundColor: colors.primary },
//     imageButtonSecondary: {
//       backgroundColor: colors.surface,
//       borderWidth: 1, borderColor: colors.primary,
//     },
//     imageButtonText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

//     // Inputs
//     inputGroup: { marginBottom: 14 },
//     label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
//     input: {
//       backgroundColor: colors.background,
//       borderRadius: 10, padding: 13,
//       fontSize: 15, color: colors.text,
//       borderWidth: 1, borderColor: colors.border,
//     },
//     inputDisabled: { color: colors.textSecondary },
//     textArea: { minHeight: 80, textAlignVertical: 'top' },
//     helperText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

//     // Chips
//     chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
//     chip: {
//       paddingHorizontal: 14, paddingVertical: 9,
//       borderRadius: 20, backgroundColor: colors.background,
//       borderWidth: 1, borderColor: colors.border,
//       flexDirection: 'row', alignItems: 'center',
//     },
//     chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
//     chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
//     chipTextSelected: { color: '#FFF' },

//     // Dropdown
//     dropdown: {
//       marginTop: 4, backgroundColor: colors.surface,
//       borderRadius: 10, borderWidth: 1, borderColor: colors.border,
//       overflow: 'hidden',
//     },
//     dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
//     dropdownText: { fontSize: 14, color: colors.text },

//     // Toggle
//     toggleRow: {
//       flexDirection: 'row', alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingVertical: 10,
//       borderBottomWidth: 1, borderBottomColor: colors.border + '60',
//     },
//     toggleLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },

//     // Save
//     saveButton: {
//       flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
//       backgroundColor: colors.primary, borderRadius: 14,
//       padding: 16, gap: 8, marginTop: 24,
//       shadowColor: colors.primary,
//       shadowOffset: { width: 0, height: 4 },
//       shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
//     },
//     saveButtonDisabled: { opacity: 0.6 },
//     saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
//   });
