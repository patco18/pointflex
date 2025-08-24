import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { api, authService, healthService } from '../services/api'
import { UserRole } from '../types/roles'
import toast from 'react-hot-toast'

interface User {
  id: number
  email: string
  nom: string
  prenom: string
  role: UserRole
  company_id?: number | undefined
  company_name?: string | undefined
  company_logo_url?: string | undefined
  company_theme_color?: string | undefined
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchUser?: () => Promise<void>
  loading: boolean
  isSuperAdmin: boolean
  isAdminRH: boolean
  isChefService: boolean
  isChefProjet: boolean
  isManager: boolean
  isEmployee: boolean
  isAuditeur: boolean
  isAdmin: boolean // Garde la compatibilité - inclut admin_rh
  serverStatus: 'checking' | 'online' | 'offline'
  checkServerStatus: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const initializedRef = useRef(false)

  // Vérifier l'état du serveur
  const checkServerHealth = async () => {
    try {
      await healthService.check()
      setServerStatus('online')
      return true
    } catch (error) {
      console.error('Erreur lors de la vérification de santé:', error)
      setServerStatus('offline')
      return false
    }
  }

  // Configurer le token dans les headers axios
  const setAuthToken = (token: string | null) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      console.log('Token configuré dans axios:', token.substring(0, 20) + '...')
    } else {
      delete api.defaults.headers.common['Authorization']
      console.log('Token supprimé des headers axios')
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      if (initializedRef.current) return
      initializedRef.current = true

      console.log('Initialisation de l\'authentification...')

      // Vérifier d'abord si le serveur est en ligne
      const isServerOnline = await checkServerHealth()

      if (!isServerOnline) {
        setLoading(false)
        toast.error('Le serveur backend n\'est pas accessible. Veuillez le démarrer.')
        return
      }

      const token = localStorage.getItem('token')
      console.log('Token trouvé dans localStorage:', token ? 'Oui' : 'Non')

      if (token) {
        setAuthToken(token)
        try {
          console.log('Vérification du token avec /auth/me...')
          const resp = await authService.me()
          setUser(resp.data.user)
          console.log('Utilisateur connecté:', resp.data.user)
        } catch (error) {
          console.error('Échec de validation du token:', error)
          localStorage.removeItem('token')
          setAuthToken(null)
          toast.error('Session expirée, veuillez vous reconnecter')
        }
      } else {
        console.log('Aucun token trouvé, utilisateur non connecté')
      }
      setLoading(false)
    }

    initAuth()

    // Vérifier périodiquement l'état du serveur
    const healthCheckInterval = setInterval(checkServerHealth, 30000) // Toutes les 30 secondes

    return () => clearInterval(healthCheckInterval)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log('Tentative de connexion pour:', email)
      
      // Vérifier d'abord si le serveur est accessible
      const isServerOnline = await checkServerHealth()
      if (!isServerOnline) {
        throw new Error('Le serveur backend n\'est pas accessible')
      }

      const resp = await authService.login(email, password)
      const { token, user } = resp.data
      localStorage.setItem('token', token)
      console.log('Token sauvegardé dans localStorage')
      setAuthToken(token)
      setUser(user)
      console.log('Connexion réussie pour:', user.email, 'Rôle:', user.role)
      
    } catch (error: any) {
      console.error('Erreur de connexion:', error)
      if (error.message.includes('serveur') || error.code === 'ECONNREFUSED') {
        throw new Error('Impossible de se connecter au serveur. Veuillez vérifier que le backend est démarré.')
      }
      throw error
    }
  }

  const logout = () => {
    console.log('Déconnexion...')
    localStorage.removeItem('token')
    setAuthToken(null)
    setUser(null)
    console.log('Déconnexion terminée')
  }

  // Rafraîchir les informations utilisateur depuis l'API
  const fetchUser = async () => {
    try {
      const resp = await authService.me()
      setUser(resp.data.user)
    } catch (error) {
      console.error('Erreur lors du rafraîchissement utilisateur:', error)
    }
  }

  // Définition des rôles avec le nouveau système
  const isSuperAdmin = user?.role === 'superadmin'
  const isAdminRH = user?.role === 'admin_rh'
  const isChefService = user?.role === 'chef_service'
  const isChefProjet = user?.role === 'chef_projet'
  const isManager = user?.role === 'manager'
  const isEmployee = user?.role === 'employee'
  const isAuditeur = user?.role === 'auditeur'
  
  // Garde la compatibilité avec l'ancien système
  const isAdmin = isSuperAdmin || isAdminRH

  const value = {
    user,
    login,
    logout,
    fetchUser,
    loading,
    isSuperAdmin,
    isAdminRH,
    isChefService,
    isChefProjet,
    isManager,
    isEmployee,
    isAuditeur,
    isAdmin,
    serverStatus,
    checkServerStatus: checkServerHealth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}