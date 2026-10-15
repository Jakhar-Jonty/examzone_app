import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './global.css';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { setLanguage } from './src/i18n';
import { AppConfigProvider } from './src/context/AppConfigContext';
import AppNavigator from './src/navigation/AppNavigator';

function AppContent() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  // UI language follows the EN/हिन्दी toggle. Set before children render; the
  // navigator remounts on change so every screen picks up the new strings.
  const language = user?.preferredLanguage === 'Hindi' ? 'Hindi' : 'English';
  setLanguage(language);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator key={language} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppConfigProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </AppConfigProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

