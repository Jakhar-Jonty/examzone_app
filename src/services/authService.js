import api from './api';

export const authService = {
  register: async (phoneNumber, password, name, examPreparations, preferredLanguage, extras = {}) => {
    const response = await api.post('/auth/register', {
      phoneNumber,
      password,
      name,
      examPreparations,
      preferredLanguage,
      ...extras,
    });
    return response.data;
  },

  sendOTP: async ({ channel = 'email', phoneNumber, email } = {}) => {
    const response = await api.post('/auth/send-otp', {
      channel,
      ...(channel === 'email' ? { email } : { phoneNumber }),
    });
    return response.data;
  },

  verifyOTP: async (payload) => {
    const response = await api.post('/auth/verify-otp', payload);
    return response.data;
  },

  sendSignupOtp: async (email) => {
    const response = await api.post('/auth/signup/send-otp', { email });
    return response.data;
  },

  verifySignupOtp: async ({ email, otp }) => {
    const response = await api.post('/auth/signup/verify-otp', { email, otp });
    return response.data;
  },

  completeSignup: async ({ signupToken, name, password, phoneNumber }) => {
    const response = await api.post('/auth/signup/complete', {
      signupToken,
      name,
      password,
      ...(phoneNumber ? { phoneNumber } : {}),
    });
    return response.data;
  },

  login: async ({ phoneNumber, email, password }) => {
    const response = await api.post('/auth/login', {
      password,
      ...(email ? { email } : { phoneNumber }),
    });
    return response.data;
  },

  sendLoginOtp: async (email) => {
    const response = await api.post('/auth/login-otp/send', { email });
    return response.data;
  },

  verifyLoginOtp: async ({ email, otp }) => {
    const response = await api.post('/auth/login-otp/verify', { email, otp });
    return response.data;
  },

  google: async (idToken) => {
    const response = await api.post('/auth/google', { idToken });
    return response.data; // { token, user, isNewUser }
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async ({ email, otp, password }) => {
    const response = await api.post('/auth/reset-password', { email, otp, password });
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
