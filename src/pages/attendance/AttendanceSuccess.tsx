import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CheckInData {
  attendanceId: string;
  userId: string;
  userName: string;
  checkInTime: string;
  checkInType: string;
  office: {
    id: string;
    name: string;
    address: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  needsValidation: boolean;
}

interface LocationState {
  checkInData: {
    success: boolean;
    message: string;
    data: CheckInData;
  };
}

const AttendanceSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { checkInData } = (location.state as LocationState) || { checkInData: null };
  
  if (!checkInData?.success || !checkInData.data) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-red-500 mb-2">Erreur</h2>
        <p className="text-gray-600 mb-4">Impossible d'afficher les détails de votre présence.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const { data } = checkInData;
  const checkInTime = new Date(data.checkInTime);
  const formattedTime = format(checkInTime, 'EEEE dd MMMM yyyy à HH:mm', { locale: fr });

  // Fonction pour formater le type de pointage
  const formatCheckInType = (type: string) => {
    switch (type) {
      case 'IN':
        return 'Arrivée';
      case 'OUT':
        return 'Départ';
      case 'BREAK_START':
        return 'Début de pause';
      case 'BREAK_END':
        return 'Fin de pause';
      default:
        return type;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow max-w-md mx-auto my-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold text-green-600 mb-2">Présence enregistrée</h2>
      <p className="text-gray-600 mb-6">Votre pointage a bien été enregistré.</p>
      
      <div className="bg-gray-50 p-4 rounded-lg w-full mb-6">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Collaborateur</h3>
          <p className="text-gray-800 font-medium">{data.userName}</p>
        </div>
        
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Date et heure</h3>
          <p className="text-gray-800">{formattedTime}</p>
        </div>
        
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Type</h3>
          <p className="text-gray-800">{formatCheckInType(data.checkInType)}</p>
        </div>
        
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Bureau</h3>
          <p className="text-gray-800">{data.office.name}</p>
          <p className="text-gray-500 text-sm">{data.office.address}</p>
        </div>
        
        {data.location && (
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Localisation</h3>
            <p className="text-gray-800">Position enregistrée (précision: {Math.round(data.location.accuracy)}m)</p>
          </div>
        )}
        
        {data.needsValidation && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-700 text-sm">
              <span className="font-semibold">Validation requise:</span> Ce pointage nécessite une validation par votre responsable.
            </p>
          </div>
        )}
      </div>
      
      <div className="flex space-x-3 w-full">
        <button
          onClick={() => navigate('/attendance')}
          className="flex-1 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Mes pointages
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
};

export default AttendanceSuccess;
