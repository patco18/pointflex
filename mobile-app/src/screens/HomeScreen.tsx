import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import attendanceService from '../services/attendanceService';

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fonction pour charger les données de pointage du jour
  const loadTodayAttendance = async () => {
    try {
      const data = await attendanceService.getTodayAttendance();
      setTodayAttendance(data);
    } catch (error) {
      console.error('Error loading today attendance:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les informations de pointage');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    loadTodayAttendance();
  }, []);

  // Fonction pour rafraîchir les données en tirant vers le bas
  const onRefresh = () => {
    setRefreshing(true);
    loadTodayAttendance();
  };

  // Naviguer vers l'écran de pointage
  const handleCheckIn = () => {
    navigation.navigate('CheckIn');
  };

  // Fonction pour se déconnecter
  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: () => logout() 
        }
      ]
    );
  };

  // Formatage de l'heure
  const formatTime = (dateString: string) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Bonjour,</Text>
          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
        ) : (
          <>
            <View style={styles.attendanceCard}>
              <Text style={styles.cardTitle}>Pointage du jour</Text>
              
              <View style={styles.attendanceRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeLabel}>Entrée</Text>
                  <Text style={styles.timeValue}>
                    {todayAttendance?.checkin ? formatTime(todayAttendance.checkin) : '--:--'}
                  </Text>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.timeColumn}>
                  <Text style={styles.timeLabel}>Sortie</Text>
                  <Text style={styles.timeValue}>
                    {todayAttendance?.checkout ? formatTime(todayAttendance.checkout) : '--:--'}
                  </Text>
                </View>
              </View>
              
              {todayAttendance?.status && (
                <View style={[
                  styles.statusBadge,
                  todayAttendance.status === 'late' && styles.lateBadge,
                  todayAttendance.status === 'ontime' && styles.ontimeBadge,
                ]}>
                  <Text style={styles.statusText}>
                    {todayAttendance.status === 'late' ? 'En retard' : 'À l\'heure'}
                  </Text>
                </View>
              )}
            </View>
            
            {!todayAttendance?.checkin && (
              <TouchableOpacity
                style={styles.checkInButton}
                onPress={handleCheckIn}
              >
                <Text style={styles.checkInText}>Pointer maintenant</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  welcome: {
    fontSize: 16,
    color: '#64748B',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
  },
  logoutButton: {
    padding: 10,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  loader: {
    marginTop: 50,
  },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 15,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  timeValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#334155',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 15,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  ontimeBadge: {
    backgroundColor: '#D1FAE5',
  },
  lateBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
    color: '#334155',
  },
  checkInButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkInText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
