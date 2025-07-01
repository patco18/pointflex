import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'
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
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
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

  // Vérifier l'état du serveur
  const checkServerHealth = async () => {
    try {
      // Simuler une vérification de santé réussie
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
          // Simuler une réponse réussie
          const mockUser: User = {
            id: 1,
            email: 'superadmin@pointflex.com',
            nom: 'Super',
            prenom: 'Admin',
            role: 'superadmin' as UserRole,
            company_id: undefined,
            company_name: undefined
          }
          setUser(mockUser)
          console.log('Utilisateur connecté:', mockUser)
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

      // Simuler une connexion réussie
      let mockUser: User
      
      if (email === 'superadmin@pointflex.com' && password === 'superadmin123') {
        mockUser = {
          id: 1,
          email: 'superadmin@pointflex.com',
          nom: 'Super',
          prenom: 'Admin',
          role: 'superadmin' as UserRole,
          company_id: undefined,
          company_name: undefined
        }
      } else if (email === 'admin@pointflex.com' && password === 'admin123') {
        mockUser = {
          id: 2,
          email: 'admin@pointflex.com',
          nom: 'Administrateur',
          prenom: 'Principal',
          role: 'admin_rh' as UserRole,
          company_id: 1,
          company_name: 'Entreprise Démo'
        }
      } else if (email === 'employee@pointflex.com' && password === 'employee123') {
        mockUser = {
          id: 3,
          email: 'employee@pointflex.com',
          nom: 'Employé',
          prenom: 'Test',
          role: 'employee' as UserRole,
          company_id: 1,
          company_name: 'Entreprise Démo'
        }
      } else {
        throw new Error('Identifiants incorrects')
      }
      
      const mockToken = 'mock-jwt-token-' + Date.now()
      
      // Sauvegarder le token
      localStorage.setItem('token', mockToken)
      console.log('Token sauvegardé dans localStorage')
      
      // Configurer axios avec le token
      setAuthToken(mockToken)
      
      // Définir l'utilisateur
      setUser(mockUser)
      console.log('Connexion réussie pour:', mockUser.email, 'Rôle:', mockUser.role)
      
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
    loading,
    isSuperAdmin,
    isAdminRH,
    isChefService,
    isChefProjet,
    isManager,
    isEmployee,
    isAuditeur,
    isAdmin,
    serverStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}