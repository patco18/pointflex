import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { profileService } from '../services/api'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Save,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Building,
  Briefcase,
  Bell // For notifications
} from 'lucide-react'
import toast from 'react-hot-toast'
import { requestNotificationPermission, initializeFirebaseApp } from '../firebaseInit' // Added

export default function EmployeeProfile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [profileForm, setProfileForm] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    phone: '',
    address: '',
    country: 'FR',
    date_birth: '',
    bio: '',
    skills: ''
  })

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  // State for push notification permission
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Initialize Firebase early to check notification status
  useEffect(() => {
    initializeFirebaseApp();
    // Update permission state if it changes in browser settings
    const interval = setInterval(() => {
      if (Notification.permission !== notificationPermission) {
        setNotificationPermission(Notification.permission);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [notificationPermission]);


  const handleEnablePushNotifications = async () => {
    setIsSubscribing(true);
    const token = await requestNotificationPermission();
    if (token) {
      toast.success('Notifications push activées !');
      setNotificationPermission('granted');
    } else if (Notification.permission === 'denied') {
      toast.error('Permission de notification refusée. Veuillez l\'activer dans les paramètres de votre navigateur.');
      setNotificationPermission('denied');
    } else {
      toast.info('Permission de notification non accordée.');
      setNotificationPermission('default');
    }
    setIsSubscribing(false);
  };

  // Note: True disabling/unsubscribing requires sending the specific FCM token to the server.
  // This example provides a simpler path for users to manage via browser settings if a token is not readily available.
  const handleDisablePushNotifications = () => {
    // Ideally, retrieve the token and call POST /api/push/unsubscribe
    // For now, guide user or if token known, use it.
    toast.info('Pour désactiver les notifications push, veuillez gérer les permissions de notification pour ce site dans les paramètres de votre navigateur.');
    // If you store the FCM token locally (e.g., in localStorage) when it's obtained:
    // const fcmToken = localStorage.getItem('fcmToken');
    // if (fcmToken) {
    //   api.post('/push/unsubscribe', { token: fcmToken })
    //     .then(() => {
    //       toast.success('Notifications push désactivées.');
    //       localStorage.removeItem('fcmToken');
    //       setNotificationPermission('default'); // Or 'denied' based on browser actual
    //     })
    //     .catch(() => toast.error('Erreur lors de la désactivation.'));
    // }
  };


  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await profileService.updateProfile(profileForm)
      toast.success('Profil mis à jour avec succès!')
      setEditMode(false)
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    try {
      await profileService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      })
      toast.success('Mot de passe modifié avec succès!')
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
    } catch (error) {
      toast.error('Erreur lors du changement de mot de passe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-gray-600">
            Gérez vos informations personnelles et paramètres
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role}
            </p>
          </div>
          <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-primary-600" />
          </div>
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Informations personnelles
              </h3>
              <button
                onClick={() => setEditMode(!editMode)}
                className="btn-secondary"
              >
                <Edit className="h-4 w-4 mr-2" />
                {editMode ? 'Annuler' : 'Modifier'}
              </button>
            </div>

            <form onSubmit={handleProfileUpdate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={profileForm.prenom}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, prenom: e.target.value }))}
                    disabled={!editMode}
                    className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={profileForm.nom}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, nom: e.target.value }))}
                    disabled={!editMode}
                    className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="input-field bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!editMode}
                    className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="01 23 45 67 89"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={profileForm.date_birth}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, date_birth: e.target.value }))}
                    disabled={!editMode}
                    className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pays
                  </label>
                  <select
                    value={profileForm.country}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                    disabled={!editMode}
                    className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="FR">France</option>
                    <option value="BE">Belgique</option>
                    <option value="CH">Suisse</option>
                    <option value="CA">Canada</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <textarea
                    rows={2}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                    disabled={!editMode}
                    className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="123 Rue de la Paix, 75001 Paris"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Biographie
                  </label>
                  <textarea
                    rows={3}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!editMode}
                    className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Parlez-nous de vous..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compétences
                  </label>
                  <textarea
                    rows={2}
                    value={profileForm.skills}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, skills: e.target.value }))}
                    disabled={!editMode}
                    className="input-field disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="React, TypeScript, Python, etc."
                  />
                </div>
              </div>

              {editMode && (
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sauvegarde...
                      </div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Sauvegarder
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Informations professionnelles */}
        <div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informations professionnelles
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entreprise
                </label>
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {user?.company_name || 'Non spécifié'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rôle
                </label>
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900 capitalize">
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sécurité */}
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sécurité
            </h3>
            
            <form onSubmit={handlePasswordChange}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                      className="input-field pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                    className="input-field"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                    className="input-field"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button 
                  type="submit" 
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Modification...
                    </div>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Changer le mot de passe
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Notification Settings */}
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Notifications Push
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Recevez des alertes importantes même lorsque l'application n'est pas ouverte.
              </p>
              {notificationPermission === 'granted' ? (
                <div>
                  <p className="text-sm text-green-600 font-medium mb-2">
                    Les notifications push sont activées pour ce navigateur.
                  </p>
                  <button
                    onClick={handleDisablePushNotifications}
                    className="btn-secondary text-sm"
                  >
                    Désactiver (via paramètres navigateur)
                  </button>
                </div>
              ) : notificationPermission === 'denied' ? (
                <div>
                  <p className="text-sm text-red-600 font-medium mb-2">
                    Les notifications push sont bloquées par votre navigateur.
                  </p>
                  <p className="text-xs text-gray-500">
                    Pour les activer, veuillez modifier les permissions de notification pour ce site dans les paramètres de votre navigateur.
                  </p>
                </div>
              ) : ( // default
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    Les notifications push ne sont pas encore activées.
                  </p>
                  <button
                    onClick={handleEnablePushNotifications}
                    disabled={isSubscribing}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {isSubscribing ? 'Activation...' : 'Activer les notifications push'}
                  </button>
                </div>
              )}
               <p className="text-xs text-gray-500 mt-1">
                Les paramètres de notification sont spécifiques à chaque navigateur/appareil.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}