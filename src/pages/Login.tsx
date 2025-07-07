import React, { useState, useEffect } from 'react' // Added useEffect
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService, api } from '../services/api' // Added authService and api
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Clock, Mail, Lock, Shield, AlertCircle, CheckCircle, Eye, EyeOff, ShieldCheck, LockKeyhole } from 'lucide-react' // Added ShieldCheck, LockKeyhole

interface LoginForm {
  email: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false) // For primary login
  const [showPassword, setShowPassword] = useState(false)

  // State for 2FA step
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [userIdFor2FA, setUserIdFor2FA] = useState<number | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [loginLoading2FA, setLoginLoading2FA] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset: resetLoginForm } = useForm<LoginForm>()
  // react-hook-form for OTP form if needed, or simple state management
  // For simplicity, using simple state for otpCode
  const { login: contextLogin, serverStatus, checkServerStatus } = useAuth(); // Renamed login to contextLogin from useAuth
  const [emailFor2FA, setEmailFor2FA] = useState<string>(''); // Store email for context login

  useEffect(() => {
    if(checkServerStatus) checkServerStatus();
  }, [checkServerStatus]);

  const handlePrimaryLogin = async (data: LoginForm) => {
    if (serverStatus === 'offline') {
      toast.error('Le serveur backend n\'est pas accessible. Veuillez le démarrer.');
      return;
    }
    setLoading(true); // Use 'loading' for primary, 'loginLoading2FA' for 2FA step
    try {
      const response = await authService.login(data.email, data.password); // Direct API call

      if (response.data.two_factor_required && response.data.user_id) {
        setIs2FARequired(true);
        setUserIdFor2FA(response.data.user_id);
        setEmailFor2FA(data.email);
        toast.success("Vérification en deux étapes requise.");
      } else if (response.data.token && response.data.user) {
        await contextLogin(data.email, data.password);
        toast.success('Connexion réussie!');
        navigate('/');
      } else {
        toast.error("Réponse de connexion inattendue.");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Email ou mot de passe incorrect.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdFor2FA || !otpCode) {
      toast.error("Code OTP requis.");
      return;
    }
    setLoginLoading2FA(true);
    try {
      const response = await authService.verifyLogin2FA(userIdFor2FA, otpCode);

      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        // Storing user object might be large; often just token is stored and user re-fetched or context updated.
        localStorage.setItem('user', JSON.stringify(response.data.user));
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

        // Critical: Update AuthContext.
        // This assumes contextLogin can re-initialize state based on stored token/user.
        await contextLogin(emailFor2FA, "useContextAfter2FA"); // Password not relevant here if contextLogin adapts

        toast.success('Connexion 2FA réussie!');
        navigate('/');
        setIs2FARequired(false);
        setUserIdFor2FA(null);
        setOtpCode('');
        resetLoginForm();
      } else {
        toast.error("Échec de la vérification 2FA. Réponse inattendue.");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Code OTP invalide ou expiré.';
      toast.error(message);
    } finally {
      setLoginLoading2FA(false);
    }
  };

  const handleCancel2FA = () => {
    setIs2FARequired(false);
    setUserIdFor2FA(null);
    setEmailFor2FA('');
    setOtpCode('');
  };

  const getServerStatusDisplay = () => {
    switch (serverStatus) {
      case 'checking':
        return (
          <div className="flex items-center text-yellow-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
            <span className="text-sm">Vérification du serveur...</span>
          </div>
        )
      case 'online':
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-4 w-4 mr-2" />
            <span className="text-sm">Serveur en ligne</span>
          </div>
        )
      case 'offline':
        return (
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="text-sm">Serveur hors ligne</span>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header avec logo */}
        <div className="text-center">
          {/* Logo PointFlex */}
          <div className="mx-auto mb-6 flex justify-center">
            <div className="relative">
              {/* Logo principal */}
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
                <svg 
                  width="40" 
                  height="40" 
                  viewBox="0 0 40 40" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white"
                >
                  <path 
                    d="M8 20 L16 28 L32 12" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              
              {/* Badge de statut */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
                {serverStatus === 'online' ? (
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                ) : serverStatus === 'checking' ? (
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                ) : (
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                )}
              </div>
            </div>
          </div>

          {/* Titre et branding */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              <span className="text-blue-600">Point</span>
              <span className="text-green-500">Flex</span>
            </h1>
            <p className="text-lg font-medium text-gray-700">
              SaaS de Pointage Intelligent
            </p>
            <p className="text-sm text-gray-500">
              Gestion d'équipes multi-entreprises
            </p>
          </div>
          
          {/* Status du serveur */}
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-white shadow-sm border">
            {getServerStatusDisplay()}
          </div>
        </div>
        
        {/* Formulaire de connexion */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {serverStatus === 'offline' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Serveur non accessible</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Veuillez démarrer le backend Flask avec la commande :
                  </p>
                  <code className="block mt-2 p-2 bg-red-100 text-red-800 rounded text-xs font-mono">
                    python backend/app.py
                  </code>
                </div>
              </div>
            </div>
          )}

          {is2FARequired ? (
            // --- 2FA OTP Form ---
            <form className="space-y-6" onSubmit={handle2FASubmit}>
              <div className="text-center">
                <ShieldCheck className="h-10 w-10 text-blue-600 mx-auto mb-2" />
                <h2 className="text-xl font-semibold text-gray-800">Vérification en Deux Étapes</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Entrez le code de votre application d'authentification.
                </p>
              </div>
              <div>
                <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Code de Vérification (6 chiffres)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockKeyhole className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="otpCode"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, '').slice(0,6))}
                    className="input-field pl-10 focus:ring-blue-500 focus:border-blue-500 text-center tracking-widest text-lg"
                    placeholder="123456"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="\d{6}"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loginLoading2FA || serverStatus === 'offline'}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                {loginLoading2FA ? (
                  <div className="flex items-center justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>Vérification...</div>
                ) : (
                  <div className="flex items-center justify-center"><ShieldCheck className="h-5 w-5 mr-2" />Vérifier le Code</div>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel2FA}
                className="w-full text-sm text-blue-600 hover:underline text-center mt-3"
              >
                Annuler et retourner à la connexion
              </button>
            </form>
          ) : (
            // --- Original Email/Password Form ---
            <form className="space-y-6" onSubmit={handleSubmit(handlePrimaryLogin)}> {/* Use handlePrimaryLogin */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email', { 
                    required: 'Email requis',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email invalide'
                    }
                  })}
                  type="email"
                  className="input-field pl-10 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="votre@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password', { required: 'Mot de passe requis' })}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-10 pr-10 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || serverStatus === 'offline'}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Connexion en cours...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Se connecter
                </div>
              )}
            </button>
          </form>
          
          {/* Comptes de démonstration */}
          <div className="mt-8 space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4 font-medium">Comptes de démonstration</p>
            </div>
            
            <div className="space-y-3">
              {/* SuperAdmin */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-500 rounded-lg">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-900">Super Administrateur</p>
                      <p className="text-xs text-red-700">Contrôle total de la plateforme</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      document.querySelector<HTMLInputElement>('input[type="email"]')!.value = 'superadmin@pointflex.com'
                      document.querySelector<HTMLInputElement>('input[type="password"]')!.value = 'superadmin123'
                    }}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    Utiliser
                  </button>
                </div>
                <div className="mt-2 text-xs font-mono text-red-800 bg-red-100 p-2 rounded">
                  superadmin@pointflex.com / superadmin123
                </div>
              </div>
              
              {/* Admin */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-purple-900">Admin Entreprise</p>
                      <p className="text-xs text-purple-700">Gestion d'une entreprise</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      document.querySelector<HTMLInputElement>('input[type="email"]')!.value = 'admin@pointflex.com'
                      document.querySelector<HTMLInputElement>('input[type="password"]')!.value = 'admin123'
                    }}
                    className="text-xs bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    Utiliser
                  </button>
                </div>
                <div className="mt-2 text-xs font-mono text-purple-800 bg-purple-100 p-2 rounded">
                  admin@pointflex.com / admin123
                </div>
              </div>
              
                {/* Employé */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Employé</p>
                      <p className="text-xs text-blue-700">Pointage et consultation</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      document.querySelector<HTMLInputElement>('input[type="email"]')!.value = 'employee@pointflex.com'
                      document.querySelector<HTMLInputElement>('input[type="password"]')!.value = 'employee123'
                    }}
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    Utiliser
                  </button>
                </div>

                {/* Chef de Service */}
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-500 rounded-lg">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">Chef de Service</p>
                        <p className="text-xs text-indigo-700">Gestion d'équipe</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        document.querySelector<HTMLInputElement>('input[type="email"]')!.value = 'chefservice@pointflex.com'
                        document.querySelector<HTMLInputElement>('input[type="password"]')!.value = 'chefservice123'
                      }}
                      className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      Utiliser
                    </button>
                  </div>
                  <div className="mt-2 text-xs font-mono text-indigo-800 bg-indigo-100 p-2 rounded">
                    chefservice@pointflex.com / chefservice123
                  </div>
                </div>

                {/* Chef de Projet */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-900">Chef de Projet</p>
                        <p className="text-xs text-green-700">Suivi des missions</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        document.querySelector<HTMLInputElement>('input[type="email"]')!.value = 'chefprojet@pointflex.com'
                        document.querySelector<HTMLInputElement>('input[type="password"]')!.value = 'chefprojet123'
                      }}
                      className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      Utiliser
                    </button>
                  </div>
                  <div className="mt-2 text-xs font-mono text-green-800 bg-green-100 p-2 rounded">
                    chefprojet@pointflex.com / chefprojet123
                  </div>
                </div>

                {/* Manager */}
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-yellow-500 rounded-lg">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-yellow-900">Manager</p>
                        <p className="text-xs text-yellow-700">Supervision d'équipe</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        document.querySelector<HTMLInputElement>('input[type="email"]')!.value = 'manager@pointflex.com'
                        document.querySelector<HTMLInputElement>('input[type="password"]')!.value = 'manager123'
                      }}
                      className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      Utiliser
                    </button>
                  </div>
                  <div className="mt-2 text-xs font-mono text-yellow-800 bg-yellow-100 p-2 rounded">
                    manager@pointflex.com / manager123
                  </div>
                </div>

                {/* Auditeur */}
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-orange-900">Auditeur</p>
                        <p className="text-xs text-orange-700">Lecture seule</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        document.querySelector<HTMLInputElement>('input[type="email"]')!.value = 'auditeur@pointflex.com'
                        document.querySelector<HTMLInputElement>('input[type="password"]')!.value = 'auditeur123'
                      }}
                      className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      Utiliser
                    </button>
                  </div>
                  <div className="mt-2 text-xs font-mono text-orange-800 bg-orange-100 p-2 rounded">
                    auditeur@pointflex.com / auditeur123
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              © 2024 PointFlex SaaS - Solution de pointage intelligente
            </p>
            <div className="flex justify-center space-x-4 mt-2 text-xs text-gray-400">
              <span>v2.0.0</span>
              <span>•</span>
              <span>Multi-tenant</span>
              <span>•</span>
              <span>Géolocalisation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
