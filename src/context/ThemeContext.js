import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('system');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (theme === 'system') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(theme === 'dark');
    }
  }, [theme, systemColorScheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async (newTheme) => {
    try {
      setTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = {
    light: {
      background: '#FEFEFE',
      surface: '#F7F8FA',
      text: '#2D3748',
      textSecondary: '#718096',
      primary: '#16a34a', // Green from frontend
      primaryDark: '#15803d', // Darker green
      primaryGradientEnd: '#059669', // Emerald — matches web's from-green-600 to-emerald-600, keeps white text readable
      border: '#E2E8F0',
      error: '#E53E3E',
      success: '#16a34a',
      card: '#FFFFFF',
      surfaceMuted: '#F3F4F6',
      // Dark "hero" card (home Continue card)
      hero: '#111827',
      heroRaised: '#1F2937',
      heroTrack: '#374151',
      heroText: '#FFFFFF',
      heroTextSecondary: '#D1D5DB',
      heroMuted: '#9CA3AF',
      heroAccent: '#4ade80',
      // Soft accent pairs: fg for icons/text, bg for the tile behind them
      tones: {
        green: { fg: '#15803d', bg: '#F0FDF4' },
        orange: { fg: '#c2410c', bg: '#FFF7ED' },
        blue: { fg: '#1d4ed8', bg: '#EFF6FF' },
        red: { fg: '#b91c1c', bg: '#FEF2F2' },
        purple: { fg: '#6d28d9', bg: '#F5F3FF' },
      },
    },
    dark: {
      background: '#1A202C', // Soft dark
      surface: '#2D3748', // Soft gray
      text: '#F7FAFC',
      textSecondary: '#A0AEC0',
      primary: '#22c55e', // Lighter green for dark mode
      primaryDark: '#16a34a', // Green from frontend
      primaryGradientEnd: '#16a34a',
      border: '#4A5568',
      error: '#FC8181',
      success: '#22c55e',
      card: '#2D3748',
      surfaceMuted: '#374151',
      hero: '#111827',
      heroRaised: '#1F2937',
      heroTrack: '#374151',
      heroText: '#FFFFFF',
      heroTextSecondary: '#D1D5DB',
      heroMuted: '#9CA3AF',
      heroAccent: '#4ade80',
      tones: {
        green: { fg: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
        orange: { fg: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
        blue: { fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
        red: { fg: '#f87171', bg: 'rgba(248,113,113,0.12)' },
        purple: { fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
      },
    },
  };

  const currentColors = colors[isDark ? 'dark' : 'light'];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors: currentColors,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

