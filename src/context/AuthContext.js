import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { registerForPush, unregisterPush } from '../services/notificationService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const logout = async () => {
    try {
      await unregisterPush(); // best-effort: stop pushes to this device
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const loadUser = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Optionally verify token with backend
        try {
          const response = await authService.getMe();
          setUser(response.user);
          registerForPush(); // refresh push token for this session
        } catch (error) {
          // Token invalid, clear storage
          await logout();
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (authToken, userData) => {
    try {
      await AsyncStorage.setItem('token', authToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setToken(authToken);
      setUser(userData);
      registerForPush(); // register this device for push after login
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  };

  const updateUser = async (userData) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };

  // Re-fetch the user from backend and persist. Call after a purchase,
  // profile edit, or anything that changes server-side user state.
  const refreshUser = async () => {
    try {
      const response = await authService.getMe();
      await updateUser(response.user);
      return response.user;
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';

  // Premium = active 'premium' (or 'trial') status that hasn't expired.
  const isPremium = (() => {
    if (!user) return false;
    const status = user.subscriptionStatus;
    if (status !== 'premium' && status !== 'trial') return false;
    if (!user.subscriptionExpiry) return true;
    return new Date(user.subscriptionExpiry) > new Date();
  })();

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        isPremium,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

