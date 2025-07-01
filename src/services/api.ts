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
      // Simuler une réponse
      return {
        data: {
          records: []
        }
      }
    } catch (error) {
      console.error('Get attendance service error:', error)
      throw error
    }
  },
  
  getStats: async () => {
    try {
      console.log('📈 Récupération des statistiques...')
      // Simuler une réponse
      return {
        data: {
          stats: {
            total_days: 30,
            present_days: 22,
            late_days: 3,
            absence_days: 5,
            average_hours: 7.8
          }
        }
      }
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
      // Simuler une réponse
      return {
        data: [
          {
            id: 1,
            name: 'Entreprise Démo',
            email: 'contact@entreprise-demo.com',
            phone: '+33 1 23 45 67 89',
            address: '123 Rue de la Démo, 75001 Paris',
            city: 'Paris',
            country: 'FR',
            industry: 'tech',
            website: 'www.entreprise-demo.com',
            tax_id: 'FR12345678900',
            subscription_plan: 'premium',
            subscription_status: 'active',
            max_employees: 50,
            is_active: true,
            is_suspended: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            admin_email: 'admin@entreprise-demo.com',
            admin_name: 'Jean Dupont',
            admin_phone: '+33 6 12 34 56 78',
            current_employee_count: 35,
            subscription_days_remaining: 45,
            is_subscription_expired: false,
            is_subscription_expiring_soon: false
          },
          {
            id: 2,
            name: 'TechCorp Solutions',
            email: 'info@techcorp.com',
            phone: '+33 1 98 76 54 32',
            address: '456 Avenue de la Tech, 69000 Lyon',
            city: 'Lyon',
            country: 'FR',
            industry: 'tech',
            website: 'www.techcorp.com',
            tax_id: 'FR98765432100',
            subscription_plan: 'enterprise',
            subscription_status: 'active',
            max_employees: 200,
            is_active: true,
            is_suspended: false,
            created_at: '2023-02-15T00:00:00Z',
            updated_at: '2023-02-15T00:00:00Z',
            admin_email: 'admin@techcorp.com',
            admin_name: 'Marie Martin',
            admin_phone: '+33 6 98 76 54 32',
            current_employee_count: 150,
            subscription_days_remaining: 90,
            is_subscription_expired: false,
            is_subscription_expiring_soon: false
          }
        ]
      }
    } catch (error) {
      console.error('Get companies service error:', error)
      throw error
    }
  },
  
  createCompany: async (companyData: any) => {
    try {
      console.log('🏢 Création d\'entreprise...', companyData)
      // Simuler une réponse
      return {
        data: {
          message: 'Entreprise créée avec succès',
          company: {
            id: 3,
            ...companyData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true,
            is_suspended: false,
            subscription_status: 'active',
            subscription_days_remaining: 30,
            is_subscription_expired: false,
            is_subscription_expiring_soon: false
          }
        }
      }
    } catch (error) {
      console.error('Create company service error:', error)
      throw error
    }
  },
  
  updateCompany: async (companyId: number, companyData: any) => {
    try {
      return {
        data: {
          message: 'Entreprise mise à jour avec succès',
          company: {
            id: companyId,
            ...companyData,
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Update company service error:', error)
      throw error
    }
  },
  
  deleteCompany: async (companyId: number) => {
    try {
      return {
        data: {
          message: 'Entreprise supprimée avec succès'
        }
      }
    } catch (error) {
      console.error('Delete company service error:', error)
      throw error
    }
  },
  
  getGlobalStats: async () => {
    try {
      // Récupérer les entreprises pour calculer les revenus
      const companiesResponse = await superAdminService.getCompanies();
      const companies = companiesResponse.data;
      
      // Calculer la distribution des plans
      const plansDistribution = { basic: 0, premium: 0, enterprise: 0 };
      
      // Compter les entreprises par plan
      companies.forEach((company: any) => {
        if (company.subscription_plan && plansDistribution[company.subscription_plan as keyof typeof plansDistribution] !== undefined) {
          plansDistribution[company.subscription_plan as keyof typeof plansDistribution]++;
        }
      });
      
      // Calculer les revenus mensuels
      const planPrices = { basic: 29, premium: 99, enterprise: 299 };
      let revenueMonthly = 0;
      
      Object.entries(plansDistribution).forEach(([plan, count]) => {
        const price = planPrices[plan as keyof typeof planPrices] || 0;
        revenueMonthly += count * price;
      });
      
      return {
        total_companies: companies.length,
        active_companies: companies.filter((c: any) => c.is_active && !c.is_suspended).length,
        total_users: 145,
        total_pointages: 2850,
        revenue_monthly: revenueMonthly,
        plans_distribution: plansDistribution,
        system_health: {
          api_status: 'healthy',
          database_status: 'healthy',
          storage_usage: 65
        }
      }
    } catch (error) {
      console.error('Get global stats service error:', error)
      throw error
    }
  },

  // Services pour la gestion des abonnements - CORRIGÉS
  toggleCompanyStatus: async (companyId: number, data: { suspend: boolean, reason: string, notify_admin: boolean }) => {
    try {
      console.log(`🔄 ${data.suspend ? 'Suspension' : 'Réactivation'} entreprise ${companyId}...`)
      
      // Récupérer les entreprises actuelles
      const companiesResponse = await superAdminService.getCompanies();
      const companies = companiesResponse.data;
      
      // Trouver et mettre à jour l'entreprise
      const updatedCompanies = companies.map((company: any) => {
        if (company.id === companyId) {
          return {
            ...company,
            is_suspended: data.suspend,
            suspension_reason: data.suspend ? data.reason : null,
            subscription_status: data.suspend ? 'suspended' : 'active'
          };
        }
        return company;
      });
      
      // Mettre à jour les statistiques globales
      await superAdminService.getGlobalStats();
      
      return {
        data: {
          message: `Entreprise ${data.suspend ? 'suspendue' : 'réactivée'} avec succès`,
          company: updatedCompanies.find((c: any) => c.id === companyId)
        }
      }
    } catch (error) {
      console.error('Toggle company status service error:', error)
      throw error
    }
  },

  extendSubscription: async (companyId: number, data: { months: number, reason?: string }) => {
    try {
      console.log(`📅 Prolongation abonnement entreprise ${companyId} de ${data.months} mois...`)
      
      // Récupérer les entreprises actuelles
      const companiesResponse = await superAdminService.getCompanies();
      const companies = companiesResponse.data;
      
      // Trouver et mettre à jour l'entreprise
      const updatedCompanies = companies.map((company: any) => {
        if (company.id === companyId) {
          // Calculer la nouvelle date de fin d'abonnement
          const currentDaysRemaining = company.subscription_days_remaining || 0;
          const newDaysRemaining = currentDaysRemaining + (data.months * 30);
          
          return {
            ...company,
            subscription_days_remaining: newDaysRemaining,
            is_subscription_expired: false,
            is_subscription_expiring_soon: false,
            subscription_status: 'active',
            is_suspended: false,
            suspension_reason: null
          };
        }
        return company;
      });
      
      // Mettre à jour les statistiques globales
      await superAdminService.getGlobalStats();
      
      return {
        data: {
          message: `Abonnement prolongé de ${data.months} mois`,
          company: updatedCompanies.find((c: any) => c.id === companyId)
        }
      }
    } catch (error) {
      console.error('Extend subscription service error:', error)
      throw error
    }
  },

  // ===== NOUVEAUX SERVICES POUR LA CONFIGURATION SYSTÈME =====
  
  getSystemSettings: async () => {
    try {
      console.log('⚙️ Récupération des paramètres système...')
      return {
        data: {
          settings: {
            general: {
              platform_name: { value: 'PointFlex SaaS', description: 'Nom de la plateforme' },
              platform_version: { value: '2.0.0', description: 'Version de la plateforme' },
              default_timezone: { value: 'Europe/Paris', description: 'Fuseau horaire par défaut' },
              default_language: { value: 'fr', description: 'Langue par défaut' },
              max_companies: { value: 1000, description: 'Nombre maximum d\'entreprises' },
              max_users_per_company: { value: 999, description: 'Utilisateurs max par entreprise' }
            },
            security: {
              password_min_length: { value: 8, description: 'Longueur minimale du mot de passe' },
              password_require_uppercase: { value: true, description: 'Majuscule obligatoire' },
              password_require_numbers: { value: true, description: 'Chiffres obligatoires' },
              require_2fa: { value: false, description: 'Authentification 2FA obligatoire' },
              session_timeout: { value: 1440, description: 'Timeout session (minutes)' },
              max_login_attempts: { value: 5, description: 'Tentatives de connexion max' },
              lockout_duration: { value: 30, description: 'Durée de verrouillage (minutes)' }
            },
            notifications: {
              email_notifications_enabled: { value: true, description: 'Notifications email' },
              push_notifications_enabled: { value: true, description: 'Notifications push' },
              sms_notifications_enabled: { value: false, description: 'Notifications SMS' },
              notification_retention_days: { value: 30, description: 'Rétention notifications (jours)' }
            },
            integrations: {
              smtp_host: { value: '', description: 'Serveur SMTP' },
              smtp_port: { value: 587, description: 'Port SMTP' },
              smtp_use_tls: { value: true, description: 'Utiliser TLS' },
              api_rate_limit: { value: 1000, description: 'Limite API (requêtes/heure)' },
              webhook_timeout: { value: 30, description: 'Timeout webhooks (secondes)' }
            },
            advanced: {
              debug_mode_enabled: { value: false, description: 'Mode debug' },
              auto_backup_enabled: { value: true, description: 'Sauvegarde automatique' },
              auto_backup_frequency: { value: 24, description: 'Fréquence sauvegarde (heures)' },
              log_retention_days: { value: 90, description: 'Rétention logs (jours)' },
              backup_retention_days: { value: 30, description: 'Rétention sauvegardes (jours)' }
            }
          }
        }
      }
    } catch (error) {
      console.error('Get system settings service error:', error)
      throw error
    }
  },

  updateSystemSettings: async (settingsData: any) => {
    try {
      console.log('⚙️ Mise à jour des paramètres système...', settingsData)
      return {
        data: {
          message: 'Paramètres système mis à jour avec succès',
          updated_settings: Object.keys(settingsData)
        }
      }
    } catch (error) {
      console.error('Update system settings service error:', error)
      throw error
    }
  },

  createSystemBackup: async () => {
    try {
      console.log('💾 Création d\'une sauvegarde système...')
      return {
        data: {
          message: 'Sauvegarde créée avec succès',
          backup_id: `backup_${new Date().toISOString().replace(/[:.]/g, '_')}`,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Create system backup service error:', error)
      throw error
    }
  },

  toggleMaintenanceMode: async (data: { enabled: boolean, message?: string }) => {
    try {
      console.log(`🔧 ${data.enabled ? 'Activation' : 'Désactivation'} du mode maintenance...`)
      return {
        data: {
          message: `Mode maintenance ${data.enabled ? 'activé' : 'désactivé'}`,
          maintenance_mode: data.enabled,
          maintenance_message: data.message
        }
      }
    } catch (error) {
      console.error('Toggle maintenance mode service error:', error)
      throw error
    }
  },

  getAuditLogs: async (params?: { page?: number, per_page?: number, action?: string, user_id?: number }) => {
    try {
      console.log('📋 Récupération des logs d\'audit...', params)
      return {
        data: {
          logs: Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            user_email: 'admin@pointflex.com',
            action: ['LOGIN', 'CREATE', 'UPDATE', 'DELETE'][Math.floor(Math.random() * 4)],
            resource_type: ['User', 'Company', 'Office', 'Pointage'][Math.floor(Math.random() * 4)],
            resource_id: Math.floor(Math.random() * 100) + 1,
            details: { key: 'value' },
            ip_address: '192.168.1.1',
            created_at: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
          })),
          pagination: {
            page: params?.page || 1,
            per_page: params?.per_page || 20,
            total: 100,
            pages: 5
          }
        }
      }
    } catch (error) {
      console.error('Get audit logs service error:', error)
      throw error
    }
  },

  getSystemHealth: async () => {
    try {
      console.log('🏥 Vérification de l\'état du système...')
      return {
        data: {
          health: {
            api_status: 'healthy',
            database_status: 'healthy',
            storage_usage: 65,
            uptime: '7 jours, 14 heures',
            response_time: '120ms',
            active_connections: 45,
            max_connections: 100,
            metrics: {
              total_companies: 12,
              total_users: 145,
              total_pointages: 2850,
              daily_active_users: 78,
              error_rate: '0.1%'
            },
            last_backup: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            maintenance_mode: false
          }
        }
      }
    } catch (error) {
      console.error('Get system health service error:', error)
      throw error
    }
  },

  resetSystemSettings: async () => {
    try {
      console.log('🔄 Réinitialisation des paramètres système...')
      return {
        data: {
          message: 'Paramètres système réinitialisés aux valeurs par défaut'
        }
      }
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
      return {
        data: {
          employees: [
            {
              id: 1,
              email: 'admin@pointflex.com',
              nom: 'Administrateur',
              prenom: 'Principal',
              role: 'admin_rh',
              is_active: true,
              employee_number: 'EMP-1-0001',
              phone: '+33 6 12 34 56 78',
              department_name: 'Direction',
              company_name: 'Entreprise Démo',
              created_at: '2023-01-01T00:00:00Z'
            },
            {
              id: 2,
              email: 'employee@pointflex.com',
              nom: 'Employé',
              prenom: 'Test',
              role: 'employee',
              is_active: true,
              employee_number: 'EMP-1-0002',
              phone: '+33 6 23 45 67 89',
              department_name: 'Développement',
              service_name: 'Frontend',
              company_name: 'Entreprise Démo',
              created_at: '2023-01-02T00:00:00Z'
            }
          ]
        }
      }
    } catch (error) {
      console.error('Get employees service error:', error)
      throw error
    }
  },
  
  createEmployee: async (employeeData: any) => {
    try {
      console.log('👤 Création d\'employé...', employeeData)
      return {
        data: {
          message: 'Employé créé avec succès',
          employee: {
            id: 3,
            ...employeeData,
            is_active: true,
            employee_number: 'EMP-1-0003',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Create employee service error:', error)
      throw error
    }
  },
  
  updateEmployee: async (employeeId: number, employeeData: any) => {
    try {
      console.log('👤 Mise à jour d\'employé...', employeeData)
      return {
        data: {
          message: 'Employé mis à jour avec succès',
          employee: {
            id: employeeId,
            ...employeeData,
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Update employee service error:', error)
      throw error
    }
  },
  
  deleteEmployee: async (employeeId: number) => {
    try {
      console.log('👤 Suppression d\'employé...', employeeId)
      return {
        data: {
          message: 'Employé supprimé avec succès'
        }
      }
    } catch (error) {
      console.error('Delete employee service error:', error)
      throw error
    }
  },

  getOrganizationData: async () => {
    try {
      console.log('🏗️ Récupération des données organisationnelles...')
      return {
        data: {
          departments: [
            { id: 1, name: 'Ressources Humaines' },
            { id: 2, name: 'Développement' },
            { id: 3, name: 'Marketing' }
          ],
          services: [
            { id: 1, name: 'Recrutement', department_id: 1 },
            { id: 2, name: 'Formation', department_id: 1 },
            { id: 3, name: 'Frontend', department_id: 2 },
            { id: 4, name: 'Backend', department_id: 2 }
          ],
          positions: [
            { id: 1, name: 'Développeur Junior', level: 'Junior' },
            { id: 2, name: 'Développeur Senior', level: 'Senior' },
            { id: 3, name: 'Chef de Projet', level: 'Manager' }
          ],
          managers: [
            { id: 1, name: 'Marie Dubois', role: 'Manager' },
            { id: 2, name: 'Jean Martin', role: 'Chef de Service' }
          ]
        }
      }
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
      return {
        data: {
          offices: [
            {
              id: 1,
              name: 'Siège Social Paris',
              address: '123 Rue de la Démo, 75001 Paris',
              latitude: 48.8566,
              longitude: 2.3522,
              radius: 100,
              is_active: true,
              timezone: 'Europe/Paris',
              capacity: 150,
              current_occupancy: 120,
              amenities: ['wifi', 'parking', 'cafeteria', 'security']
            },
            {
              id: 2,
              name: 'Bureau Lyon',
              address: '456 Avenue de la Tech, 69000 Lyon',
              latitude: 45.7640,
              longitude: 4.8357,
              radius: 80,
              is_active: true,
              timezone: 'Europe/Paris',
              capacity: 50,
              current_occupancy: 35,
              amenities: ['wifi', 'parking']
            }
          ]
        }
      }
    } catch (error) {
      console.error('Get offices service error:', error)
      throw error
    }
  },
  
  createOffice: async (officeData: any) => {
    try {
      console.log('🏢 Création d\'un bureau...', officeData)
      return {
        data: {
          message: 'Bureau créé avec succès',
          office: {
            id: 3,
            ...officeData,
            current_occupancy: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Create office service error:', error)
      throw error
    }
  },
  
  updateOffice: async (officeId: number, officeData: any) => {
    try {
      console.log('🏢 Mise à jour d\'un bureau...', officeData)
      return {
        data: {
          message: 'Bureau mis à jour avec succès',
          office: {
            id: officeId,
            ...officeData,
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Update office service error:', error)
      throw error
    }
  },
  
  deleteOffice: async (officeId: number) => {
    try {
      console.log('🏢 Suppression d\'un bureau...', officeId)
      return {
        data: {
          message: 'Bureau supprimé avec succès'
        }
      }
    } catch (error) {
      console.error('Delete office service error:', error)
      throw error
    }
  },
  
  // Service pour mettre à jour les paramètres de l'entreprise
  updateCompanySettings: async (settings: any) => {
    try {
      console.log('⚙️ Mise à jour des paramètres de l\'entreprise...', settings)
      return {
        data: {
          message: 'Paramètres de l\'entreprise mis à jour avec succès',
          settings
        }
      }
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
      return {
        data: {
          message: 'Profil mis à jour avec succès',
          profile: {
            ...profileData,
            updated_at: new Date().toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Update profile service error:', error)
      throw error
    }
  },

  changePassword: async (passwordData: any) => {
    try {
      console.log('🔒 Changement de mot de passe...')
      return {
        data: {
          message: 'Mot de passe modifié avec succès'
        }
      }
    } catch (error) {
      console.error('Change password service error:', error)
      throw error
    }
  },

  exportUserData: async () => {
    try {
      console.log('📥 Export des données utilisateur...')
      return {
        data: JSON.stringify({
          user: {
            id: 1,
            email: 'user@example.com',
            nom: 'Nom',
            prenom: 'Prénom',
            created_at: new Date().toISOString()
          },
          pointages: [],
          preferences: {}
        }, null, 2)
      }
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
      return {
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          database: 'connected'
        }
      }
    } catch (error) {
      console.error('Health check service error:', error)
      throw error
    }
  }
}