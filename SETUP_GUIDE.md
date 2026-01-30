# GoPrep Mobile App - Setup Guide

## ✅ What's Been Built

### 1. **Authentication Screens**
- **Login Screen** (`src/screens/LoginScreen.js`)
  - Phone number and password input
  - Form validation
  - Modern UI with dark/light theme support
  - Connected to backend API

- **Sign Up Screen** (`src/screens/SignUpScreen.js`)
  - Full registration form
  - Exam preparation selection (SSC, Banking, HSSC)
  - Language preference (English/Hindi)
  - Password confirmation
  - Connected to backend API

### 2. **Theme System**
- **Theme Context** (`src/context/ThemeContext.js`)
  - Automatic dark/light mode detection
  - Manual theme switching
  - Theme persistence
  - Color scheme matching the design (green accents, dark backgrounds)

### 3. **Authentication System**
- **Auth Context** (`src/context/AuthContext.js`)
  - JWT token management
  - User state management
  - Auto-login on app start
  - Secure token storage

### 4. **API Integration**
- **API Service** (`src/services/api.js`)
  - Axios instance with interceptors
  - Automatic token injection
  - Error handling
  - Token expiration handling

- **Auth Service** (`src/services/authService.js`)
  - Login
  - Register
  - OTP verification (ready for future use)
  - Password management

### 5. **Navigation**
- **App Navigator** (`src/navigation/AppNavigator.js`)
  - Stack navigation
  - Protected routes
  - Automatic redirect based on auth state

## 🎨 UI Features

The UI matches the modern design from your reference image:
- ✅ Dark theme with bright green accents (#00FF88)
- ✅ Rounded corners (16px border radius)
- ✅ Clean, modern layout
- ✅ Smooth animations and transitions
- ✅ Light theme support
- ✅ Responsive design

## 🔧 Configuration Required

### 1. Backend API URL

**Update `src/services/api.js`** with your backend URL:

```javascript
const API_URL = __DEV__
  ? Platform.select({
      android: 'http://10.0.2.2:5000/api', // Android emulator
      ios: 'http://localhost:5000/api', // iOS simulator
      default: 'http://localhost:5000/api',
    })
  : 'https://your-backend-url.com/api'; // Production - UPDATE THIS!
```

**For Physical Device Testing:**
1. Find your computer's IP address:
   - Windows: `ipconfig` → Look for IPv4 Address
   - Mac/Linux: `ifconfig` → Look for inet
2. Update the API_URL to use your IP: `http://YOUR_IP:5000/api`
3. Make sure your phone and computer are on the same network
4. Ensure your backend allows connections from your network

### 2. Backend CORS Configuration

Make sure your backend (`backend/server.js`) allows requests from your mobile app. The current setup should work, but verify CORS is configured correctly.

## 🚀 Testing the App

### 1. Start the Backend
```bash
cd ../backend
npm run dev
```

### 2. Start the Mobile App
```bash
cd mobile
npm start
```

### 3. Test on Device/Emulator
- Scan QR code with Expo Go (physical device)
- Or press `a` for Android / `i` for iOS (emulator)

### 4. Test Login/Sign Up
- Try creating a new account
- Test login with existing credentials
- Verify theme switching (if you add a toggle button)

## 📱 Current Flow

1. **App Starts** → Checks for stored token
2. **If No Token** → Shows Login Screen
3. **User Logs In/Signs Up** → Token saved → Redirects to Home
4. **If Token Exists** → Auto-login → Shows Home Screen

## 🔄 Next Steps

1. **Update API URL** for your environment
2. **Test the connection** with your backend
3. **Build Dashboard Screen** (currently just a placeholder)
4. **Add more screens** from your web app
5. **Add theme toggle button** in settings
6. **Add loading states** and better error handling
7. **Add OTP verification flow** if needed

## 🐛 Troubleshooting

### API Connection Issues
- **Android Emulator**: Use `10.0.2.2` instead of `localhost`
- **iOS Simulator**: Use `localhost`
- **Physical Device**: Use your computer's IP address
- **Check**: Backend server is running and accessible

### Navigation Issues
- Make sure all dependencies are installed: `npm install`
- Clear cache: `npx expo start -c`

### Theme Not Working
- Check if `ThemeContext` is properly wrapped in `App.js`
- Verify theme is being used in screens

## 📚 Dependencies Installed

- `@react-navigation/native` - Navigation
- `@react-navigation/native-stack` - Stack navigation
- `react-native-screens` - Screen components
- `react-native-safe-area-context` - Safe area handling
- `@react-native-async-storage/async-storage` - Local storage
- `axios` - HTTP client
- `@expo/vector-icons` - Icons

## 🎯 API Endpoints Used

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (for token verification)

All endpoints are ready to use and match your backend API structure!

