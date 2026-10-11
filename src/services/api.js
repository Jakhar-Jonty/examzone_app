import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// HTTPS via Vercel proxy → EC2 (works on Android + iOS, no cleartext needed).
const PROD_API_URL = 'https://examprepzone.vercel.app/api';
// Direct EC2 HTTP — only if EXPO_PUBLIC_API_URL is set AND native cleartext is enabled.
const EC2_API_URL = 'http://13.233.215.71/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL
  || (__DEV__
    ? Platform.select({
      android: 'http://10.0.2.2:8000/api',
      ios: 'http://localhost:8000/api',
      default: 'http://localhost:8000/api',
    })
    : PROD_API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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
export { API_URL, EC2_API_URL, PROD_API_URL };
