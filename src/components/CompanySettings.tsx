import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { adminService } from '../services/api'
import {
  MapPin, Clock, Save, Navigation, CreditCard, ExternalLink, AlertTriangle,
  CalendarDays, Trash2, PlusCircle, Edit // Added CalendarDays, Trash2, PlusCircle, Edit for Leave Policy
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams, useNavigate } from 'react-router-dom' // For handling Stripe redirect

// Define types for subscription data
interface Plan {
  stripe_price_id: string;
  name: string;
  max_employees: number;
  amount_eur: number;
  interval_months: number;
  description: string;
}

interface SubscriptionData {
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  active_stripe_price_id: string | null;
  max_employees: number;
  can_add_employee: boolean;
  available_plans: Plan[];
  billing_portal_enabled: boolean;
}

interface Invoice {
  id: number;
  amount: number;
  months: number;
  status: string;
  due_date?: string;
  paid_date?: string;
}

export default function CompanySettings() {
  const navigate = useNavigate(); // For clearing query params
  const [searchParams] = useSearchParams();
  const { isAdmin, fetchUser } = useAuth()
  const [settings, setSettings] = useState({
    office_latitude: 48.8566,
    office_longitude: 2.3522,
    office_radius: 100,
    work_start_time: '09:00',
    late_threshold: 15,
    logo_url: '',
    theme_color: '#3b82f6'
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false) // For general loading like geolocation
  const [dataLoading, setDataLoading] = useState(true)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [actionLoading, setActionLoading] = useState(false); // For button actions like subscribe/portal
  const [extensionMonths, setExtensionMonths] = useState(1);
  const [extensionReason, setExtensionReason] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  // State for Leave Policy
  const [leavePolicyLoading, setLeavePolicyLoading] = useState(true);
  const [workDays, setWorkDays] = useState<number[]>([0, 1, 2, 3, 4]); // Default Mon-Fri (0=Mon, 6=Sun)
  const [defaultCountryCode, setDefaultCountryCode] = useState('FR');
  const [companyHolidays, setCompanyHolidays] = useState<{ id: number; date: string; name: string }[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [leavePolicySaving, setLeavePolicySaving] = useState(false);

  // Charger les paramètres de l'entreprise, l'abonnement, et la politique de congés
  useEffect(() => {
    if (isAdmin) {
      loadCompanySettings();
      loadSubscriptionData();
      loadLeavePolicy();
      loadInvoices();
    }
  }, [isAdmin]);

  // Handle Stripe redirect
  useEffect(() => {
    const stripeStatus = searchParams.get('status');
    const sessionId = searchParams.get('session_id'); // For success

    if (stripeStatus === 'success' && sessionId) {
      toast.success('Paiement réussi ! Votre abonnement est en cours de mise à jour.');
      // Optionally, you could verify the session server-side here for extra security
      // For now, just refresh data
      loadSubscriptionData();
      // Clean up URL
      navigate('/settings', { replace: true });
    } else if (stripeStatus === 'cancel') {
      toast.error('Le processus de paiement a été annulé.');
      // Clean up URL
      navigate('/settings', { replace: true });
    }
  }, [searchParams, navigate]);


  const loadCompanySettings = async () => {
    try {
      setDataLoading(true)
      const resp = await adminService.getCompanySettings()
      setSettings(resp.data.company)
      setDataLoading(false)
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
      toast.error('Erreur lors du chargement des paramètres')
      setDataLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Appel API pour sauvegarder les paramètres
      await adminService.updateCompanySettings(settings)
      toast.success('Paramètres sauvegardés avec succès!')
      if (fetchUser) {
        await fetchUser()
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const resp = await adminService.uploadCompanyLogo(e.target.files[0])
        setSettings(prev => ({ ...prev, logo_url: resp.data.logo_url }))
        toast.success('Logo mis à jour')
        if (fetchUser) {
          await fetchUser()
        }
      } catch (error) {
        console.error('Erreur upload logo:', error)
        toast.error('Erreur lors du téléversement du logo')
      }
    }
  }

  const loadSubscriptionData = async () => {
    setSubscriptionLoading(true);
    try {
      const resp = await adminService.getCompanySubscription();
      setSubscriptionData(resp.data);
    } catch (error) {
      console.error('Erreur chargement données abonnement:', error);
      toast.error('Erreur lors du chargement des informations d\'abonnement.');
    } finally {
      setSubscriptionLoading(false);
    }
  }

  const handleSubscribe = async (stripePriceId: string) => {
    setActionLoading(true);
    try {
      const resp = await adminService.createSubscriptionCheckoutSession(stripePriceId);
      if (resp.data.checkout_url) {
        window.location.href = resp.data.checkout_url;
      } else {
        toast.error('Impossible de démarrer la session de paiement.');
      }
    } catch (error) {
      console.error('Erreur création session checkout:', error);
      // Toast est déjà géré par l'intercepteur api.ts
    } finally {
      setActionLoading(false);
    }
  }

  const handleManageBilling = async () => {
    setActionLoading(true);
    try {
      const resp = await adminService.createCustomerPortalSession();
      if (resp.data.portal_url) {
        window.location.href = resp.data.portal_url;
      } else {
        toast.error('Impossible d\'ouvrir le portail de facturation.');
      }
    } catch (error) {
      console.error('Erreur création portail client:', error);
    } finally {
      setActionLoading(false);
    }
  }

  const handleExtensionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await adminService.requestSubscriptionExtension(extensionMonths, extensionReason);
      toast.success('Demande de prolongation envoyée');
      setExtensionReason('');
      setExtensionMonths(1);
    } catch (error) {
      console.error('Erreur demande prolongation:', error);
    } finally {
      setActionLoading(false);
    }
  }

  const loadInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const resp = await adminService.getCompanyInvoices();
      setInvoices(resp.data.invoices);
    } catch (error) {
      console.error('Erreur chargement factures:', error);
    } finally {
      setInvoicesLoading(false);
    }
  }

  const handlePayInvoice = async (invoiceId: number) => {
    setActionLoading(true);
    try {
      const resp = await adminService.createInvoiceCheckoutSession(invoiceId);
      if (resp.data.checkout_url) {
        window.location.href = resp.data.checkout_url;
      } else {
        toast.error("Impossible d'ouvrir la page de paiement");
      }
    } catch (error) {
      console.error('Erreur création session de paiement:', error);
    } finally {
      setActionLoading(false);
    }
  }

  const loadLeavePolicy = async () => {
    setLeavePolicyLoading(true);
    try {
      const resp = await adminService.getCompanyLeavePolicy();
      const policy = resp.data;
      setWorkDays(policy.work_days ? policy.work_days.split(',').map(Number) : [0,1,2,3,4]);
      setDefaultCountryCode(policy.default_country_code_for_holidays || 'FR');
      setCompanyHolidays(policy.company_holidays || []);
    } catch (error) {
      console.error('Erreur chargement politique de congés:', error);
      toast.error('Erreur lors du chargement de la politique de congés.');
    } finally {
      setLeavePolicyLoading(false);
    }
  };

  const handleWorkDayChange = (dayIndex: number) => {
    setWorkDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort((a,b) => a-b)
    );
  };

  const handleSaveLeavePolicy = async () => {
    setLeavePolicySaving(true);
    try {
      const policyData = {
        work_days: workDays.join(','),
        default_country_code_for_holidays: defaultCountryCode
      };
      await adminService.updateCompanyLeavePolicy(policyData);
      toast.success('Politique de congés mise à jour.');
    } catch (error) {
      console.error('Erreur sauvegarde politique de congés:', error);
      toast.error('Erreur lors de la sauvegarde de la politique de congés.');
    } finally {
      setLeavePolicySaving(false);
    }
  };

  const handleAddCompanyHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name) {
      toast.error('Date et nom du jour férié sont requis.');
      return;
    }
    setLeavePolicySaving(true); // Use same saving flag or a specific one
    try {
      const addedHoliday = await adminService.addCompanyHoliday(newHoliday);
      setCompanyHolidays(prev => [...prev, addedHoliday.data]);
      setNewHoliday({ date: '', name: '' }); // Reset form
      toast.success('Jour férié ajouté.');
    } catch (error) {
      console.error('Erreur ajout jour férié:', error);
      // Toast error is likely handled by interceptor
    } finally {
      setLeavePolicySaving(false);
    }
  };

  const handleDeleteCompanyHoliday = async (holidayId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce jour férié ?')) return;
    // Optimistic UI update or wait for success? For now, wait.
    setLeavePolicySaving(true);
    try {
      await adminService.deleteCompanyHoliday(holidayId);
      setCompanyHolidays(prev => prev.filter(h => h.id !== holidayId));
      toast.success('Jour férié supprimé.');
    } catch (error) {
      console.error('Erreur suppression jour férié:', error);
    } finally {
      setLeavePolicySaving(false);
    }
  };

  // Fonction pour obtenir la position actuelle
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée par votre navigateur')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettings(prev => ({
          ...prev,
          office_latitude: position.coords.latitude,
          office_longitude: position.coords.longitude
        }))
        toast.success('Position actuelle récupérée avec succès')
        setLoading(false)
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error)
        toast.error('Impossible d\'obtenir votre position')
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    )
  }

  if (!isAdmin) {
    return (
      <div className="card text-center">
        <div className="h-12 w-12 text-gray-400 mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès restreint
        </h3>
        <p className="text-gray-600">
          Seuls les administrateurs peuvent accéder aux paramètres de l'entreprise.
        </p>
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres de l'entreprise</h1>
        <p className="text-gray-600">
          Configurez les paramètres de pointage et gérez votre abonnement.
        </p>
      </div>

      {/* Existing Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center mb-4">
            <MapPin className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Localisation du bureau
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={settings.office_latitude}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    office_latitude: parseFloat(e.target.value)
                  }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={settings.office_longitude}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    office_longitude: parseFloat(e.target.value)
                  }))}
                  className="input-field"
                />
              </div>
            </div>
            
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="btn-secondary w-full"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {loading ? 'Récupération...' : 'Utiliser ma position actuelle'}
            </button>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rayon autorisé (mètres)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={settings.office_radius}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  office_radius: parseInt(e.target.value)
                }))}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center mb-4">
            <MapPin className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Identité visuelle</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo (URL)
              </label>
              <input
                type="text"
                value={settings.logo_url}
                onChange={(e) => setSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléverser un logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="input-field"
              />
              {settings.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-16 mt-2 object-contain" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur principale
              </label>
              <input
                type="color"
                value={settings.theme_color}
                onChange={(e) => setSettings(prev => ({ ...prev, theme_color: e.target.value }))}
                className="input-field h-10 p-1"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center mb-4">
            <Clock className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Horaires de travail
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure de début
              </label>
              <input
                type="time"
                value={settings.work_start_time}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  work_start_time: e.target.value
                }))}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tolérance retard (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.late_threshold}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  late_threshold: parseInt(e.target.value)
                }))}
                className="input-field"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sauvegarde...
            </div>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder les paramètres
            </>
          )}
        </button>
      </div>

      {/* Subscription Management Section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Abonnement et Facturation</h2>
        <p className="text-sm text-gray-600 mb-6">Gérez votre plan d'abonnement et vos informations de facturation.</p>

        {subscriptionLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : subscriptionData ? (
          <div className="space-y-6">
            <div className="card bg-gray-50 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Votre abonnement actuel</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Plan:</span>
                  <span className="ml-2 text-gray-900">{subscriptionData.subscription_plan?.toUpperCase() || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Statut:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    subscriptionData.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                    subscriptionData.subscription_status === 'trialing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {subscriptionData.subscription_status || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Employés max:</span>
                  <span className="ml-2 text-gray-900">{subscriptionData.max_employees}</span>
                </div>
                 <div>
                  <span className="font-medium text-gray-700">Peut ajouter employé:</span>
                  <span className={`ml-2 font-semibold ${subscriptionData.can_add_employee ? 'text-green-600' : 'text-red-600'}`}>
                    {subscriptionData.can_add_employee ? 'Oui' : 'Non (limite atteinte)'}
                  </span>
                </div>
                {subscriptionData.subscription_end && (
                  <div>
                    <span className="font-medium text-gray-700">Expire le:</span>
                    <span className="ml-2 text-gray-900">{new Date(subscriptionData.subscription_end).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              {subscriptionData.billing_portal_enabled && (
                <div className="mt-4">
                  <button
                    onClick={handleManageBilling}
                    disabled={actionLoading}
                    className="btn-secondary text-sm flex items-center disabled:opacity-50"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {actionLoading ? 'Chargement...' : 'Gérer ma facturation'}
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </button>
                   <p className="text-xs text-gray-500 mt-1">Vous serez redirigé vers Stripe pour gérer vos informations de paiement et factures.</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Changer de plan</h3>
              {subscriptionData.available_plans && subscriptionData.available_plans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subscriptionData.available_plans.map((plan) => (
                    <div key={plan.stripe_price_id} className={`card p-5 flex flex-col justify-between ${plan.stripe_price_id === subscriptionData.active_stripe_price_id ? 'border-2 border-blue-600 ring-2 ring-blue-300' : 'border'}`}>
                      <div>
                        <h4 className="text-md font-bold text-blue-700 mb-1">{plan.name.toUpperCase()}</h4>
                        <p className="text-2xl font-extrabold text-gray-900 mb-2">
                          {plan.amount_eur}€ <span className="text-sm font-normal text-gray-500">/ {plan.interval_months} mois</span>
                        </p>
                        <ul className="text-xs text-gray-600 space-y-1 mb-4">
                          <li>Jusqu'à {plan.max_employees} employés</li>
                          {/* TODO: Ajouter d'autres features du plan ici */}
                          <li>Support standard</li>
                        </ul>
                      </div>
                      {plan.stripe_price_id === subscriptionData.active_stripe_price_id ? (
                        <p className="btn-disabled w-full text-center text-sm">Plan Actuel</p>
                      ) : (
                        <button
                          onClick={() => handleSubscribe(plan.stripe_price_id)}
                          disabled={actionLoading}
                          className="btn-primary w-full text-sm disabled:opacity-50"
                        >
                          {actionLoading ? 'Chargement...' : 'Choisir ce plan'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                 <p className="text-gray-500 text-sm">Aucun autre plan n'est disponible pour le moment.</p>
              )}
            </div>

            <div className="card mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Prolonger l'abonnement</h3>
              <form onSubmit={handleExtensionRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de mois</label>
                  <input type="number" min={1} max={24} value={extensionMonths} onChange={(e) => setExtensionMonths(parseInt(e.target.value))} className="input-field w-32" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raison (optionnel)</label>
                  <textarea value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} className="input-field" rows={2} />
                </div>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Envoi...' : 'Envoyer la demande'}
                </button>
              </form>
            </div>

            <div className="card mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Vos factures</h3>
              {invoicesLoading ? (
                <p className="text-sm text-gray-500">Chargement...</p>
              ) : invoices.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left">ID</th>
                      <th className="px-2 py-1 text-left">Montant</th>
                      <th className="px-2 py-1 text-left">Mois</th>
                      <th className="px-2 py-1 text-left">Statut</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-t">
                        <td className="px-2 py-1">{inv.id}</td>
                        <td className="px-2 py-1">{inv.amount}€</td>
                        <td className="px-2 py-1">{inv.months}</td>
                        <td className="px-2 py-1 capitalize">{inv.status}</td>
                        <td className="px-2 py-1">
                          {inv.status !== 'paid' && (
                            <button onClick={() => handlePayInvoice(inv.id)} className="btn-primary btn-xs">
                              Payer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">Aucune facture disponible.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="card text-center py-10">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Impossible de charger les informations d'abonnement.</p>
            <p className="text-sm text-gray-500">Veuillez réessayer plus tard ou contacter le support.</p>
          </div>
        )}
      </div>

      {/* Leave Policy Management Section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Politique de Congés</h2>
        <p className="text-sm text-gray-600 mb-6">Configurez la semaine de travail et les jours fériés spécifiques à l'entreprise.</p>

        {leavePolicyLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Work Week Configuration */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-indigo-600" />
                Semaine de Travail
              </h3>
              <p className="text-sm text-gray-500 mb-3">Cochez les jours considérés comme ouvrés pour le calcul des congés.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-4">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((dayName, index) => (
                  <label key={index} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workDays.includes(index)}
                      onChange={() => handleWorkDayChange(index)}
                      className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{dayName}</span>
                  </label>
                ))}
              </div>

              <div>
                <label htmlFor="countryCodeHolidays" className="block text-sm font-medium text-gray-700 mb-1">
                  Code Pays pour Jours Fériés Nationaux (ex: FR, US, GB)
                </label>
                <input
                  type="text"
                  id="countryCodeHolidays"
                  value={defaultCountryCode}
                  onChange={(e) => setDefaultCountryCode(e.target.value.toUpperCase())}
                  className="input-field w-full md:w-1/3"
                  maxLength={10}
                />
              </div>
              <div className="mt-4 text-right">
                <button onClick={handleSaveLeavePolicy} disabled={leavePolicySaving} className="btn-primary">
                  {leavePolicySaving ? 'Sauvegarde...' : 'Sauvegarder Politique'}
                </button>
              </div>
            </div>

            {/* Company Specific Holidays */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <PlusCircle className="h-5 w-5 mr-2 text-teal-600" />
                Jours Fériés Spécifiques à l'Entreprise
              </h3>
              <form onSubmit={handleAddCompanyHoliday} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
                <div>
                  <label htmlFor="holidayName" className="block text-sm font-medium text-gray-700 mb-1">Nom du jour férié</label>
                  <input
                    type="text"
                    id="holidayName"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="Ex: Anniversaire Entreprise"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="holidayDate" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    id="holidayDate"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <button type="submit" disabled={leavePolicySaving} className="btn-primary h-fit">
                  <PlusCircle className="h-4 w-4 mr-1" /> Ajouter Férié
                </button>
              </form>

              {companyHolidays.length > 0 ? (
                <ul className="space-y-2">
                  {companyHolidays.map(holiday => (
                    <li key={holiday.id} className="flex justify-between items-center p-2 border rounded-md bg-gray-50">
                      <div>
                        <span className="font-medium text-gray-800">{holiday.name}</span>
                        <span className="text-sm text-gray-600 ml-2">({new Date(holiday.date+'T00:00:00').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })})</span>
                      </div>
                      <button onClick={() => handleDeleteCompanyHoliday(holiday.id)} disabled={leavePolicySaving} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Aucun jour férié spécifique à l'entreprise ajouté.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}