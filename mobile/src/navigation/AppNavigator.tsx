import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';

// Define types for your navigation stacks if using TypeScript
export type AuthStackParamList = {
  Login: undefined;
  // Signup: undefined; // If you have a signup screen
};

export type MainStackParamList = {
  Home: undefined;
  // Profile: undefined;
  // Settings: undefined;
  // ... other screens
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

// Basic SplashScreen placeholder while auth state loads
const SplashScreen = () => <></>;

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // You can render a splash screen or loading indicator here
    // For simplicity, returning null or a basic loading component
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {user ? (
        // User is signed in, show main app stack
        <MainStack.Navigator>
          <MainStack.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }}/>
          {/* Add other main app screens here */}
          {/* e.g., <MainStack.Screen name="Profile" component={ProfileScreen} /> */}
        </MainStack.Navigator>
      ) : (
        // No user signed in, show auth stack
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          {/* <AuthStack.Screen name="Signup" component={SignupScreen} /> */}
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
