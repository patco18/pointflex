import React, { useState, useEffect } from 'react';
import { Bell, Mail, Globe, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { profileService } from '../services/api';

/**
 * Composant pour gérer les préférences de notification de l'utilisateur
 */
const UserNotificationPreferences = () => {
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    in_app_notifications: true,
    attendance_notifications: true,
    leave_notifications: true,
    subscription_notifications: true,
    system_notifications: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Charger les préférences de notification
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        const response = await profileService.getUserNotificationPreferences();
        if (response.data.success) {
          setPreferences(response.data.preferences);
        } else {
          setError(response.data.message || 'Erreur lors du chargement des préférences');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des préférences de notification', error);
        setError('Erreur lors du chargement des préférences');
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  // Mettre à jour les préférences
  const handleSavePreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await profileService.updateUserNotificationPreferences(preferences);
      
      if (response.data.success) {
        setSuccess(true);
        toast.success('Préférences de notification mises à jour avec succès');
      } else {
        setError(response.data.message || 'Erreur lors de la mise à jour des préférences');
        toast.error('Erreur lors de la mise à jour des préférences');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences de notification', error);
      setError('Erreur lors de la mise à jour des préférences');
      toast.error('Erreur lors de la mise à jour des préférences');
    } finally {
      setLoading(false);
      
      // Effacer le message de succès après 3 secondes
      if (success) {
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      }
    }
  };

  // Gérer le changement de préférence
  const handlePreferenceChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences((prev) => ({
      ...prev,
      [name]: event.target.checked
    }));
  };

  return (
    <div className="card mt-6">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <Bell size={24} className="mr-2" />
          <h2 className="text-xl font-semibold">Préférences de notification</h2>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 border border-green-200">
            Vos préférences ont été enregistrées avec succès.
          </div>
        )}

        <div className="space-y-6">
          {/* Canaux de notification */}
          <div>
            <h3 className="font-medium text-lg mb-2">
              Canaux de notification
            </h3>
            <div className="ml-4 space-y-4">
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600"
                    checked={preferences.email_notifications}
                    onChange={handlePreferenceChange('email_notifications')}
                  />
                  <div className="ml-2 flex items-center">
                    <Mail size={18} className="mr-2" />
                    <span>Notifications par email</span>
                  </div>
                </label>
                <p className="text-sm text-gray-500 ml-7">
                  Recevez des notifications importantes par email
                </p>
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600"
                    checked={preferences.push_notifications}
                    onChange={handlePreferenceChange('push_notifications')}
                  />
                  <div className="ml-2 flex items-center">
                    <Globe size={18} className="mr-2" />
                    <span>Notifications push</span>
                  </div>
                </label>
                <p className="text-sm text-gray-500 ml-7">
                  Recevez des notifications push sur votre navigateur
                </p>
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600"
                    checked={preferences.in_app_notifications}
                    onChange={handlePreferenceChange('in_app_notifications')}
                  />
                  <div className="ml-2 flex items-center">
                    <Bell size={18} className="mr-2" />
                    <span>Notifications dans l'application</span>
                  </div>
                </label>
                <p className="text-sm text-gray-500 ml-7">
                  Recevez des notifications dans l'application
                </p>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          {/* Types de notifications */}
          <div>
            <h3 className="font-medium text-lg mb-2">
              Types de notifications
            </h3>
            <div className="ml-4 space-y-4">
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600"
                    checked={preferences.attendance_notifications}
                    onChange={handlePreferenceChange('attendance_notifications')}
                  />
                  <span className="ml-2">Pointages et présences</span>
                </label>
                <p className="text-sm text-gray-500 ml-7">
                  Notifications liées aux pointages et à la présence
                </p>
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600"
                    checked={preferences.leave_notifications}
                    onChange={handlePreferenceChange('leave_notifications')}
                  />
                  <span className="ml-2">Congés et absences</span>
                </label>
                <p className="text-sm text-gray-500 ml-7">
                  Notifications liées aux demandes de congés et absences
                </p>
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600"
                    checked={preferences.subscription_notifications}
                    onChange={handlePreferenceChange('subscription_notifications')}
                  />
                  <div className="ml-2 flex items-center">
                    <AlertCircle size={18} className="mr-2 text-amber-500" />
                    <span>Abonnement et facturation</span>
                  </div>
                </label>
                <p className="text-sm text-gray-500 ml-7">
                  Notifications liées à votre abonnement et à la facturation
                </p>
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600"
                    checked={preferences.system_notifications}
                    onChange={handlePreferenceChange('system_notifications')}
                  />
                  <span className="ml-2">Notifications système</span>
                </label>
                <p className="text-sm text-gray-500 ml-7">
                  Mises à jour, maintenance et notifications système
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="btn-primary"
            onClick={handleSavePreferences}
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer les préférences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotificationPreferences;
