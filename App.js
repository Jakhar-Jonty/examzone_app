import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './global.css';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { AppConfigProvider } from './src/context/AppConfigContext';
import AppNavigator from './src/navigation/AppNavigator';

function AppContent() {
  const { isDark } = useTheme();
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
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

