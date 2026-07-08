import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Backend runs on port 8000 (see examzone_server/server.js)
// Android emulator: 10.0.2.2 | iOS simulator: localhost | Physical device: your LAN IP
const API_URL = __DEV__
  ? Platform.select({
    android: 'http://10.0.2.2:8000/api',
    ios: 'http://localhost:8000/api',
    default: 'http://localhost:8000/api',
  })
  : 'https://examprepzone.vercel.app/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

