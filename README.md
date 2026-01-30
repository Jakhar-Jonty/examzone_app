# GoPrep Mobile App

Mobile application for GoPrep built with Expo (React Native).

## 📱 Tech Stack

- **Expo SDK**: ~54.0.27 (Latest Stable)
- **React**: 19.1.0
- **React Native**: 0.81.5
- **New Architecture**: Enabled

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Expo Go app on your mobile device (for testing)
- For iOS development: macOS with Xcode
- For Android development: Android Studio

### Installation

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies (already done during setup):
   ```bash
   npm install
   ```

### Running the App

#### Development Server

Start the Expo development server:
```bash
npm start
```

This will:
- Start the Metro bundler
- Display a QR code in the terminal
- Open Expo DevTools in your browser

#### Running on Physical Device

1. Install **Expo Go** app:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code displayed in the terminal with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

#### Running on Emulator/Simulator

**Android:**
```bash
npm run android
```
Make sure you have an Android emulator running or a device connected via USB.

**iOS (macOS only):**
```bash
npm run ios
```
Make sure you have Xcode and iOS Simulator installed.

**Web:**
```bash
npm run web
```

## 📁 Project Structure

```
mobile/
├── App.js                      # Main app component
├── app.json                    # Expo configuration
├── index.js                    # Entry point
├── src/
│   ├── screens/                # Screen components
│   │   ├── LoginScreen.js     # Login screen
│   │   ├── SignUpScreen.js    # Sign up screen
│   │   └── HomeScreen.js      # Home screen (placeholder)
│   ├── navigation/             # Navigation setup
│   │   └── AppNavigator.js    # Main navigator
│   ├── context/                # Context providers
│   │   ├── AuthContext.js     # Authentication context
│   │   └── ThemeContext.js    # Theme context (dark/light mode)
│   ├── services/               # API services
│   │   ├── api.js             # Axios instance
│   │   └── authService.js    # Auth API calls
│   └── config/                 # Configuration
│       └── constants.js       # App constants
├── assets/                     # Images, fonts, and other assets
└── package.json                # Dependencies and scripts
```

## 🔧 Configuration

### App Configuration (`app.json`)
- **App Name**: GoPrep
- **Bundle ID (iOS)**: com.goprep.mobile
- **Package (Android)**: com.goprep.mobile
- **Scheme**: goprep

### Backend API Configuration

**Important**: Update the API URL in `src/services/api.js` based on your setup:

- **Android Emulator**: `http://10.0.2.2:5000/api`
- **iOS Simulator**: `http://localhost:5000/api`
- **Physical Device**: Use your computer's IP address (e.g., `http://192.168.1.100:5000/api`)
- **Production**: Update with your production backend URL

To find your computer's IP address:
- **Windows**: Run `ipconfig` in Command Prompt
- **Mac/Linux**: Run `ifconfig` in Terminal

Make sure your backend server is running and accessible from your device/emulator.

## ✨ Features

✅ **Login & Sign Up Screens**
- Modern UI with dark/light theme support
- Form validation
- Secure password handling
- Integration with backend API

✅ **Theme Support**
- Automatic dark/light mode detection
- Manual theme toggle
- Theme persistence

✅ **Authentication**
- JWT token-based authentication
- Secure token storage with AsyncStorage
- Auto-logout on token expiration

## 📝 Next Steps

1. ✅ Set up navigation - **Done**
2. ✅ Integrate with the backend API - **Done**
3. ✅ Implement authentication - **Done**
4. Build dashboard and other screens
5. Add more features from the web app
6. Configure deep linking if needed

## 🔗 Useful Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo SDK 54 Release Notes](https://blog.expo.dev/expo-sdk-54-is-now-available-6c4a0a2c0c7a)

## 📄 License

Private - GoPrep Project

# examzone_app
