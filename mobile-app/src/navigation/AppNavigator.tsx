import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Import des écrans
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CheckInScreen from '../screens/CheckInScreen';

// Définition des types de navigation
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  CheckIn: undefined;
};

// Création de la pile de navigation
const Stack = createNativeStackNavigator<RootStackParamList>();

// Écran de chargement
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}

export default function AppNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  // Afficher l'écran de chargement pendant la vérification de l'authentification
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {/* @ts-ignore - Le problème d'ID est spécifique à un bug TypeScript avec React Navigation */}
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {isLoggedIn ? (
          // Écrans pour utilisateurs connectés
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CheckIn" component={CheckInScreen} />
          </>
        ) : (
          // Écran de connexion pour utilisateurs non connectés
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ 
              animationTypeForReplace: isLoggedIn ? 'push' : 'pop',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
