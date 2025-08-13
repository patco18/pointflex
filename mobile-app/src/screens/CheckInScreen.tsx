import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import attendanceService from '../services/attendanceService';

export default function CheckInScreen({ navigation }: any) {
  // États pour la gestion de la localisation et du chargement
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Demander et obtenir la position actuelle
  useEffect(() => {
    (async () => {
      // Demander les permissions de localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Permission de localisation refusée');
        setLoading(false);
        return;
      }
      
      try {
        // Obtenir la position actuelle
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        setLocation(currentLocation);
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Impossible d\'obtenir votre localisation');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Effectuer un pointage
  const handleCheckIn = async () => {
    if (!location) {
      Alert.alert('Erreur', 'Votre localisation n\'a pas pu être déterminée');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Appel au service de pointage
      const result = await attendanceService.checkInOffice({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy != null ? location.coords.accuracy : 0
      });
      
      // Afficher un message de succès ou d'erreur
      if (result.success) {
        Alert.alert(
          'Pointage réussi',
          'Votre pointage a été enregistré avec succès',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Erreur', result.message || 'Une erreur est survenue');
      }
    } catch (error: any) {
      let message = 'Une erreur est survenue lors du pointage';
      
      // Extraire le message d'erreur de la réponse si disponible
      if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      
      Alert.alert('Erreur', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pointage Bureau</Text>
        <Text style={styles.subtitle}>Vérifiez votre position et validez</Text>
      </View>
      
      <View style={styles.mapContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
        ) : errorMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => navigation.replace('CheckIn')}
            >
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : location ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            {/* Marqueur pour la position actuelle */}
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="Votre position"
            />
            
            {/* Cercle d'incertitude basé sur la précision */}
            <Circle
              center={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              radius={location.coords.accuracy != null ? location.coords.accuracy : 10}
              strokeColor="rgba(59, 130, 246, 0.5)"
              fillColor="rgba(59, 130, 246, 0.2)"
            />
          </MapView>
        ) : null}
      </View>
      
      <View style={styles.infoContainer}>
        {location && (
          <View>
            <Text style={styles.infoLabel}>Précision de localisation</Text>
            <Text style={styles.infoValue}>
              {(location.coords.accuracy != null ? location.coords.accuracy : 0).toFixed(0)} mètres
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button, 
            styles.checkInButton,
            (submitting || !location) && styles.disabledButton
          ]}
          onPress={handleCheckIn}
          disabled={submitting || !location}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.checkInButtonText}>Valider le pointage</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#334155',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 5,
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loader: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  infoContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 30 : 15, // Extra padding for iOS
  },
  button: {
    padding: 15,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    marginRight: 10,
    flex: 1,
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
  checkInButton: {
    backgroundColor: '#3B82F6',
    flex: 2,
  },
  checkInButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
  },
});
