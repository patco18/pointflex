import axios from 'axios'
import toast from 'react-hot-toast'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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

  // 2FA related services
  setup2FA: async () => {
    try {
      return await api.post('/auth/2fa/setup');
    } catch (error) {
      console.error('2FA setup service error:', error);
      throw error;
    }
  },

  verifyAndEnable2FA: async (otpCode: string, otpSecret: string) => {
    try {
      return await api.post('/auth/2fa/verify-and-enable', { otp_code: otpCode, otp_secret: otpSecret });
    } catch (error) {
      console.error('2FA verify and enable service error:', error);
      throw error;
    }
  },

  verifyLogin2FA: async (userId: number, otpCode: string) => {
    try {
      return await api.post('/auth/2fa/verify-login', { user_id: userId, otp_code: otpCode });
    } catch (error) {
      console.error('2FA verify login service error:', error);
      throw error;
    }
  },

  disable2FA: async (payload: {password?: string; otp_code?: string}) => { // Password or OTP might be required
    try {
      return await api.post('/auth/2fa/disable', payload);
    } catch (error) {
      console.error('2FA disable service error:', error);
      throw error;
    }
  },

  regenerateBackupCodes: async (payload?: {password?: string; otp_code?: string}) => { // Password or OTP might be required
    try {
      return await api.post('/auth/2fa/backup-codes', payload);
    } catch (error) {
      console.error('2FA regenerate backup codes service error:', error);
      throw error;
    }
  }
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

  downloadICal: async () => {
    try {
      console.log('📅 Téléchargement du calendrier...')
      return await api.get('/attendance/calendar', { responseType: 'blob' })
    } catch (error) {
      console.error('Download calendar service error:', error)
      throw error
    }
  },

  checkout: async () => {
    try {

      return await api.post('/attendance/checkout')
    } catch (error) {
      console.error('Checkout service error:', error)
      throw error
    }
  },

  startPause: async () => {
    try {
      return await api.post('/attendance/pause/start')
    } catch (error) {
      console.error('Start pause service error:', error)
      throw error
    }
  },

  endPause: async () => {
    try {
      return await api.post('/attendance/pause/end')
    } catch (error) {
      console.error('End pause service error:', error)
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

  // Gestion des demandes de prolongation d'abonnement
  listSubscriptionExtensionRequests: async (status?: string) => {
    try {
      const params: any = {}
      if (status) params.status = status
      return await api.get('/superadmin/subscription-extension-requests', { params })
    } catch (error) {
      console.error('List subscription extension requests error:', error)
      throw error
    }
  },

  approveSubscriptionExtensionRequest: async (reqId: number) => {
    try {
      return await api.put(`/superadmin/subscription-extension-requests/${reqId}/approve`)
    } catch (error) {
      console.error('Approve subscription extension request error:', error)
      throw error
    }
  },

  rejectSubscriptionExtensionRequest: async (reqId: number) => {
    try {
      return await api.put(`/superadmin/subscription-extension-requests/${reqId}/reject`)
    } catch (error) {
      console.error('Reject subscription extension request error:', error)
      throw error
    }
  },

  // ===== FACTURATION =====
  getCompanyInvoices: async (companyId: number) => {
    try {
      return await api.get(`/superadmin/companies/${companyId}/invoices`)
    } catch (error) {
      console.error('Get invoices service error:', error)
      throw error
    }
  },

  getCompanyPayments: async (companyId: number) => {
    try {
      return await api.get(`/superadmin/companies/${companyId}/payments`)
    } catch (error) {
      console.error('Get payments service error:', error)
      throw error
    }
  },

  payInvoice: async (invoiceId: number, data: { amount?: number; method?: string }) => {
    try {
      return await api.post(`/superadmin/invoices/${invoiceId}/pay`, data)
    } catch (error) {
      console.error('Pay invoice service error:', error)
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
  },

  // Subscription management for company admins
  getCompanySubscription: async () => {
    try {
      return await api.get('/admin/subscription')
    } catch (error) {
      console.error('Get company subscription service error:', error)
      throw error
    }
  },

  createSubscriptionCheckoutSession: async (stripePriceId: string) => {
    try {
      return await api.post('/admin/subscription/checkout-session', { stripe_price_id: stripePriceId })
    } catch (error) {
      console.error('Create subscription checkout session service error:', error)
      throw error
    }
  },

  createCustomerPortalSession: async () => {
    try {
      return await api.post('/admin/subscription/customer-portal')
    } catch (error) {
      console.error('Create customer portal session service error:', error)
      throw error
    }
  },

  requestSubscriptionExtension: async (months: number, reason?: string) => {
    try {
      return await api.post('/admin/subscription/extension-request', { months, reason })
    } catch (error) {
      console.error('Request subscription extension error:', error)
      throw error
    }
  },

  setEmployeeManager: async (employeeId: number, managerId: number | null) => {
    try {
      return await api.put(`/admin/employees/${employeeId}/manager`, { manager_id: managerId });
    } catch (error) {
      console.error('Set employee manager service error:', error);
      throw error;
    }
  }
}

export const calendarService = {
  getCalendarEvents: async (year: number, month: number, userIds?: string) => { // userIds can be 'self' or comma-separated IDs
    try {
      const params: any = { year, month };
      if (userIds) {
        params.user_ids = userIds;
      }
      return await api.get('/calendar/events', { params });
    } catch (error) {
      console.error('Get calendar events service error:', error);
      throw error;
    }
  },
  downloadICal: async () => {
    try {
      console.log('📅 Téléchargement du calendrier des événements...');
      return await api.get('/calendar/events/ical', { responseType: 'blob' });
    } catch (error) {
      console.error('Download calendar iCal service error:', error);
      throw error;
    }
  }
};

export const leaveService = {
  getLeaveTypes: async () => {
    try {
      return await api.get('/leave/types');
    } catch (error) {
      console.error('Get leave types error:', error);
      throw error;
    }
  },
  getLeaveBalances: async () => {
    try {
      return await api.get('/leave/balances');
    } catch (error) {
      console.error('Get leave balances error:', error);
      throw error;
    }
  },
  submitLeaveRequest: async (data: any) => {
    try {
      return await api.post('/leave/requests', data);
    } catch (error) {
      console.error('Submit leave request error:', error);
      throw error;
    }
  },
  getMyLeaveRequests: async (page: number = 1, perPage: number = 10, status?: string) => {
    try {
      const params: any = { page, per_page: perPage };
      if (status) params.status = status;
      return await api.get('/leave/requests', { params });
    } catch (error) {
      console.error('Get my leave requests error:', error);
      throw error;
    }
  },
  calculateLeaveDuration: async (data: {
    start_date: string;
    end_date: string;
    start_day_period?: string;
    end_day_period?: string;
  }) => {
    try {
      return await api.post('/leave/calculate-duration', data);
    } catch (error) {
      console.error('Calculate leave duration error:', error);
      throw error;
    }
  },
  downloadMyLeaveReport: async (filters: { start_date?: string; end_date?: string; status?: string }) => {
    try {
      return await api.get('/profile/my-leave-report/pdf', {
        params: filters,
        responseType: 'blob'
      });
    } catch (error) {
      console.error('Download my leave report error:', error);
      throw error;
    }
  }
};

export const webhookService = {
  getSubscriptions: async () => {
    try {
      return await api.get('/webhooks/subscriptions');
    } catch (error) {
      console.error('Get webhook subscriptions error:', error);
      throw error;
    }
  },
  createSubscription: async (data: { target_url: string; subscribed_events: string[] }) => {
    try {
      return await api.post('/webhooks/subscriptions', data);
    } catch (error) {
      console.error('Create webhook subscription error:', error);
      throw error;
    }
  },
  getSubscriptionDetails: async (subId: number) => {
    try {
      return await api.get(`/webhooks/subscriptions/${subId}`);
    } catch (error) {
      console.error('Get webhook subscription details error:', error);
      throw error;
    }
  },
  updateSubscription: async (subId: number, data: { target_url?: string; subscribed_events?: string[]; is_active?: boolean }) => {
    try {
      return await api.put(`/webhooks/subscriptions/${subId}`, data);
    } catch (error) {
      console.error('Update webhook subscription error:', error);
      throw error;
    }
  },
  deleteSubscription: async (subId: number) => {
    try {
      return await api.delete(`/webhooks/subscriptions/${subId}`);
    } catch (error) {
      console.error('Delete webhook subscription error:', error);
      throw error;
    }
  },
  getSubscriptionDeliveryLogs: async (subId: number, page: number = 1, perPage: number = 10) => {
    try {
      return await api.get(`/webhooks/subscriptions/${subId}/delivery-logs`, { params: { page, per_page: perPage } });
    } catch (error) {
      console.error('Get webhook delivery logs error:', error);
      throw error;
    }
  },
  pingSubscription: async (subId: number) => {
    try {
      return await api.post(`/webhooks/subscriptions/${subId}/ping`);
    } catch (error) {
      console.error('Ping webhook subscription error:', error);
      throw error;
    }
  }
};

// Services Missions
export const missionService = {
  getMissions: async () => {
    try {
      return await api.get('/missions')
    } catch (error) {
      console.error('Get missions error:', error)
      throw error
    }
  },
  createMission: async (missionData: any) => {
    try {
      return await api.post('/missions', missionData)
    } catch (error) {
      console.error('Create mission error:', error)
      throw error
    }
  },
  updateMission: async (missionId: number, missionData: any) => {
    try {
      return await api.put(`/missions/${missionId}`, missionData)
    } catch (error) {
      console.error('Update mission error:', error)
      throw error
    }
  },

  // Leave Policy Management
  getCompanyLeavePolicy: async () => {
    try {
      return await api.get('/admin/company/leave-policy');
    } catch (error) {
      console.error('Get company leave policy error:', error);
      throw error;
    }
  },
  updateCompanyLeavePolicy: async (policyData: { work_days?: string; default_country_code_for_holidays?: string }) => {
    try {
      return await api.put('/admin/company/leave-policy', policyData);
    } catch (error) {
      console.error('Update company leave policy error:', error);
      throw error;
    }
  },
  addCompanyHoliday: async (holidayData: { date: string; name: string }) => {
    try {
      return await api.post('/admin/company/holidays', holidayData);
    } catch (error) {
      console.error('Add company holiday error:', error);
      throw error;
    }
  },
  deleteCompanyHoliday: async (holidayId: number) => {
    try {
      return await api.delete(`/admin/company/holidays/${holidayId}`);
    } catch (error) {
      console.error('Delete company holiday error:', error);
      throw error;
    }
  },
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

  getCompanyAttendance: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const query = {
        start_date: params?.startDate,
        end_date: params?.endDate
      }
      return await api.get('/admin/attendance', { params: query })
    } catch (error) {
      console.error('Get company attendance service error:', error)
      throw error
    }
  },

  getEmployeeAttendance: async (employeeId: number, params?: { startDate?: string; endDate?: string }) => {
    try {
      const query = {
        start_date: params?.startDate,
        end_date: params?.endDate
      }
      return await api.get(`/admin/employees/${employeeId}/attendance`, { params: query })
    } catch (error) {
      console.error('Get employee attendance service error:', error)
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
      return await api.get('/admin/departments')
    } catch (error) {
      console.error('Get departments service error:', error)
      throw error
    }
  },

  createDepartment: async (departmentData: any) => {
    try {
      return await api.post('/admin/departments', departmentData)
    } catch (error) {
      console.error('Create department service error:', error)
      throw error
    }
  },

  updateDepartment: async (departmentId: number, departmentData: any) => {
    try {
      return await api.put(`/admin/departments/${departmentId}`, departmentData)
    } catch (error) {
      console.error('Update department service error:', error)
      throw error
    }
  },

  deleteDepartment: async (departmentId: number) => {
    try {
      return await api.delete(`/admin/departments/${departmentId}`)
    } catch (error) {
      console.error('Delete department service error:', error)
      throw error
    }
  },
  
  getServices: async () => {
    try {
      return await api.get('/admin/services')
    } catch (error) {
      console.error('Get services service error:', error)
      throw error
    }
  },
  
  createService: async (serviceData: any) => {
    try {
      return await api.post('/admin/services', serviceData)
    } catch (error) {
      console.error('Create service service error:', error)
      throw error
    }
  },
  
  updateService: async (serviceId: number, serviceData: any) => {
    try {
      return await api.put(`/admin/services/${serviceId}`, serviceData)
    } catch (error) {
      console.error('Update service service error:', error)
      throw error
    }
  },
  
  deleteService: async (serviceId: number) => {
    try {
      return await api.delete(`/admin/services/${serviceId}`)
    } catch (error) {
      console.error('Delete service service error:', error)
      throw error
    }
  },
  
  getPositions: async () => {
    try {
      return await api.get('/admin/positions')
    } catch (error) {
      console.error('Get positions service error:', error)
      throw error
    }
  },
  
  createPosition: async (positionData: any) => {
    try {
      return await api.post('/admin/positions', positionData)
    } catch (error) {
      console.error('Create position service error:', error)
      throw error
    }
  },
  
  updatePosition: async (positionId: number, positionData: any) => {
    try {
      return await api.put(`/admin/positions/${positionId}`, positionData)
    } catch (error) {
      console.error('Update position service error:', error)
      throw error
    }
  },
  
  deletePosition: async (positionId: number) => {
    try {
      return await api.delete(`/admin/positions/${positionId}`)
    } catch (error) {
      console.error('Delete position service error:', error)
      throw error
    }
  },
  
  // Nouveaux services pour le dashboard admin
  getCompanyStats: async () => {
    try {
      console.log('📊 Récupération des statistiques de l\'entreprise...')
      return await api.get('/admin/stats')
    } catch (error) {
      console.error('Get company stats service error:', error)
      throw error
    }
  },
  
  getRecentEmployees: async (limit: number = 5) => {
    try {
      const params = { page: 1, per_page: limit }
      return await api.get('/admin/employees', { params })
    } catch (error) {
      console.error('Get recent employees service error:', error)
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

  getCompanySettings: async () => {
    try {
      return await api.get('/admin/company/settings')
    } catch (error) {
      console.error('Get company settings service error:', error)
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
  },

  uploadCompanyLogo: async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('logo', file)
      console.log('⬆️ Téléversement du logo de l\'entreprise...')
      return await api.post('/admin/company/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } catch (error) {
      console.error('Upload company logo service error:', error)
      throw error
    }
  },

  // Subscription management for company admins
  getCompanySubscription: async () => {
    try {
      return await api.get('/admin/subscription')
    } catch (error) {
      console.error('Get company subscription service error:', error)
      throw error
    }
  },

  createSubscriptionCheckoutSession: async (stripePriceId: string) => {
    try {
      return await api.post('/admin/subscription/checkout-session', { stripe_price_id: stripePriceId })
    } catch (error) {
      console.error('Create subscription checkout session service error:', error)
      throw error
    }
  },

  createCustomerPortalSession: async () => {
    try {
      return await api.post('/admin/subscription/customer-portal')
    } catch (error) {
      console.error('Create customer portal session service error:', error)
      throw error
    }
  },

  // Leave policy management
  getCompanyLeavePolicy: async () => {
    try {
      return await api.get('/admin/company/leave-policy')
    } catch (error) {
      console.error('Get company leave policy error:', error)
      throw error
    }
  },

  updateCompanyLeavePolicy: async (policyData: { work_days?: string; default_country_code_for_holidays?: string }) => {
    try {
      return await api.put('/admin/company/leave-policy', policyData)
    } catch (error) {
      console.error('Update company leave policy error:', error)
      throw error
    }
  },

  addCompanyHoliday: async (holidayData: { date: string; name: string }) => {
    try {
      return await api.post('/admin/company/holidays', holidayData)
    } catch (error) {
      console.error('Add company holiday error:', error)
      throw error
    }
  },

  deleteCompanyHoliday: async (holidayId: number) => {
    try {
      return await api.delete(`/admin/company/holidays/${holidayId}`)
    } catch (error) {
      console.error('Delete company holiday error:', error)
      throw error
    }
  },

  downloadAttendancePdf: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      return await api.get('/admin/attendance-report/pdf', {
        params: {
          start_date: params?.startDate,
          end_date: params?.endDate
        },
        responseType: 'blob'
      })
    } catch (error) {
      console.error('Download attendance pdf service error:', error)
      throw error
    }
  },
  downloadEmployeeLeaveReport: async (employeeId: number, filters: { start_date?: string; end_date?: string; status?: string }) => {
    try {
      return await api.get(`/admin/employees/${employeeId}/leave-report/pdf`, {
        params: filters,
        responseType: 'blob'
      });
    } catch (error) {
      console.error(`Download employee ${employeeId} leave report error:`, error);
      throw error;
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

// Service pour les notifications utilisateur
export const notificationService = {
  list: async () => {
    try {
      return await api.get('/notifications')
    } catch (error) {
      console.error('List notifications service error:', error)
      throw error
    }
  }
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
