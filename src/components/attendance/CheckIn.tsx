import React, { useState } from 'react';
import { MapPin, Loader } from 'lucide-react';
import Button from '../ui/button';
import Card from '../ui/card';
import { attendanceService } from '../../services/api';
import { toast } from 'react-hot-toast';

interface CheckInProps {
  onCheckInSuccess?: () => void;
}

const CheckIn: React.FC<CheckInProps> = ({ onCheckInSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Obtenir la position actuelle
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      const { latitude, longitude, accuracy } = position.coords;
      
      // Envoyer la position au serveur
      await attendanceService.checkInOffice({
        latitude,
        longitude,
        accuracy
      });
      
      toast.success('Pointage effectué avec succès!');
      if (onCheckInSuccess) {
        onCheckInSuccess();
      }
    } catch (err) {
      console.error('Erreur lors du pointage:', err);
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Veuillez autoriser l\'accès à la géolocalisation pour pouvoir effectuer le pointage.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Information de position non disponible.');
            break;
          case err.TIMEOUT:
            setError('Délai d\'attente dépassé pour obtenir la position.');
            break;
          default:
            setError('Erreur inconnue lors de la géolocalisation.');
        }
      } else {
        setError('Erreur lors du pointage. Veuillez vérifier que vous êtes dans la zone autorisée.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-4">Effectuer un pointage</h3>
        <p className="text-gray-600 mb-4">
          Cliquez sur le bouton ci-dessous pour effectuer votre pointage d'arrivée. 
          Assurez-vous d'être dans la zone de travail autorisée.
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <Button 
          onClick={handleCheckIn} 
          disabled={loading} 
          color="primary" 
          size="lg"
          className="w-full"
          icon={loading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
        >
          {loading ? 'En cours...' : 'Pointer mon arrivée'}
        </Button>
      </div>
    </Card>
  );
};

export default CheckIn;
