import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader } from 'lucide-react';
import Button from '../ui/button';
import Card from '../ui/card';
import { attendanceService } from '../../services/api';
import { toast } from 'react-hot-toast';
import { watchPositionUntilAccurate } from '../../utils/geolocation';

interface CheckInProps {
  onCheckInSuccess?: () => void;
}

const CheckIn: React.FC<CheckInProps> = ({ onCheckInSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [searchingPosition, setSearchingPosition] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleCheckIn = async () => {
    setLoading(true);
    setError(null);
    setSearchingPosition(true);
    setCurrentAccuracy(null);

    try {
      const position = await watchPositionUntilAccurate({
        onUpdate: (pos) => {
          if (!isMountedRef.current) return;
          setCurrentAccuracy(Math.round(pos.coords.accuracy));
        }
      });

      const { latitude, longitude, accuracy } = position.coords;

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
      if (isMountedRef.current) {
        setLoading(false);
        setSearchingPosition(false);
      }
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

        {searchingPosition && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4 text-sm">
            Obtention d'une position précise...
            {currentAccuracy !== null && (
              <div className="mt-2 text-blue-800">
                Précision actuelle : <span className="font-semibold">~{currentAccuracy} m</span>
              </div>
            )}
            <div className="mt-1 text-xs text-blue-600">
              Restez immobile et assurez-vous que le GPS est activé pour accélérer la mesure.
            </div>
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
