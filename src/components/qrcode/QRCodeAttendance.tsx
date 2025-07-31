import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface QRCodeAttendanceProps {
  companyId: string;
  officeId: string;
  validityMinutes?: number; // Durée de validité du QR code en minutes
  size?: number; // Taille du QR code
}

/**
 * Composant pour générer un QR code pour les pointages
 * Le QR code contient une URL unique avec un token qui permet de valider la présence d'un employé
 */
const QRCodeAttendance: React.FC<QRCodeAttendanceProps> = ({
  companyId,
  officeId,
  validityMinutes = 5,
  size = 256
}) => {
  const [qrValue, setQrValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(validityMinutes * 60);
  const navigate = useNavigate();

  // Générer un nouveau token pour le QR code
  const generateQRCode = async () => {
    setLoading(true);
    try {
      const response = await api.post('/attendance/generate-qr-token', {
        companyId,
        officeId,
        validityMinutes
      });
      
      if (response.data && response.data.token) {
        // Construire l'URL complète que les employés scannent
        const qrUrl = `${window.location.origin}/attendance/qr-checkin/${response.data.token}`;
        setQrValue(qrUrl);
        setRefreshCounter(validityMinutes * 60);
      } else {
        setError('Erreur lors de la génération du QR code');
      }
    } catch (err) {
      console.error('Erreur lors de la génération du QR code:', err);
      setError('Erreur lors de la génération du QR code');
      toast.error('Impossible de générer le QR code');
    } finally {
      setLoading(false);
    }
  };

  // Générer un QR code au chargement du composant
  useEffect(() => {
    generateQRCode();
    
    // Nettoyer le timer lors du démontage du composant
    return () => {};
  }, [companyId, officeId, validityMinutes]);

  // Mettre à jour le compteur toutes les secondes et régénérer le QR code lorsqu'il expire
  useEffect(() => {
    if (refreshCounter <= 0) {
      generateQRCode();
      return;
    }

    const timer = setInterval(() => {
      setRefreshCounter(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshCounter]);

  // Formater le temps restant
  const formatTimeRemaining = () => {
    const minutes = Math.floor(refreshCounter / 60);
    const seconds = refreshCounter % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  };

  if (loading && !qrValue) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Génération du QR code en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
          <p>{error}</p>
        </div>
        <button 
          onClick={() => generateQRCode()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Scanner pour pointer</h2>
      <p className="text-gray-600 mb-4">
        Demandez à l'employé de scanner ce QR code pour enregistrer sa présence
      </p>
      
      <div className="mb-6 p-4 border-2 border-gray-300 rounded-lg">
        {qrValue && <QRCode value={qrValue} size={size} level="H" />}
      </div>
      
      <div className="flex flex-col items-center mb-4">
        <p className="text-sm text-gray-500">Ce QR code expire dans:</p>
        <p className="text-2xl font-bold text-blue-600">{formatTimeRemaining()}</p>
      </div>
      
      <div className="flex space-x-4">
        <button 
          onClick={() => generateQRCode()} 
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Générer un nouveau QR code
        </button>
        <button 
          onClick={() => navigate('/admin/attendance/history')} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Voir l'historique des pointages
        </button>
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded-lg text-sm text-blue-700 w-full">
        <p className="font-medium">Comment ça marche :</p>
        <ol className="list-decimal pl-5 mt-2">
          <li>Affichez ce QR code sur un écran visible à l'entrée du bureau</li>
          <li>Les employés scannent le code avec leur téléphone en arrivant</li>
          <li>Le code expire automatiquement après {validityMinutes} minutes pour plus de sécurité</li>
          <li>Les pointages sont automatiquement associés au bureau et à la date/heure actuels</li>
        </ol>
      </div>
    </div>
  );
};

export default QRCodeAttendance;
