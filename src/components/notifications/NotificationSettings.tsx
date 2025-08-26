import React, { useEffect, useState } from 'react';
import { requestNotificationPermission } from '../../firebaseInit';
import { areNotificationsAvailable } from '../../utils/firebaseLoader';

interface NotificationSettingsProps {
  className?: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className = '' }) => {
  const [notificationsSupported, setNotificationsSupported] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier le support des notifications et l'état actuel
  useEffect(() => {
    // Vérifier si les notifications sont supportées
    const supported = areNotificationsAvailable();
    setNotificationsSupported(supported);

    // Vérifier l'état des permissions
    if (supported && 'Notification' in window) {
      const permission = Notification.permission;
      setNotificationsEnabled(permission === 'granted');
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setNotificationsEnabled(true);
        return;
      }
      
      // Vérifier l'état des permissions après la demande
      if ('Notification' in window) {
        const permission = Notification.permission;
        setNotificationsEnabled(permission === 'granted');
        
        if (permission === 'denied') {
          setError('Les notifications ont été refusées. Veuillez les activer dans les paramètres de votre navigateur.');
        }
      }
    } catch (err) {
      console.error('Erreur lors de l\'activation des notifications:', err);
      setError('Une erreur s\'est produite lors de l\'activation des notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  // Afficher un message si les notifications ne sont pas supportées
  if (!notificationsSupported) {
    return (
      <div className={`p-4 bg-gray-100 rounded-md ${className}`}>
        <h3 className="text-lg font-medium mb-2">Notifications Push</h3>
        <p className="text-red-600">
          Votre navigateur ne prend pas en charge les notifications push.
          Veuillez utiliser un navigateur plus récent comme Chrome, Firefox, ou Edge.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded-md shadow-sm ${className}`}>
      <h3 className="text-lg font-medium mb-3">Notifications Push</h3>
      
      {notificationsEnabled ? (
        <div className="flex items-center mb-3">
          <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
          <span className="text-green-700">Notifications activées</span>
        </div>
      ) : (
        <button
          onClick={handleEnableNotifications}
          disabled={isLoading}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Activation...' : 'Activer les notifications'}
        </button>
      )}
      
      {error && (
        <p className="mt-2 text-red-600 text-sm">{error}</p>
      )}
      
      <p className="mt-3 text-sm text-gray-600">
        Les notifications push vous permettent de recevoir des alertes importantes même lorsque vous n'êtes pas sur le site.
      </p>
    </div>
  );
};

export default NotificationSettings;
