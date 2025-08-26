import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService, api } from '../services/api' // Added authService and api
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Clock, Mail, Lock, Shield, AlertCircle, CheckCircle, Eye, EyeOff, ShieldCheck, LockKeyhole } from 'lucide-react' // Added ShieldCheck, LockKeyhole

// Désactivation temporaire des avertissements de console pour faciliter le débogage
console.warn = (...args) => {
  // Filtrer les avertissements Firebase qui bloquent la page
  const message = args.join(' ');
  if (message.includes('Firebase') || message.includes('firebase')) {
    return;
  }
  // Conserver les autres avertissements
  console.log('[WARN]', ...args);
};

interface LoginForm {
  email: string
  password: string
}

const demoAccounts = [
  { role: 'Super Administrateur', email: 'superadmin@pointflex.com', password: 'superadmin123' },
  { role: 'Admin Entreprise', email: 'admin@pointflex.com', password: 'admin123' },
  { role: 'Employé', email: 'employee@pointflex.com', password: 'employee123' },
  { role: 'Chef de Service', email: 'chefservice@pointflex.com', password: 'chefservice123' },
  { role: 'Chef de Projet', email: 'chefprojet@pointflex.com', password: 'chefprojet123' },
  { role: 'Manager', email: 'manager@pointflex.com', password: 'manager123' },
  { role: 'Auditeur', email: 'auditeur@pointflex.com', password: 'auditeur123' },
];

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false) // For primary login
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)

  // State for 2FA step
  const [is2FARequired, setIs2FARequired] = useState(false)
  const [userIdFor2FA, setUserIdFor2FA] = useState<number | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState('')
  const [loginLoading2FA, setLoginLoading2FA] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset: resetLoginForm, setValue, watch } = useForm<LoginForm>()
  const passwordValue = watch('password', '')
  // react-hook-form for OTP form if needed, or simple state management
  // For simplicity, using simple state for otpCode
  const { login: contextLogin, serverStatus, checkServerStatus } = useAuth(); // Renamed login to contextLogin from useAuth
  const [emailFor2FA, setEmailFor2FA] = useState<string>('') // Store email for context login

  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent']
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500']

  useEffect(() => {
    if(checkServerStatus) {
      console.log("Vérification du statut du serveur...");
      checkServerStatus()
        .then(status => {
          console.log(`Statut du serveur: ${status ? 'en ligne' : 'hors ligne'}`);
        })
        .catch(err => {
          console.error("Erreur lors de la vérification du serveur:", err);
        });
    }
  }, [checkServerStatus]);

  useEffect(() => {
    const account = demoAccounts.find(acc => acc.role === selectedRole)
    if (account) {
      setValue('email', account.email)
      setValue('password', account.password)
    }
  }, [selectedRole, setValue])

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(passwordValue))
  }, [passwordValue])

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
        
        // Redirection basée sur le rôle de l'utilisateur
        const user = response.data.user;
        
        if (user.role === 'admin_rh') {
          navigate('/admin');
        } else if (user.role === 'superadmin') {
          navigate('/superadmin');
        } else if (user.role === 'chef_service') {
          navigate('/chef-service');
        } else if (user.role === 'chef_projet') {
          navigate('/chef-projet');
        } else if (user.role === 'manager') {
          navigate('/manager');
        } else if (user.role === 'auditeur') {
          navigate('/auditeur');
        } else {
          navigate('/');
        }
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
      const message = "Code OTP requis.";
      setOtpError(message);
      toast.error(message);
      return;
    }
    setLoginLoading2FA(true);
    setOtpError('');
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
        
        // Redirection basée sur le rôle de l'utilisateur
        const user = response.data.user;
        
        if (user.role === 'admin_rh') {
          navigate('/admin');
        } else if (user.role === 'superadmin') {
          navigate('/superadmin');
        } else if (user.role === 'chef_service') {
          navigate('/chef-service');
        } else if (user.role === 'chef_projet') {
          navigate('/chef-projet');
        } else if (user.role === 'manager') {
          navigate('/manager');
        } else if (user.role === 'auditeur') {
          navigate('/auditeur');
        } else {
          navigate('/');
        }
        setIs2FARequired(false);
        setUserIdFor2FA(null);
        setOtpCode('');
        resetLoginForm();
      } else {
        const message = "Échec de la vérification 2FA. Réponse inattendue.";
        setOtpError(message);
        toast.error(message);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Code OTP invalide ou expiré.';
      setOtpError(message);
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
    setOtpError('');
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
                    onChange={(e) => {
                      setOtpError('')
                      setOtpCode(e.target.value.replace(/\s/g, '').slice(0, 6))
                    }}
                    className="input-field pl-10 focus:ring-blue-500 focus:border-blue-500 text-center tracking-widest text-lg"
                    placeholder="123456"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="\d{6}"
                  />
                </div>
                <div className="mt-2">
                  <div className="h-1 bg-gray-200 rounded">
                    <div
                      className="h-1 bg-blue-500 rounded transition-all"
                      style={{ width: `${(otpCode.length / 6) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{otpCode.length}/6</p>
                  {otpError && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {otpError}
                    </p>
                  )}
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
            <form className="space-y-6" onSubmit={handleSubmit(handlePrimaryLogin)}> {/* Use handlePrimaryLogin */}
              <div>
                <label htmlFor="demoRole" className="block text-sm font-medium text-gray-700 mb-2">
                  Compte de démonstration
                </label>
                <select
                  id="demoRole"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Choisir un rôle --</option>
                  {demoAccounts.map((acc) => (
                    <option key={acc.role} value={acc.role}>{acc.role}</option>
                  ))}
                </select>
              </div>
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
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded">
                  <div
                    className={`h-2 rounded ${strengthColors[passwordStrength]}`}
                    style={{ width: `${(passwordStrength / 4) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">{strengthLabels[passwordStrength]}</p>
              </div>
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
          
        )}

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

          {/* DEBUG SECTION */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-md">
              <h4 className="text-sm font-bold text-gray-500">Débogage</h4>
              <div className="text-xs">
                <p>État du serveur: <span className="font-mono">{serverStatus}</span></p>
                <button
                  className="mt-2 bg-gray-200 px-2 py-1 rounded text-gray-800"
                  onClick={async () => {
                    try {
                      const response = await fetch('http://localhost:5000/api/health');
                      const data = await response.json();
                      toast.success('Serveur accessible: ' + JSON.stringify(data));
                    } catch (e) {
                      toast.error('Erreur de connexion au serveur: ' + e.message);
                    }
                  }}
                >
                  Tester connexion API
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
