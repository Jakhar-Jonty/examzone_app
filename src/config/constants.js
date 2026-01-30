// Backend API Configuration
// For Android emulator, use: http://10.0.2.2:5000/api
// For iOS simulator, use: http://localhost:5000/api
// For physical device, use your computer's IP address: http://YOUR_IP:5000/api

const API_URL = __DEV__
  ? Platform.select({
      android: 'http://10.0.2.2:5000/api', // Android emulator
      ios: 'http://localhost:5000/api', // iOS simulator
      default: 'http://localhost:5000/api',
    })
  : 'https://examprepzone.vercel.app/api'; // Production URL

export { API_URL };

