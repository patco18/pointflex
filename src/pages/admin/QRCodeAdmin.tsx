import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface Office {
  id: string;
  name: string;
  address: string;
}

interface QRTokenData {
  token: string;
  expiry: string;
  office: Office;
  created: string;
}

/**
 * Page d'administration pour générer des QR codes pour les pointages
 */
const QRCodeAdmin: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [expiryMinutes, setExpiryMinutes] = useState<number>(30);
  const [qrTokenData, setQrTokenData] = useState<QRTokenData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(5); // minutes
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const navigate = useNavigate();
  
  // URL de l'application (pour générer l'URL complète du QR code)
  const appUrl = window.location.origin;
  
  // Récupérer la liste des bureaux
  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const response = await api.get('/admin/offices');
        if (response.data && response.data.offices) {
          setOffices(response.data.offices);
          // Sélectionner le premier bureau par défaut si la liste est vide
          if (response.data.offices.length > 0 && !selectedOffice) {
            setSelectedOffice(response.data.offices[0].id);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des bureaux:', error);
        toast.error('Impossible de récupérer la liste des bureaux');
      }
    };

    fetchOffices();
  }, [selectedOffice]);

  // Gérer le rafraîchissement automatique du QR code
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefresh && qrTokenData) {
      intervalId = setInterval(() => {
        generateQRCode();
      }, refreshInterval * 60 * 1000); // Convertir les minutes en millisecondes
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, selectedOffice, expiryMinutes]);

  // Générer un nouveau QR code
  const generateQRCode = async () => {
    if (!selectedOffice) {
      toast.error('Veuillez sélectionner un bureau');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.post('/attendance/generate-qr-token', {
        office_id: selectedOffice,
        expiry_minutes: expiryMinutes
      });
      
      if (response.data && response.data.success) {
        setQrTokenData({
          ...response.data,
          created: new Date().toISOString()
        });
        toast.success('QR code généré avec succès');
      } else {
        toast.error('Erreur lors de la génération du QR code');
      }
    } catch (error) {
      console.error('Erreur lors de la génération du QR code:', error);
      toast.error('Impossible de générer le QR code');
    } finally {
      setIsLoading(false);
    }
  };

  // Formater une date en format lisible
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculer le temps restant avant expiration
  const calculateTimeRemaining = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expiré';
    
    const diffMins = Math.floor(diffMs / 60000);
    const mins = diffMins % 60;
    const hours = Math.floor(diffMins / 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} minutes`;
  };

  // URL complète pour le QR code
  const getQRCodeUrl = () => {
    if (!qrTokenData) return '';
    return `${appUrl}/attendance/qr-checkin/${qrTokenData.token}`;
  };

  // Imprimer le QR code
  const printQRCode = () => {
    if (!qrTokenData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les popups pour imprimer');
      return;
    }
    
    // Créer une image à partir du SVG
    const svgElement = document.getElementById('qr-code')?.querySelector('svg');
    let qrImageUrl = '';
    
    if (svgElement) {
      // Convertir le SVG en image base64
      const svgData = new XMLSerializer().serializeToString(svgElement);
      qrImageUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
    
    const office = qrTokenData.office;
    const expiryDate = new Date(qrTokenData.expiry);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${office.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              text-align: center;
            }
            .qr-container {
              margin: 0 auto;
              max-width: 500px;
              padding: 20px;
              border: 2px solid #eaeaea;
              border-radius: 10px;
            }
            .qr-code {
              margin: 20px auto;
              width: 300px;
              height: 300px;
            }
            .office-info {
              margin-top: 20px;
              font-size: 16px;
            }
            .expiry-info {
              margin-top: 10px;
              color: #ff0000;
              font-weight: bold;
            }
            .instructions {
              margin-top: 30px;
              text-align: left;
              font-size: 14px;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="qr-container">
            <h2>Pointage par QR Code</h2>
            <h3>${office.name}</h3>
            <div class="qr-code">
              <img src="${qrImageUrl}" width="100%" />
            </div>
            <div class="office-info">
              ${office.address}
            </div>
            <div class="expiry-info">
              Valable jusqu'à ${expiryDate.toLocaleTimeString('fr-FR')}
            </div>
            <div class="instructions">
              <h4>Instructions:</h4>
              <ol>
                <li>Scannez ce QR code avec l'application PointFlex</li>
                <li>Ou ouvrez l'app et choisissez "Scanner un QR code"</li>
                <li>Assurez-vous d'être physiquement présent au bureau</li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestion des pointages par QR Code</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panneau de configuration */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Générer un nouveau QR code</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bureau
            </label>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              disabled={isLoading}
            >
              <option value="">Sélectionner un bureau</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name} - {office.address}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Durée de validité (minutes)
            </label>
            <input
              type="number"
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(parseInt(e.target.value))}
              min={5}
              max={1440} // 24 heures max
              className="w-full p-2 border border-gray-300 rounded"
              disabled={isLoading}
            />
          </div>
          
          {qrTokenData && (
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  id="autoRefresh"
                  className="mr-2"
                />
                <label htmlFor="autoRefresh" className="text-sm font-medium text-gray-700">
                  Rafraîchir automatiquement
                </label>
              </div>
              
              {autoRefresh && (
                <div className="mb-4 pl-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intervalle de rafraîchissement (minutes)
                  </label>
                  <input
                    type="number"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                    min={1}
                    max={60}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={generateQRCode}
            disabled={isLoading || !selectedOffice}
            className={`w-full py-2 px-4 rounded ${
              isLoading || !selectedOffice
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Génération en cours...
              </span>
            ) : (
              'Générer un QR code'
            )}
          </button>
        </div>
        
        {/* Affichage du QR code */}
        <div className="bg-white p-6 rounded-lg shadow">
          {qrTokenData ? (
            <div className="flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-2">{qrTokenData.office.name}</h2>
              <p className="text-gray-600 mb-4">{qrTokenData.office.address}</p>
              
              <div 
                id="qr-code"
                className="border-4 border-white shadow-lg rounded-lg p-4 bg-white mb-4"
              >
                <QRCodeSVG
                  value={getQRCodeUrl()}
                  size={200}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500">
                  Généré le {formatDate(qrTokenData.created)}
                </p>
                <p className="text-sm font-semibold text-red-500">
                  Expire dans {calculateTimeRemaining(qrTokenData.expiry)}
                </p>
              </div>
              
              <div className="flex space-x-4 w-full">
                <button
                  onClick={printQRCode}
                  className="flex-1 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimer
                  </span>
                </button>
                <button
                  onClick={generateQRCode}
                  className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Rafraîchir
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="p-12 bg-gray-100 rounded-lg mb-4">
                <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <p className="text-gray-600 text-center">
                Générez un QR code pour permettre aux employés de pointer leur présence
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-800 mb-3">
          Comment utiliser les QR codes pour les pointages
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-blue-700">
          <li>
            <strong>Générez un QR code</strong> pour un bureau spécifique et une durée de validité
          </li>
          <li>
            <strong>Affichez ou imprimez le QR code</strong> dans un endroit visible du bureau
          </li>
          <li>
            Les employés peuvent scanner le QR code avec l'application pour enregistrer leur présence
          </li>
          <li>
            Le QR code expire automatiquement après la durée définie pour des raisons de sécurité
          </li>
          <li>
            Activez le rafraîchissement automatique pour maintenir un QR code valide en permanence
          </li>
        </ol>
        
        <div className="mt-4 flex">
          <button
            onClick={() => navigate('/admin/attendance')}
            className="text-blue-700 hover:text-blue-900"
          >
            ← Retour à la gestion des présences
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeAdmin;
