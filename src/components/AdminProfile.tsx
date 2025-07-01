import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  Shield, 
  Save,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Building,
  Users,
  Settings,
  Download
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminProfile() {
  const { user, isSuperAdmin } = useAuth()
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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // TODO: Implement profile update API call
      // await profileService.updateProfile(profileForm)
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
      // TODO: Implement password change API call
      // await profileService.changePassword({
      //   current_password: passwordForm.current_password,
      //   new_password: passwordForm.new_password
      // })
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

  const exportUserData = async () => {
    try {
      // TODO: Implement data export API call
      // const response = await profileService.exportUserData()
      // const blob = new Blob([response.data], { type: 'application/json' })
      // const url = window.URL.createObjectURL(blob)
      // const a = document.createElement('a')
      // a.href = url
      // a.download = `mes_donnees_${new Date().toISOString().split('T')[0]}.json`
      // a.click()
      // window.URL.revokeObjectURL(url)
      toast.success('Données exportées avec succès!')
    } catch (error) {
      toast.error('Erreur lors de l\'export des données')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Profil Admin</h1>
          <p className="text-gray-600">
            Gérez vos informations et paramètres administrateur
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-xs text-gray-500">
              {isSuperAdmin ? 'Super Admin' : 'Administrateur'}
            </p>
          </div>
          <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Informations administrateur
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
                    placeholder="Votre biographie professionnelle..."
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

        {/* Informations administratives */}
        <div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informations administratives
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
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">
                    {isSuperAdmin ? 'Super Admin' : 'Administrateur'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permissions
                </label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span>Gestion des employés</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4 text-green-600" />
                    <span>Configuration de l'entreprise</span>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-green-600" />
                      <span>Gestion des entreprises</span>
                    </div>
                  )}
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

          {/* Actions */}
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Actions
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={exportUserData}
                className="w-full btn-secondary text-left"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter mes données
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}