import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Required for React Navigation
import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { PaperProvider } from 'react-native-paper'; // If using React Native Paper for UI components

// TODO: User should ensure an .env file or similar mechanism is set up for API_BASE_URL
// and that it's correctly used in api/client.ts. For Android, during development,
// if backend is on localhost, API_BASE_URL should be 'http://10.0.2.2:PORT' for Android Emulator.
// For physical devices, it should be your computer's network IP.

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* <PaperProvider> // Example if using a UI library like React Native Paper */}
            <AppNavigator />
          {/* </PaperProvider> */}
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
