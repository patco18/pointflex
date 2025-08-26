import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileService, authService } from '../services/api';
import { 
  User, Mail, Phone, MapPin, Calendar, Save, Edit, Eye, EyeOff, Lock, Building, Briefcase, Bell,
  ShieldCheck, ShieldOff, KeyRound, Copy, LockKeyhole, QrCode, Settings // QrCode might not be used if using qrcode.react directly
} from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react'; // For QR code display
import UserNotificationPreferences from './UserNotificationPreferences';
import NotificationSettings from './notifications/NotificationSettings';

interface Setup2FAData {
  otp_secret: string;
  provisioning_uri: string;
}

export default function EmployeeProfile() {
  const { user, fetchUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    phone: '', // Initialize with empty string
    address: '', // Assuming these are not directly on user object from context initially
    country: 'FR', // Default or from user data if available
    date_birth: '',
    bio: '',
    skills: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Nous utilisons maintenant le composant NotificationSettings à la place

  // State for 2FA
  const [setup2FAData, setSetup2FAData] = useState<Setup2FAData | null>(null);
  const [otpForEnable, setOtpForEnable] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFactorActionLoading, setTwoFactorActionLoading] = useState(false);
  const [showDisable2FAConfirm, setShowDisable2FAConfirm] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [disable2FAOtp, setDisable2FAOtp] = useState('');

  useEffect(() => {
    // Populate profile form with user data once available
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        nom: user.nom || '',
        prenom: user.prenom || '',
        phone: prev.phone, // Keep existing value
        // Populate other fields if they exist on the user object from context
        // address: user.address || '',
        // country: user.country || 'FR',
        // date_birth: user.date_birth ? user.date_birth.split('T')[0] : '', // Assuming ISO string date
      }));
    }
  }, [user]);


  // Suppression de l'effet qui surveillait les permissions de notifications
  // Nous utilisons maintenant le composant NotificationSettings à la place

  const refreshUserData = async () => {
    if (fetchUser) { // fetchUser should be part of your AuthContext to refresh user details
      await fetchUser();
    } else {
        // Fallback or warning if user refresh isn't available
        console.warn("fetchUser function not available in AuthContext. 2FA status might not update immediately in UI.");
    }
  };

  // Fonctions de gestion des notifications supprimées
  // Nous utilisons maintenant le composant NotificationSettings à la place

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await profileService.updateProfile(profileForm);
      toast.success('Profil mis à jour avec succès!');
      setEditMode(false);
      refreshUserData(); // Refresh user data if profile update affects context
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await profileService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Mot de passe modifié avec succès!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      // Error toast is likely handled by API interceptor
    } finally {
      setLoading(false);
    }
  };

  // --- 2FA Handler Functions ---
  const handleInitiate2FASetup = async () => {
    setTwoFactorActionLoading(true);
    setBackupCodes([]);
    try {
      const response = await authService.setup2FA();
      setSetup2FAData({
        otp_secret: response.data.otp_secret,
        provisioning_uri: response.data.provisioning_uri
      });
      toast.success("Scannez le QR code et entrez le code OTP pour vérifier.");
    } catch (error) {
      toast.error("Erreur lors de l'initialisation de la 2FA.");
    } finally {
      setTwoFactorActionLoading(false);
    }
  };

  const handleVerifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpForEnable || !setup2FAData?.otp_secret) {
      toast.error("Code OTP et secret de configuration sont requis.");
      return;
    }
    setTwoFactorActionLoading(true);
    try {
      const response = await authService.verifyAndEnable2FA(otpForEnable, setup2FAData.otp_secret);
      setBackupCodes(response.data.backup_codes || []);
      toast.success("Authentification à deux facteurs activée !");
      setSetup2FAData(null);
      setOtpForEnable('');
      await refreshUserData();
    } catch (error) {
      toast.error("Code OTP invalide ou erreur lors de l'activation.");
    } finally {
      setTwoFactorActionLoading(false);
    }
  };

  const handleDisable2FAConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disable2FAPassword && !disable2FAOtp) {
        toast.error("Veuillez entrer votre mot de passe actuel ou un code OTP/secours valide pour désactiver la 2FA.");
        return;
    }
    setTwoFactorActionLoading(true);
    try {
      await authService.disable2FA({ password: disable2FAPassword, otp_code: disable2FAOtp });
      toast.success("Authentification à deux facteurs désactivée.");
      await refreshUserData();
      setShowDisable2FAConfirm(false);
      setDisable2FAPassword('');
      setDisable2FAOtp('');
    } catch (error) {
      // Error toast likely handled by interceptor
    } finally {
      setTwoFactorActionLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!confirm("Êtes-vous sûr de vouloir regénérer les codes de secours ? Vos anciens codes ne fonctionneront plus.")) return;
    setTwoFactorActionLoading(true);
    setBackupCodes([]);
    try {
        const response = await authService.regenerateBackupCodes({});
        setBackupCodes(response.data.backup_codes || []);
        toast.success("Nouveaux codes de secours générés. Conservez-les précieusement.");
    } catch (error) {
        toast.error("Erreur lors de la regénération des codes de secours.");
    } finally {
        setTwoFactorActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Copié dans le presse-papiers!"))
      .catch(() => toast.error("Erreur de copie."));
  };

  if (!user) {
    return <div className="text-center py-8">Chargement du profil...</div>;
  }

  return (
    <div className="space-y-8 pb-8"> {/* Added pb-8 for spacing */}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-gray-600">
            Gérez vos informations personnelles et paramètres de sécurité.
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Informations personnelles</h3>
              <button onClick={() => setEditMode(!editMode)} className="btn-secondary">
                <Edit className="h-4 w-4 mr-2" />{editMode ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            <form onSubmit={handleProfileUpdate}>
              {/* ... existing profileForm fields ... (ensure they are correctly mapped) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input type="text" value={profileForm.prenom} onChange={(e) => setProfileForm(prev => ({ ...prev, prenom: e.target.value }))} disabled={!editMode} className="input-field disabled:bg-gray-50"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" value={profileForm.nom} onChange={(e) => setProfileForm(prev => ({ ...prev, nom: e.target.value }))} disabled={!editMode} className="input-field disabled:bg-gray-50"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={user?.email} disabled className="input-field bg-gray-100"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))} disabled={!editMode} className="input-field disabled:bg-gray-50"/>
                </div>
                {/* Add other profile fields like address, date_birth, country if needed */}
              </div>
              {editMode && (
                <div className="flex justify-end mt-6 pt-6 border-t"><button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Sauvegarde...' : 'Sauvegarder Profil'}</button></div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Professional Info, Security, Notifications, 2FA */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations professionnelles</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-500">Entreprise</label><p className="text-sm flex items-center"><Building className="h-4 w-4 mr-2 text-gray-400" />{user?.company_name || 'N/A'}</p></div>
              <div><label className="text-xs text-gray-500">Rôle</label><p className="text-sm flex items-center capitalize"><Briefcase className="h-4 w-4 mr-2 text-gray-400" />{user?.role}</p></div>
              {/* Manager info removed as it's not part of the User type */}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sécurité - Mot de passe</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* ... existing password change fields ... */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                <div className="relative"><input type={showPassword ? 'text' : 'password'} value={passwordForm.current_password} onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))} className="input-field pr-10" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <input type={showPassword ? 'text' : 'password'} value={passwordForm.new_password} onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))} className="input-field" required minLength={6}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer nouveau mot de passe</label>
                <input type={showPassword ? 'text' : 'password'} value={passwordForm.confirm_password} onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))} className="input-field" required minLength={6}/>
              </div>
              <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Modification...' : 'Changer Mot de Passe'}</button></div>
            </form>
          </div>

          {/* Push Notification Settings Card - Using our new component */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2 text-gray-700" />
              Notifications Push
            </h3>
            <NotificationSettings />
          </div>

          {/* Two-Factor Authentication Section - NEW */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <LockKeyhole className="h-5 w-5 mr-2 text-gray-700" />
              Authentification à Deux Facteurs (2FA)
            </h3>
            {/* Using a state variable instead of directly checking user.is_two_factor_enabled */}
            {false ? ( // Replace this with a state variable that tracks 2FA status
              // --- 2FA IS ENABLED ---
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
                  <ShieldCheck className="h-6 w-6 text-green-600 mr-3" />
                  <div><p className="text-sm font-medium text-green-700">2FA Activée.</p></div>
                </div>
                <button onClick={handleRegenerateBackupCodes} disabled={twoFactorActionLoading} className="btn-secondary text-sm w-full justify-center">
                  <KeyRound className="h-4 w-4 mr-2" />{twoFactorActionLoading && backupCodes.length === 0 ? 'Génération...' : 'Regénérer Codes de Secours'}
                </button>
                {backupCodes.length > 0 && (
                  <div className="mt-3 p-3 border rounded-md bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Nouveaux codes de secours (enregistrez-les !):</p>
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code) => (<span key={code} className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{code}</span>))}
                    </div>
                  </div>
                )}
                <button onClick={() => setShowDisable2FAConfirm(true)} disabled={twoFactorActionLoading} className="btn-danger text-sm w-full justify-center">
                  <ShieldOff className="h-4 w-4 mr-2" />Désactiver la 2FA
                </button>
                {showDisable2FAConfirm && (
                  <form onSubmit={handleDisable2FAConfirmSubmit} className="mt-4 p-4 border rounded-md bg-yellow-50 border-yellow-200 space-y-3">
                    <p className="text-sm font-medium text-yellow-800">Confirmer la désactivation :</p>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe actuel</label><input type="password" value={disable2FAPassword} onChange={e => setDisable2FAPassword(e.target.value)} className="input-field input-sm" placeholder="Requis si pas de code OTP"/></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Ou Code OTP/Secours Actuel</label><input type="text" value={disable2FAOtp} onChange={e => setDisable2FAOtp(e.target.value)} className="input-field input-sm" placeholder="Optionnel"/></div>
                    <div className="flex justify-end space-x-2"><button type="button" onClick={() => setShowDisable2FAConfirm(false)} className="btn-secondary btn-sm">Annuler</button><button type="submit" className="btn-danger btn-sm" disabled={twoFactorActionLoading}>{twoFactorActionLoading ? "Désactivation..." : "Confirmer"}</button></div>
                  </form>
                )}
              </div>
            ) : setup2FAData ? (
              // --- 2FA SETUP STEP 2: VERIFY ---
              <form onSubmit={handleVerifyAndEnable2FA} className="space-y-4">
                <p className="text-sm text-gray-700">1. Scannez le QR code avec votre application d'authentification.</p>
                <div className="flex justify-center my-3 p-2 border rounded-md bg-white"><QRCodeSVG value={setup2FAData.provisioning_uri} size={128} includeMargin={true} /></div>
                <div className="text-sm text-gray-700">Ou entrez manuellement la clé :
                  <div className="flex items-center space-x-2 p-2 mt-1 border rounded-md bg-gray-100">
                    <span className="text-xs font-mono break-all">{setup2FAData.otp_secret}</span>
                    <button type="button" onClick={() => copyToClipboard(setup2FAData.otp_secret)} title="Copier" className="text-gray-500 hover:text-gray-700"><Copy className="h-4 w-4" /></button>
                  </div>
                </div>
                <div>
                  <label htmlFor="otpForEnable" className="block text-sm font-medium text-gray-700 mb-1">2. Entrez le code de vérification :</label>
                  <input type="text" id="otpForEnable" value={otpForEnable} onChange={(e) => setOtpForEnable(e.target.value)} className="input-field w-full" placeholder="123456" required maxLength={6} pattern="\d{6}"/>
                </div>
                <div className="flex justify-end space-x-3"><button type="button" onClick={() => setSetup2FAData(null)} className="btn-secondary" disabled={twoFactorActionLoading}>Annuler</button><button type="submit" className="btn-primary" disabled={twoFactorActionLoading}>{twoFactorActionLoading ? 'Vérification...' : 'Vérifier & Activer'}</button></div>
              </form>
            ) : backupCodes.length > 0 ? (
                 // --- 2FA SETUP STEP 3: SHOW BACKUP CODES ---
                <div className="p-4 border rounded-md bg-green-50 border-green-200">
                    <h4 className="text-md font-semibold text-green-800 mb-2">2FA Activée ! Conservez vos codes de secours :</h4>
                     <div className="grid grid-cols-2 gap-2 mb-3">
                      {backupCodes.map((code) => (<span key={code} className="text-md font-mono bg-green-100 px-3 py-1.5 rounded text-green-900 tracking-wider">{code}</span>))}
                    </div>
                    <p className="text-sm text-red-700 font-medium">Important : C'est la SEULE fois que ces codes seront affichés. Copiez-les en lieu sûr.</p>
                    <button onClick={() => setBackupCodes([])} className="btn-primary mt-4">J'ai sauvegardé mes codes</button>
                </div>
            ) : (
              // --- 2FA IS NOT ENABLED, NO SETUP IN PROGRESS ---
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <ShieldOff className="h-6 w-6 text-yellow-600 mr-3"/>
                  <div><p className="text-sm font-medium text-yellow-700">2FA non activée.</p><p className="text-xs text-yellow-600">Activez la 2FA pour une sécurité renforcée.</p></div>
                </div>
                <button onClick={handleInitiate2FASetup} disabled={twoFactorActionLoading} className="btn-primary w-full justify-center">
                  <ShieldCheck className="h-4 w-4 mr-2" />{twoFactorActionLoading ? 'Initialisation...' : 'Activer la 2FA'}
                </button>
              </div>
            )}
          </div>

          {/* Section Préférences de notification */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <div className="border-b pb-4 mb-4">
              <h3 className="text-lg font-medium flex items-center">
                <Settings className="h-5 w-5 mr-2 text-indigo-600" />
                Préférences de notification
              </h3>
              <p className="text-sm text-gray-500">
                Configurez vos préférences de notification pour rester informé selon vos besoins
              </p>
            </div>
            <UserNotificationPreferences />
          </div>
        </div>
      </div>
    </div>
  )
}