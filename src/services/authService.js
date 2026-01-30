import api from './api';

export const authService = {
  register: async (phoneNumber, password, name, examPreparations, preferredLanguage) => {
    const response = await api.post('/auth/register', {
      phoneNumber,
      password,
      name,
      examPreparations,
      preferredLanguage,
    });
    return response.data;
  },

  sendOTP: async (phoneNumber) => {
    const response = await api.post('/auth/send-otp', { phoneNumber });
    return response.data;
  },

  verifyOTP: async (phoneNumber, otp, name, examPreparations, preferredLanguage) => {
    const response = await api.post('/auth/verify-otp', {
      phoneNumber,
      otp,
      name,
      examPreparations,
      preferredLanguage,
    });
    return response.data;
  },

  login: async (phoneNumber, password) => {
    const response = await api.post('/auth/login', { phoneNumber, password });
    return response.data;
  },

  setPassword: async (password) => {
    const response = await api.post('/auth/set-password', { password });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

