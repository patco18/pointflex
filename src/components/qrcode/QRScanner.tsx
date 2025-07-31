import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate, useParams } from 'react-router-dom';
import { attendanceService } from '../../services/api';
import toast from 'react-hot-toast';

interface QRScannerProps {
  onSuccess?: (result: string) => void;
}

/**
 * Composant pour scanner un QR code et enregistrer sa présence
 */
const QRScanner: React.FC<QRScannerProps> = ({ onSuccess }) => {
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token } = useParams<{ token?: string }>();
  const qrScannerRef = useRef<HTMLDivElement>(null);
  const htmlQrScannerRef = useRef<Html5Qrcode | null>(null);

  // Si un token est fourni dans l'URL, traiter directement ce token
  useEffect(() => {
    if (token) {
      setScanResult(token);
      processQRCode(token);
    }
  }, [token]);
  
  // Nettoyer le scanner QR lorsque le composant est démonté
  useEffect(() => {
    return () => {
      if (htmlQrScannerRef.current) {
        htmlQrScannerRef.current
          .stop()
          .catch(error => console.error("Erreur lors de l'arrêt du scanner:", error));
      }
    };
  }, []);

  // Traiter le QR code scanné
  const processQRCode = async (qrValue: string) => {
    setProcessing(true);
    setScanError(null);
    
    // Arrêter le scanner QR
    if (htmlQrScannerRef.current) {
      await htmlQrScannerRef.current.stop();
    }
    
    try {
      // Extraire le token de l'URL si c'est une URL complète
      let attendanceToken = qrValue;
      if (qrValue.includes('/attendance/qr-checkin/')) {
        attendanceToken = qrValue.split('/attendance/qr-checkin/')[1];
      }
      
      // Obtenir la géolocalisation si disponible
      let geoLocation = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          
          geoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
        } catch (geoError) {
          console.warn("Géolocalisation non disponible:", geoError);
        }
      }
      
      // Appeler l'API pour enregistrer la présence
      const response = await attendanceService.qrCheckin(
        attendanceToken,
        geoLocation
      );
      
      if (response.data && response.data.success) {
        toast.success('Présence enregistrée avec succès');
        if (onSuccess) onSuccess(qrValue);
        
        // Afficher les détails du pointage
        setScanError(null);
        setScanning(false);
        
        // Rediriger vers la page de confirmation après 2 secondes
        setTimeout(() => {
          navigate('/attendance/success', { state: { checkInData: response.data } });
        }, 2000);
      } else {
        setScanError(response.data?.message || 'QR code invalide ou expiré');
        toast.error('Échec de l\'enregistrement de présence');
        // Réactiver le scan après 3 secondes en cas d'erreur
        setTimeout(() => {
          setScanError(null);
          startQrScanner();
        }, 3000);
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement de la présence:', err);
      setScanError(err.response?.data?.message || 'Erreur lors de l\'enregistrement de la présence');
      toast.error('Erreur lors de l\'enregistrement de la présence');
      
      // Réactiver le scan après 3 secondes en cas d'erreur
      setTimeout(() => {
        setScanError(null);
        startQrScanner();
      }, 3000);
    } finally {
      setProcessing(false);
    }
  };

  // Démarrer le scanner QR
  const startQrScanner = async () => {
    if (!qrScannerRef.current) return;

    try {
      const qrCodeId = "qr-reader";
      
      // Créer un élément div pour le scanner QR s'il n'existe pas
      let qrElement = document.getElementById(qrCodeId);
      if (!qrElement) {
        qrElement = document.createElement("div");
        qrElement.id = qrCodeId;
        qrScannerRef.current.appendChild(qrElement);
      }
      
      // Initialiser le scanner QR
      const html5QrCode = new Html5Qrcode(qrCodeId);
      htmlQrScannerRef.current = html5QrCode;
      
      // Configuration du scanner
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      // Démarrer le scanner
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Succès: QR code détecté
          setScanResult(decodedText);
          setScanning(false);
          processQRCode(decodedText);
        },
        (errorMessage) => {
          // Erreur: nous n'affichons pas chaque erreur car c'est normal pendant la recherche
          // console.log(`QR scan error: ${errorMessage}`);
        }
      );
      
      setScanning(true);
    } catch (err) {
      console.error("Erreur lors de l'initialisation du scanner:", err);
      setScanError("Impossible d'initialiser le scanner. Veuillez vérifier que votre appareil a accès à la caméra.");
      toast.error("Impossible d'accéder à la caméra");
    }
  };

  // Demander la géolocalisation de l'utilisateur
  const requestGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // La position est disponible, on démarre le scan
          startQrScanner();
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          // On continue même sans géolocalisation, mais on informe l'utilisateur
          toast.error('La géolocalisation n\'est pas disponible. Votre présence sera enregistrée sans localisation.');
          startQrScanner();
        }
      );
    } else {
      // Le navigateur ne supporte pas la géolocalisation
      toast.error('Votre navigateur ne supporte pas la géolocalisation. Votre présence sera enregistrée sans localisation.');
      startQrScanner();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Scanner le QR code pour pointer</h2>
      
      {scanError && (
        <div className="w-full mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p>{scanError}</p>
        </div>
      )}
      
      {processing ? (
        <div className="flex flex-col items-center justify-center my-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Enregistrement de votre présence...</p>
        </div>
      ) : scanning ? (
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-lg border-4 border-dashed border-gray-300 mb-4 aspect-square">
            <div ref={qrScannerRef} className="w-full h-full"></div>
          </div>
          <p className="text-center text-gray-500 mb-4">Positionnez le QR code dans le cadre</p>
          <button 
            onClick={() => {
              if (htmlQrScannerRef.current) {
                htmlQrScannerRef.current.stop().catch(console.error);
              }
              navigate('/');
            }} 
            className="w-full py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Annuler
          </button>
        </div>
      ) : scanResult && !scanError ? (
        <div className="flex flex-col items-center my-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-600 font-semibold mb-2">QR code scanné avec succès!</p>
          <p className="text-gray-600">Votre présence est en cours d'enregistrement...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center my-6">
          <button 
            onClick={() => requestGeolocation()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Scanner un QR code
          </button>
        </div>
      )}
      
      <div className="mt-6 bg-blue-50 p-4 rounded-lg text-sm text-blue-700 w-full">
        <p className="font-medium">Comment ça marche :</p>
        <ol className="list-decimal pl-5 mt-2">
          <li>Autorisez l'accès à la caméra</li>
          <li>Scannez le QR code affiché à l'entrée du bureau</li>
          <li>Votre présence sera automatiquement enregistrée</li>
          <li>La géolocalisation permettra de confirmer votre emplacement (si activée)</li>
        </ol>
      </div>
      
      {!scanning && !processing && !scanResult && (
        <div className="mt-4 text-sm text-gray-500">
          <p>Appuyez sur le bouton ci-dessus pour commencer le scan. Votre caméra et votre position géographique seront utilisées uniquement pour vérifier votre présence.</p>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
