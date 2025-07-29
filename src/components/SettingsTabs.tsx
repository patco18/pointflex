import React from 'react';
import { Bell, Globe, Download, MessageSquare, Mail, FileJson, Share2, Zap, Webhook } from 'lucide-react';

// Composants pour les nouvelles sections
export const NotificationsTab = ({ 
  notificationSettings, 
  setNotificationSettings, 
  handleUpdateNotificationSettings 
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Paramètres de Notifications</h2>
      <p className="text-sm text-gray-600 mb-6">Configurez comment vous souhaitez être notifié des événements importants.</p>
      
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Mail className="h-5 w-5 mr-2 text-indigo-600" />
          Notifications par Email
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="email_notifications"
              type="checkbox"
              checked={notificationSettings.email_notifications}
              onChange={(e) => setNotificationSettings({
                ...notificationSettings,
                email_notifications: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="email_notifications" className="ml-2 block text-sm text-gray-700">
              Activer les notifications par email
            </label>
          </div>
          
          <p className="text-sm text-gray-500">
            Les notifications par email incluent les pointages, demandes de congés, et annonces importantes.
          </p>
        </div>
      </div>
      
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Bell className="h-5 w-5 mr-2 text-indigo-600" />
          Notifications Push et SMS
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="push_notifications"
              type="checkbox"
              checked={notificationSettings.push_notifications}
              onChange={(e) => setNotificationSettings({
                ...notificationSettings,
                push_notifications: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="push_notifications" className="ml-2 block text-sm text-gray-700">
              Activer les notifications push
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              id="sms_notifications"
              type="checkbox"
              checked={notificationSettings.sms_notifications || false}
              onChange={(e) => setNotificationSettings({
                ...notificationSettings,
                sms_notifications: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="sms_notifications" className="ml-2 block text-sm text-gray-700">
              Activer les notifications par SMS
            </label>
          </div>
          
          <p className="text-sm text-gray-500">
            Les notifications push sont envoyées directement à votre navigateur ou application mobile.
            Les SMS permettent d'atteindre les employés sans internet, adapté au contexte africain.
          </p>
        </div>
      </div>
      
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-indigo-600" />
          Catégories de Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="attendance_alerts"
              type="checkbox"
              checked={notificationSettings.attendance_alerts}
              onChange={(e) => setNotificationSettings({
                ...notificationSettings,
                attendance_alerts: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="attendance_alerts" className="ml-2 block text-sm text-gray-700">
              Alertes de présence
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              id="leave_alerts"
              type="checkbox"
              checked={notificationSettings.leave_alerts}
              onChange={(e) => setNotificationSettings({
                ...notificationSettings,
                leave_alerts: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="leave_alerts" className="ml-2 block text-sm text-gray-700">
              Alertes de congés
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              id="system_notifications"
              type="checkbox"
              checked={notificationSettings.system_notifications}
              onChange={(e) => setNotificationSettings({
                ...notificationSettings,
                system_notifications: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="system_notifications" className="ml-2 block text-sm text-gray-700">
              Notifications système
            </label>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleUpdateNotificationSettings}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Enregistrer les paramètres
        </button>
      </div>
    </div>
  );
};

export const IntegrationsTab = ({ 
  integrationSettings, 
  setIntegrationSettings, 
  handleUpdateIntegrationSettings 
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Intégrations & API</h2>
      <p className="text-sm text-gray-600 mb-6">Configurez l'intégration avec d'autres systèmes via API et webhooks.</p>
      
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Webhook className="h-5 w-5 mr-2 text-indigo-600" />
          Webhooks et Services Mobile
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="webhook_enabled"
              type="checkbox"
              checked={integrationSettings.webhook_enabled}
              onChange={(e) => setIntegrationSettings({
                ...integrationSettings,
                webhook_enabled: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="webhook_enabled" className="ml-2 block text-sm text-gray-700">
              Activer les webhooks
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              id="mobile_money_enabled"
              type="checkbox"
              checked={integrationSettings.mobile_money_enabled || false}
              onChange={(e) => setIntegrationSettings({
                ...integrationSettings,
                mobile_money_enabled: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="mobile_money_enabled" className="ml-2 block text-sm text-gray-700">
              Activer l'intégration Mobile Money (Orange Money, MTN Mobile Money, Moov Money)
            </label>
          </div>
          
          <div>
            <label htmlFor="webhook_url" className="block text-sm font-medium text-gray-700 mb-1">
              URL du webhook
            </label>
            <input
              id="webhook_url"
              type="text"
              value={integrationSettings.webhook_url}
              onChange={(e) => setIntegrationSettings({
                ...integrationSettings,
                webhook_url: e.target.value
              })}
              placeholder="https://exemple.com/webhook"
              className="form-input mt-1 block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            />
            <p className="text-sm text-gray-500 mt-1">
              L'URL vers laquelle les événements seront envoyés. Compatible avec les services d'API locales.
            </p>
          </div>
          
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">
              Événements à notifier
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['pointage.created', 'leave.requested', 'leave.approved', 'leave.rejected', 'employee.created', 
              'employee.updated', 'mobile_money.paid', 'mobile_money.failed', 'invoice.generated', 'payslip.generated'].map((event) => (
                <div key={event} className="flex items-center">
                  <input
                    id={`event_${event}`}
                    type="checkbox"
                    checked={integrationSettings.webhook_events.includes(event)}
                    onChange={(e) => {
                      const newEvents = e.target.checked 
                        ? [...integrationSettings.webhook_events, event]
                        : integrationSettings.webhook_events.filter(e => e !== event);
                      
                      setIntegrationSettings({
                        ...integrationSettings,
                        webhook_events: newEvents
                      });
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`event_${event}`} className="ml-2 block text-sm text-gray-700">
                    {event}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Globe className="h-5 w-5 mr-2 text-indigo-600" />
          API Access
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="api_enabled"
              type="checkbox"
              checked={integrationSettings.api_enabled}
              onChange={(e) => setIntegrationSettings({
                ...integrationSettings,
                api_enabled: e.target.checked
              })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="api_enabled" className="ml-2 block text-sm text-gray-700">
              Activer l'accès à l'API
            </label>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="text-sm font-medium text-gray-800 mb-2">Générer une clé API</h4>
            <p className="text-sm text-gray-500 mb-3">
              Une fois générée, votre clé API ne sera affichée qu'une seule fois. Assurez-vous de la copier et de la stocker de manière sécurisée.
            </p>
            <div className="space-y-3">
              {integrationSettings.api_key ? (
                <div className="text-sm bg-blue-50 p-2 border border-blue-200 rounded">
                  <span className="font-medium">Clé API active</span>
                  <p className="text-xs mt-1 text-gray-600">Une clé API a déjà été générée pour ce compte.</p>
                </div>
              ) : null}
              <button
                onClick={() => {
                  import('../services/api').then(({ adminService }) => {
                    adminService.generateApiKey().then(response => {
                      const apiKey = response.data.api_key;
                      // Afficher la clé dans une boîte de dialogue modale
                      alert(`Votre nouvelle clé API: ${apiKey}\n\nATTENTION: Copiez cette clé maintenant, elle ne sera plus jamais affichée.`);
                      // Mettre à jour l'état local pour refléter qu'une clé existe maintenant
                      setIntegrationSettings({
                        ...integrationSettings,
                        api_enabled: true,
                        api_key: true // On ne stocke pas la vraie clé côté client pour des raisons de sécurité
                      });
                    }).catch(error => {
                      console.error('Erreur génération clé API:', error);
                      alert('Erreur lors de la génération de la clé API. Veuillez réessayer.');
                    });
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Générer une nouvelle clé
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleUpdateIntegrationSettings}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Enregistrer les paramètres
        </button>
      </div>
    </div>
  );
};

export const ExportTab = ({ exportFormat, setExportFormat, handleExportData }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Exportation des Données</h2>
      <p className="text-sm text-gray-600 mb-6">Exportez les données de votre entreprise dans différents formats.</p>
      
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Download className="h-5 w-5 mr-2 text-indigo-600" />
          Exportation des Données
        </h3>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="export_format" className="block text-sm font-medium text-gray-700 mb-1">
              Format d'exportation
            </label>
            <select
              id="export_format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="form-select block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="json">JSON</option>
            </select>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card bg-white p-4 border border-gray-200 rounded-md hover:shadow-md transition-shadow">
              <h4 className="font-semibold mb-2 flex items-center">
                <FileJson className="h-5 w-5 mr-2 text-indigo-600" />
                Données des Employés
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Liste complète des employés avec leurs informations (noms, contacts, postes, départements).
                Format compatible avec les déclarations CNPS.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Format: {exportFormat.toUpperCase()}</div>
                <button
                  onClick={() => handleExportData('employees')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Exporter
                </button>
              </div>
            </div>
            
            <div className="card bg-white p-4 border border-gray-200 rounded-md hover:shadow-md transition-shadow">
              <h4 className="font-semibold mb-2 flex items-center">
                <FileJson className="h-5 w-5 mr-2 text-indigo-600" />
                Données de Présence
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Historique des pointages de tous les employés.
                Inclut les heures, géolocalisation et appareils utilisés.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Format: {exportFormat.toUpperCase()}</div>
                <button
                  onClick={() => handleExportData('attendance')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Exporter
                </button>
              </div>
            </div>
            
            <div className="card bg-white p-4 border border-gray-200 rounded-md hover:shadow-md transition-shadow">
              <h4 className="font-semibold mb-2 flex items-center">
                <FileJson className="h-5 w-5 mr-2 text-indigo-600" />
                Données de Congés
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Demandes et historique des congés de tous les employés.
                Idéal pour le suivi annuel des congés.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Format: {exportFormat.toUpperCase()}</div>
                <button
                  onClick={() => handleExportData('leaves')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Exporter
                </button>
              </div>
            </div>
            
            <div className="card bg-white p-4 border border-gray-200 rounded-md hover:shadow-md transition-shadow">
              <h4 className="font-semibold mb-2 flex items-center">
                <FileJson className="h-5 w-5 mr-2 text-indigo-600" />
                Données de Facturation
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Historique complet des factures et paiements en FCFA.
                Format compatible avec la comptabilité selon le SYSCOHADA.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Format: {exportFormat.toUpperCase()}</div>
                <button
                  onClick={() => handleExportData('billing')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Exporter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
