# Troubleshooting: App Not Rendering on Phone

## Common Issues and Solutions

### 1. **Check Metro Bundler**
Make sure Metro bundler is running:
```bash
cd mobile
npm start
```
You should see a QR code in the terminal.

### 2. **Check Device Connection**
- **Physical Device**: Make sure your phone and computer are on the same WiFi network
- **Expo Go**: Make sure you have Expo Go app installed
- **QR Code**: Scan the QR code with Expo Go (Android) or Camera app (iOS)

### 3. **Clear Cache**
If the app still doesn't load, clear the cache:
```bash
npx expo start -c
```

### 4. **Check Console Errors**
Look for errors in:
- Terminal where `npm start` is running
- Expo Go app (shake device to open developer menu)
- Browser DevTools if using web

### 5. **API Connection Issues**
If the app loads but shows errors, check:
- Backend server is running: `cd ../backend && npm run dev`
- API URL is correct in `src/services/api.js`
- For physical device, use your computer's IP address, not `localhost`

### 6. **Check Dependencies**
Make sure all dependencies are installed:
```bash
cd mobile
npm install
```

### 7. **Restart Everything**
1. Stop Metro bundler (Ctrl+C)
2. Close Expo Go app
3. Restart Metro: `npm start`
4. Reload app in Expo Go

### 8. **Check for JavaScript Errors**
Common errors that prevent rendering:
- Syntax errors in code
- Missing imports
- Context provider issues
- Navigation setup errors

### 9. **Verify App Structure**
Make sure these files exist and are correct:
- `App.js` - Main entry point
- `index.js` - Registers the app
- `src/navigation/AppNavigator.js` - Navigation setup
- `src/context/AuthContext.js` - Auth context
- `src/context/ThemeContext.js` - Theme context

### 10. **Check React Native Version Compatibility**
Make sure you're using compatible versions:
- Expo SDK 54
- React 19.1.0
- React Native 0.81.5

## Debug Steps

1. **Add Console Logs**
   Add `console.log('App rendering')` in `App.js` to verify it's loading

2. **Check Loading State**
   The app shows a loading screen while checking authentication. If it's stuck, check:
   - `AuthContext` is loading properly
   - `AsyncStorage` is working
   - No errors in `loadUser` function

3. **Test Without Backend**
   Temporarily comment out the API call in `AuthContext.loadUser` to see if the app renders

4. **Check Network**
   If using physical device, ensure:
   - Phone and computer are on same network
   - Firewall isn't blocking connections
   - Backend CORS allows mobile app

## Still Not Working?

1. Check the terminal for specific error messages
2. Check Expo Go app for error messages (shake device)
3. Try running on web: `npm run web`
4. Try running on emulator: `npm run android` or `npm run ios`

