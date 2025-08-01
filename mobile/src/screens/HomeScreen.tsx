import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import CheckInScreen from './CheckInScreen';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [showCheckIn, setShowCheckIn] = React.useState(false);

  if (showCheckIn) {
    return <CheckInScreen onDone={() => setShowCheckIn(false)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bienvenue {user?.prenom || user?.email}</Text>
      <Button title="Pointer" onPress={() => setShowCheckIn(true)} />
      <Button title="Déconnexion" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  text: { marginBottom: 20, fontSize: 16 },
});
