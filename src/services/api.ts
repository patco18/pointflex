import axios from 'axios'
import toast from 'react-hot-toast'

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 secondes de timeout
})

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`)
    return response
  },
  (error) => {
    console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'NETWORK_ERROR'}`)
    console.error('Détails de l\'erreur API:', error)
    
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      toast.error('Impossible de se connecter au serveur. Veuillez vérifier que le backend est démarré.')
      return Promise.reject(error)
    }
    
    if (error.response?.status === 401) {
      console.log('Erreur 401 - Token invalide ou manquant')
      console.log('Headers de la requête:', error.config?.headers)
      
      // Ne pas rediriger automatiquement si on est déjà sur la page de login
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
        toast.error('Session expirée, veuillez vous reconnecter')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
    
    // Ne pas afficher de toast pour les erreurs 409 (conflit) car elles sont gérées spécifiquement
    if (error.response?.status !== 409) {
      const message = error.response?.data?.message || 'Une erreur est survenue'
      toast.error(message)
    }
    
    return Promise.reject(error)
  }
)

// Intercepteur pour ajouter le token automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log(`🔑 Token ajouté à la requête ${config.method?.toUpperCase()} ${config.url}`)
    } else {
      console.log(`⚠️ Aucun token pour la requête ${config.method?.toUpperCase()} ${config.url}`)
    }
    return config
  },
  (error) => {
    console.error('Erreur dans l\'intercepteur de requête:', error)
    return Promise.reject(error)
  }
)

// Services API avec gestion d'erreurs améliorée
export const authService = {
  login: async (email: string, password: string) => {
    try {
      console.log('🔐 Tentative de connexion...')
      return await api.post('/auth/login', { email, password })
    } catch (error) {
      console.error('❌ Erreur service login:', error)
      throw error
    }
  },
  
  register: async (userData: any) => {
    try {
      return await api.post('/auth/register', userData)
    } catch (error) {
      console.error('Register service error:', error)
      throw error
    }
  },
  
  me: async () => {
    try {
      console.log('👤 Vérification de l\'utilisateur actuel...')
      return await api.get('/auth/me')
    } catch (error) {
      console.error('❌ Erreur service me:', error)
      throw error
    }
  },
}

export const attendanceService = {
  checkInOffice: async (coordinates: { latitude: number; longitude: number }) => {
    try {
      console.log('🏢 Pointage bureau avec coordonnées:', coordinates)
      return await api.post('/attendance/checkin/office', { coordinates })
    } catch (error) {
      console.error('Office checkin service error:', error)
      throw error
    }
  },
  
  checkInMission: async (missionOrderNumber: string, coordinates?: { latitude: number; longitude: number }) => {
    try {
      console.log('🚀 Pointage mission:', missionOrderNumber, coordinates ? 'avec coordonnées' : 'sans coordonnées')
      const data: any = { mission_order_number: missionOrderNumber }
      
      // Ajouter les coordonnées si disponibles
      if (coordinates) {
        data.coordinates = coordinates
      }
      
      return await api.post('/attendance/checkin/mission', data)
    } catch (error) {
      console.error('Mission checkin service error:', error)
      throw error
    }
  },
  
  getAttendance: async (startDate?: string, endDate?: string) => {
    try {
      const params: any = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate

      console.log('📊 Récupération des pointages...')
      return await api.get('/attendance', { params })
    } catch (error) {
      console.error('Get attendance service error:', error)
      throw error
    }
  },
  
  getStats: async () => {
    try {
      console.log('📈 Récupération des statistiques...')
      return await api.get('/attendance/stats')
    } catch (error) {
      console.error('Get stats service error:', error)
      throw error
    }
  },
}

// Services SuperAdmin
export const superAdminService = {
  getCompanies: async () => {
    try {
      console.log('🏢 Récupération des entreprises...')
      return await api.get('/superadmin/companies')
    } catch (error) {
      console.error('Get companies service error:', error)
      throw error
    }
  },
  
  createCompany: async (companyData: any) => {
    try {
      console.log('🏢 Création d\'entreprise...', companyData)
      return await api.post('/superadmin/companies', companyData)
    } catch (error) {
      console.error('Create company service error:', error)
      throw error
    }
  },
  
  updateCompany: async (companyId: number, companyData: any) => {
    try {
      return await api.put(`/superadmin/companies/${companyId}`, companyData)
    } catch (error) {
      console.error('Update company service error:', error)
      throw error
    }
  },
  
  deleteCompany: async (companyId: number) => {
    try {
      return await api.delete(`/superadmin/companies/${companyId}`)
    } catch (error) {
      console.error('Delete company service error:', error)
      throw error
    }
  },
  
  getGlobalStats: async () => {
    try {
      return await api.get('/superadmin/stats')
    } catch (error) {
      console.error('Get global stats service error:', error)
      throw error
    }
  },

  // Services pour la gestion des abonnements - CORRIGÉS
  toggleCompanyStatus: async (companyId: number, data: { suspend: boolean, reason: string, notify_admin: boolean }) => {
    try {
      console.log(`🔄 ${data.suspend ? 'Suspension' : 'Réactivation'} entreprise ${companyId}...`)
      return await api.put(`/superadmin/companies/${companyId}/status`, data)
    } catch (error) {
      console.error('Toggle company status service error:', error)
      throw error
    }
  },

  extendSubscription: async (companyId: number, data: { months: number, reason?: string }) => {
    try {
      console.log(`📅 Prolongation abonnement entreprise ${companyId} de ${data.months} mois...`)
      return await api.put(`/superadmin/companies/${companyId}/extend-subscription`, data)
    } catch (error) {
      console.error('Extend subscription service error:', error)
      throw error
    }
  },

  // ===== NOUVEAUX SERVICES POUR LA CONFIGURATION SYSTÈME =====
  
  getSystemSettings: async () => {
    try {
      console.log('⚙️ Récupération des paramètres système...')
      return await api.get('/superadmin/system/settings')
    } catch (error) {
      console.error('Get system settings service error:', error)
      throw error
    }
  },

  updateSystemSettings: async (settingsData: any) => {
    try {
      console.log('⚙️ Mise à jour des paramètres système...', settingsData)
      return await api.put('/superadmin/system/settings', settingsData)
    } catch (error) {
      console.error('Update system settings service error:', error)
      throw error
    }
  },

  createSystemBackup: async () => {
    try {
      console.log('💾 Création d\'une sauvegarde système...')
      return await api.post('/superadmin/system/backup')
    } catch (error) {
      console.error('Create system backup service error:', error)
      throw error
    }
  },

  toggleMaintenanceMode: async (data: { enabled: boolean, message?: string }) => {
    try {
      console.log(`🔧 ${data.enabled ? 'Activation' : 'Désactivation'} du mode maintenance...`)
      return await api.post('/superadmin/system/maintenance', data)
    } catch (error) {
      console.error('Toggle maintenance mode service error:', error)
      throw error
    }
  },

  getAuditLogs: async (params?: { page?: number, per_page?: number, action?: string, user_id?: number }) => {
    try {
      console.log('📋 Récupération des logs d\'audit...', params)
      return await api.get('/superadmin/system/audit-logs', { params })
    } catch (error) {
      console.error('Get audit logs service error:', error)
      throw error
    }
  },

  getSystemHealth: async () => {
    try {
      console.log('🏥 Vérification de l\'état du système...')
      return await api.get('/superadmin/system/health')
    } catch (error) {
      console.error('Get system health service error:', error)
      throw error
    }
  },

  resetSystemSettings: async () => {
    try {
      console.log('🔄 Réinitialisation des paramètres système...')
      return await api.post('/superadmin/system/reset-settings', { confirm: true })
    } catch (error) {
      console.error('Reset system settings service error:', error)
      throw error
    }
  }
}

// Services Admin
export const adminService = {
  getEmployees: async () => {
    try {
      return await api.get('/admin/employees')
    } catch (error) {
      console.error('Get employees service error:', error)
      throw error
    }
  },
  
  createEmployee: async (employeeData: any) => {
    try {
      console.log('👤 Création d\'employé...', employeeData)
      return await api.post('/admin/employees', employeeData)
    } catch (error) {
      console.error('Create employee service error:', error)
      throw error
    }
  },
  
  updateEmployee: async (employeeId: number, employeeData: any) => {
    try {
      console.log('👤 Mise à jour d\'employé...', employeeData)
      return await api.put(`/admin/employees/${employeeId}`, employeeData)
    } catch (error) {
      console.error('Update employee service error:', error)
      throw error
    }
  },
  
  deleteEmployee: async (employeeId: number) => {
    try {
      console.log('👤 Suppression d\'employé...', employeeId)
      return await api.delete(`/admin/employees/${employeeId}`)
    } catch (error) {
      console.error('Delete employee service error:', error)
      throw error
    }
  },

  getOrganizationData: async () => {
    try {
      console.log('🏗️ Récupération des données organisationnelles...')
      return await api.get('/admin/organization-data')
    } catch (error) {
      console.error('Get organization data service error:', error)
      throw error
    }
  },
  
  // Nouveaux services pour la gestion des départements, services et postes
  getDepartments: async () => {
    try {
      return {
        data: {
          departments: [
            {
              id: 1,
              name: 'Ressources Humaines',
              description: 'Gestion des ressources humaines',
              manager_name: 'Marie Dubois',
              budget: 100000,
              is_active: true,
              employee_count: 5,
              service_count: 2,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            },
            {
              id: 2,
              name: 'Développement',
              description: 'Équipe de développement logiciel',
              manager_name: 'Jean Martin',
              budget: 200000,
              is_active: true,
              employee_count: 10,
              service_count: 2,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            },
            {
              id: 3,
              name: 'Marketing',
              description: 'Équipe marketing et communication',
              manager_name: 'Sophie Lefebvre',
              budget: 150000,
              is_active: true,
              employee_count: 7,
              service_count: 0,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            }
          ]
        }
      }
    } catch (error) {
      console.error('Get departments service error:', error)
      throw error
    }
  },
  
  createDepartment: async (departmentData: any) => {
    try {
      return {
        data: {
          message: 'Département créé avec succès',
          department: {
            id: 4,
            ...departmentData,
            is_active: true,
            employee_count: 0,
            service_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Create department service error:', error)
      throw error
    }
  },
  
  updateDepartment: async (departmentId: number, departmentData: any) => {
    try {
      return {
        data: {
          message: 'Département mis à jour avec succès',
          department: {
            id: departmentId,
            ...departmentData,
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Update department service error:', error)
      throw error
    }
  },
  
  deleteDepartment: async (departmentId: number) => {
    try {
      return {
        data: {
          message: 'Département supprimé avec succès'
        }
      }
    } catch (error) {
      console.error('Delete department service error:', error)
      throw error
    }
  },
  
  getServices: async () => {
    try {
      return {
        data: {
          services: [
            {
              id: 1,
              name: 'Recrutement',
              description: 'Service de recrutement',
              department_id: 1,
              department_name: 'Ressources Humaines',
              manager_name: 'Marie Dubois',
              is_active: true,
              employee_count: 3,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            },
            {
              id: 2,
              name: 'Formation',
              description: 'Service de formation',
              department_id: 1,
              department_name: 'Ressources Humaines',
              manager_name: null,
              is_active: true,
              employee_count: 2,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            },
            {
              id: 3,
              name: 'Frontend',
              description: 'Développement frontend',
              department_id: 2,
              department_name: 'Développement',
              manager_name: 'Jean Martin',
              is_active: true,
              employee_count: 5,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            },
            {
              id: 4,
              name: 'Backend',
              description: 'Développement backend',
              department_id: 2,
              department_name: 'Développement',
              manager_name: null,
              is_active: true,
              employee_count: 5,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            }
          ]
        }
      }
    } catch (error) {
      console.error('Get services service error:', error)
      throw error
    }
  },
  
  createService: async (serviceData: any) => {
    try {
      return {
        data: {
          message: 'Service créé avec succès',
          service: {
            id: 5,
            ...serviceData,
            department_name: 'Département',
            is_active: true,
            employee_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Create service service error:', error)
      throw error
    }
  },
  
  updateService: async (serviceId: number, serviceData: any) => {
    try {
      return {
        data: {
          message: 'Service mis à jour avec succès',
          service: {
            id: serviceId,
            ...serviceData,
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Update service service error:', error)
      throw error
    }
  },
  
  deleteService: async (serviceId: number) => {
    try {
      return {
        data: {
          message: 'Service supprimé avec succès'
        }
      }
    } catch (error) {
      console.error('Delete service service error:', error)
      throw error
    }
  },
  
  getPositions: async () => {
    try {
      return {
        data: {
          positions: [
            {
              id: 1,
              name: 'Développeur Junior',
              description: 'Développeur en début de carrière',
              level: 'Junior',
              salary_min: 35000,
              salary_max: 45000,
              requirements: 'Connaissance en JavaScript, HTML, CSS',
              is_active: true,
              employee_count: 3,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            },
            {
              id: 2,
              name: 'Développeur Senior',
              description: 'Développeur expérimenté',
              level: 'Senior',
              salary_min: 50000,
              salary_max: 70000,
              requirements: 'Minimum 5 ans d\'expérience, maîtrise des frameworks modernes',
              is_active: true,
              employee_count: 5,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            },
            {
              id: 3,
              name: 'Chef de Projet',
              description: 'Gestion de projets et d\'équipes',
              level: 'Manager',
              salary_min: 60000,
              salary_max: 80000,
              requirements: 'Expérience en gestion d\'équipe, certification PMP appréciée',
              is_active: true,
              employee_count: 2,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            }
          ]
        }
      }
    } catch (error) {
      console.error('Get positions service error:', error)
      throw error
    }
  },
  
  createPosition: async (positionData: any) => {
    try {
      return {
        data: {
          message: 'Poste créé avec succès',
          position: {
            id: 4,
            ...positionData,
            is_active: true,
            employee_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Create position service error:', error)
      throw error
    }
  },
  
  updatePosition: async (positionId: number, positionData: any) => {
    try {
      return {
        data: {
          message: 'Poste mis à jour avec succès',
          position: {
            id: positionId,
            ...positionData,
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Update position service error:', error)
      throw error
    }
  },
  
  deletePosition: async (positionId: number) => {
    try {
      return {
        data: {
          message: 'Poste supprimé avec succès'
        }
      }
    } catch (error) {
      console.error('Delete position service error:', error)
      throw error
    }
  },
  
  // Nouveaux services pour le dashboard admin
  getCompanyStats: async () => {
    try {
      console.log('📊 Récupération des statistiques de l\'entreprise...')
      return {
        data: {
          stats: {
            total_employees: 45,
            active_employees: 42,
            departments: 5,
            services: 12,
            offices: 3,
            attendance_rate: 94.5,
            retention_rate: 97.2,
            growth_rate: 12.5
          }
        }
      }
    } catch (error) {
      console.error('Get company stats service error:', error)
      throw error
    }
  },
  
  getRecentEmployees: async (limit: number = 5) => {
    try {
      console.log('👥 Récupération des employés récents...')
      return {
        data: {
          employees: Array.from({ length: limit }, (_, i) => ({
            id: i + 1,
            nom: `Nom${i + 1}`,
            prenom: `Prenom${i + 1}`,
            email: `employee${i + 1}@example.com`,
            role: 'employee',
            created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
          }))
        }
      }
    } catch (error) {
      console.error('Get recent employees service error:', error)
      throw error
    }
  },
  
  getCompanyAttendance: async (date?: string) => {
    try {
      console.log('🕒 Récupération des pointages de l\'entreprise...')
      return {
        data: {
          attendance: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            user_id: i + 1,
            user_name: `Prenom${i + 1} Nom${i + 1}`,
            date: date || new Date().toISOString().split('T')[0],
            time: `0${8 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
            status: ['present', 'present', 'present', 'present', 'retard'][Math.floor(Math.random() * 5)],
            type: Math.random() > 0.3 ? 'office' : 'mission'
          }))
        }
      }
    } catch (error) {
      console.error('Get company attendance service error:', error)
      throw error
    }
  },
  
  getOffices: async () => {
    try {
      console.log('🏢 Récupération des bureaux...')
      return await api.get('/admin/offices')
    } catch (error) {
      console.error('Get offices service error:', error)
      throw error
    }
  },
  
  createOffice: async (officeData: any) => {
    try {
      console.log('🏢 Création d\'un bureau...', officeData)
      return await api.post('/admin/offices', officeData)
    } catch (error) {
      console.error('Create office service error:', error)
      throw error
    }
  },
  
  updateOffice: async (officeId: number, officeData: any) => {
    try {
      console.log('🏢 Mise à jour d\'un bureau...', officeData)
      return await api.put(`/admin/offices/${officeId}`, officeData)
    } catch (error) {
      console.error('Update office service error:', error)
      throw error
    }
  },
  
  deleteOffice: async (officeId: number) => {
    try {
      console.log('🏢 Suppression d\'un bureau...', officeId)
      return await api.delete(`/admin/offices/${officeId}`)
    } catch (error) {
      console.error('Delete office service error:', error)
      throw error
    }
  },
  
  // Service pour mettre à jour les paramètres de l'entreprise
  updateCompanySettings: async (settings: any) => {
    try {
      console.log('⚙️ Mise à jour des paramètres de l\'entreprise...', settings)
      return await api.put('/admin/company/settings', settings)
    } catch (error) {
      console.error('Update company settings service error:', error)
      throw error
    }
  }
}

// Services de profil utilisateur
export const profileService = {
  updateProfile: async (profileData: any) => {
    try {
      console.log('👤 Mise à jour du profil...', profileData)
      return await api.put('/profile', profileData)
    } catch (error) {
      console.error('Update profile service error:', error)
      throw error
    }
  },

  changePassword: async (passwordData: any) => {
    try {
      console.log('🔒 Changement de mot de passe...')
      return await api.put('/profile/password', passwordData)
    } catch (error) {
      console.error('Change password service error:', error)
      throw error
    }
  },

  exportUserData: async () => {
    try {
      console.log('📥 Export des données utilisateur...')
      return await api.get('/profile/export')
    } catch (error) {
      console.error('Export user data service error:', error)
      throw error
    }
  },
}

// Service de vérification de la santé du serveur
export const healthService = {
  check: async () => {
    try {
      return await api.get('/health')
    } catch (error) {
      console.error('Health check service error:', error)
      throw error
    }
  }
}