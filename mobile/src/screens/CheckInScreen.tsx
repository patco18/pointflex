import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { checkInOffice } from '../services/attendanceService';

export default function CheckInScreen({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMessage('Permission localisation refusée');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await checkInOffice({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, accuracy: loc.coords.accuracy });
      setMessage('Pointage effectué');
    } catch (e) {
      console.error(e);
      setMessage('Erreur lors du pointage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator size="large" /> : (
        <Button title="Valider le pointage" onPress={handleCheckIn} />
      )}
      {message ? <Text style={styles.msg}>{message}</Text> : null}
      <Button title="Retour" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  msg: { marginTop: 20 },
});
