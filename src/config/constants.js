// Backend API Configuration
// For Android emulator, use: http://10.0.2.2:6001/api
// For iOS simulator, use: http://localhost:6001/api
// For physical device, use your computer's IP address: http://YOUR_IP:6001/api

const API_URL = __DEV__
  ? Platform.select({
      android: 'http://10.0.2.2:6001/api', // Android emulator
      ios: 'http://localhost:6001/api', // iOS simulator
      default: 'http://localhost:6001/api',
    })
  : 'https://api.ez.zonty.in/api'; // Production URL

export { API_URL };

