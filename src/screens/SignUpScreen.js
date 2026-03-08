import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useCategories } from '../hooks/useCategories';


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

export default function SignUpScreen({ navigation }) {
  const { colors } = useTheme();
  const { login } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();
  const [formData, setFormData] = useState({
    phoneNumber: '',
    name: '',
    password: '',
    confirmPassword: '',
    examPreparations: [],
    preferredLanguage: 'English',
    gender: '',
    state: '',
    dateOfBirth: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  const toggleExamPreparation = (code) => {
    setFormData((prev) => ({
      ...prev,
      examPreparations: prev.examPreparations.includes(code)
        ? prev.examPreparations.filter((e) => e !== code)
        : [...prev.examPreparations, code],
    }));
  };

  const handleSignUp = async () => {
    if (!formData.phoneNumber.trim() || !formData.name.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (formData.phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (formData.examPreparations.length === 0) {
      Alert.alert('Error', 'Please select at least one exam preparation');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register(
        formData.phoneNumber.trim(),
        formData.password,
        formData.name.trim(),
        formData.examPreparations,
        formData.preferredLanguage,
        {
          gender: formData.gender || undefined,
          state: formData.state || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
        }
      );
      await login(response.token, response.user);
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Sign up to get started</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>

              {/* Phone Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.phoneNumber}
                  onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Full Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Min 6 characters"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.confirmPassword}
                    onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                    <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Exam Preparations */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Exam Preparations <Text style={styles.required}>*</Text></Text>
                {categoriesLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={styles.chipContainer}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat._id}
                        style={[styles.chip, formData.examPreparations.includes(cat.code) && styles.chipSelected]}
                        onPress={() => toggleExamPreparation(cat.code)}
                      >
                        <Text style={[styles.chipText, formData.examPreparations.includes(cat.code) && styles.chipTextSelected]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Gender */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.chipContainer}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g.value}
                      style={[styles.chip, formData.gender === g.value && styles.chipSelected]}
                      onPress={() => setFormData({ ...formData, gender: g.value })}
                    >
                      <Text style={[styles.chipText, formData.gender === g.value && styles.chipTextSelected]}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* State */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>State</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowStateDropdown(!showStateDropdown)}
                >
                  <Text style={formData.state ? { color: colors.text } : { color: colors.textSecondary }}>
                    {formData.state || 'Select your state'}
                  </Text>
                </TouchableOpacity>
                {showStateDropdown && (
                  <View style={styles.dropdown}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {INDIAN_STATES.map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData({ ...formData, state: s });
                            setShowStateDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownText, formData.state === s && { color: colors.primary, fontWeight: '700' }]}>
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Date of Birth */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD (e.g. 2000-01-15)"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.dateOfBirth}
                  onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
                  keyboardType="numeric"
                />
              </View>

              {/* Preferred Language */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Preferred Language</Text>
                <View style={styles.languageContainer}>
                  {['English', 'Hindi'].map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.languageOption, formData.preferredLanguage === lang && styles.languageOptionSelected]}
                      onPress={() => setFormData({ ...formData, preferredLanguage: lang })}
                    >
                      <Text style={[styles.languageText, formData.preferredLanguage === lang && styles.languageTextSelected]}>
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1 },
    content: { flex: 1, padding: 24, justifyContent: 'center' },
    header: { marginBottom: 28, alignItems: 'center' },
    title: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: colors.textSecondary },
    form: { width: '100%' },
    inputContainer: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
    required: { color: '#EF4444' },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    passwordInput: { flex: 1, padding: 16, fontSize: 16, color: colors.text },
    eyeButton: { padding: 16 },
    eyeText: { fontSize: 20 },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
    chipTextSelected: { color: colors.background },
    dropdown: {
      marginTop: 4,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    dropdownText: { fontSize: 15, color: colors.text },
    languageContainer: { flexDirection: 'row', gap: 12 },
    languageOption: {
      flex: 1,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    languageOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    languageText: { fontSize: 16, fontWeight: '600', color: colors.text },
    languageTextSelected: { color: colors.background },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.background, fontSize: 18, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { color: colors.textSecondary, fontSize: 14 },
    footerLink: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  });
