import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Define types for your navigation stacks if using TypeScript
export type AuthStackParamList = {
  Login: undefined;
  // Signup: undefined; // If you have a signup screen
};

export type MainTabParamList = {
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

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
        // User is signed in, show main app tabs
        <Tab.Navigator>
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Accueil' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres' }} />
        </Tab.Navigator>
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
