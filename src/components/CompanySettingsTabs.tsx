import React from 'react';
import { NotificationsTab, IntegrationsTab, ExportTab } from './SettingsTabs';

// Types pour les props
interface CompanySettingsTabsProps {
  activeTab: 'general' | 'billing' | 'leave' | 'notifications' | 'integrations' | 'export';
  notificationSettings: {
    email_notifications: boolean;
    push_notifications: boolean;
    attendance_alerts: boolean;
    leave_alerts: boolean;
    system_notifications: boolean;
  };
  setNotificationSettings: React.Dispatch<React.SetStateAction<{
    email_notifications: boolean;
    push_notifications: boolean;
    attendance_alerts: boolean;
    leave_alerts: boolean;
    system_notifications: boolean;
  }>>;
  handleUpdateNotificationSettings: () => Promise<void>;
  integrationSettings: {
    webhook_url: string;
    webhook_enabled: boolean;
    webhook_events: string[];
    api_enabled: boolean;
  };
  setIntegrationSettings: React.Dispatch<React.SetStateAction<{
    webhook_url: string;
    webhook_enabled: boolean;
    webhook_events: string[];
    api_enabled: boolean;
  }>>;
  handleUpdateIntegrationSettings: () => Promise<void>;
  exportFormat: 'csv' | 'excel' | 'json';
  setExportFormat: React.Dispatch<React.SetStateAction<'csv' | 'excel' | 'json'>>;
  handleExportData: (dataType: string) => Promise<void>;
}

// Composant principal pour les onglets des paramètres
const CompanySettingsTabs: React.FC<CompanySettingsTabsProps> = ({
  activeTab,
  notificationSettings,
  setNotificationSettings,
  handleUpdateNotificationSettings,
  integrationSettings,
  setIntegrationSettings,
  handleUpdateIntegrationSettings,
  exportFormat,
  setExportFormat,
  handleExportData
}) => {
  return (
    <>
      {/* Pour l'onglet Notifications */}
      {activeTab === 'notifications' && (
        <NotificationsTab 
          notificationSettings={notificationSettings}
          setNotificationSettings={setNotificationSettings}
          handleUpdateNotificationSettings={handleUpdateNotificationSettings}
        />
      )}

      {/* Pour l'onglet Intégrations */}
      {activeTab === 'integrations' && (
        <IntegrationsTab
          integrationSettings={integrationSettings}
          setIntegrationSettings={setIntegrationSettings}
          handleUpdateIntegrationSettings={handleUpdateIntegrationSettings}
        />
      )}

      {/* Pour l'onglet Exportation */}
      {activeTab === 'export' && (
        <ExportTab
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          handleExportData={handleExportData}
        />
      )}
    </>
  );
};

export default CompanySettingsTabs;
