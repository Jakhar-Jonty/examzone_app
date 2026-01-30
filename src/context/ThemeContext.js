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
      border: '#E2E8F0',
      error: '#E53E3E',
      success: '#16a34a',
      card: '#FFFFFF',
    },
    dark: {
      background: '#1A202C', // Soft dark
      surface: '#2D3748', // Soft gray
      text: '#F7FAFC',
      textSecondary: '#A0AEC0',
      primary: '#22c55e', // Lighter green for dark mode
      primaryDark: '#16a34a', // Green from frontend
      border: '#4A5568',
      error: '#FC8181',
      success: '#22c55e',
      card: '#2D3748',
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

