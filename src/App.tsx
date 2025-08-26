import React, { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { usePermissions } from './hooks/usePermissions'
import { initializeFirebaseSafely, areNotificationsAvailable } from './utils/firebaseLoader'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import AdminNotificationsHistory from './pages/admin/notifications/AdminNotificationsHistory'
import AttendanceHistoryAdmin from './pages/admin/AttendanceHistoryAdmin'
import AttendanceReport from './pages/admin/reports/AttendanceReport'
import NotificationsHistory from './pages/NotificationsHistory'

// Composant temporaire pour le module de gestion des abonnements
const SubscriptionManagementModule = () => {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Module de gestion des abonnements</h1>
      <p className="text-red-500">
        Le module est temporairement indisponible en raison d'un problème technique.
        Nous travaillons à sa résolution.
      </p>
    </div>
  );
}

import ChefServiceDashboard from './pages/ChefServiceDashboard'
import ChefProjetDashboard from './pages/ChefProjetDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import AuditeurDashboard from './pages/AuditeurDashboard'
import CheckIn from './pages/CheckIn'
import Checkout from './pages/Checkout'
import PausePage from './pages/Pause'
import AttendancePage from './pages/Attendance'
import Profile from './pages/Profile'
import History from './pages/History'
import AttendanceHome from './pages/attendance/AttendanceHome'
import CheckInPage from './pages/attendance/CheckInPage'
import Settings from './pages/Settings'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import CompanyManagement from './pages/CompanyManagement'
import EmployeeManagement from './pages/EmployeeManagement'
import EmployeeDetailsPage from './pages/EmployeeDetailsPage'
import Reports from './pages/Reports'
import TeamCalendarPage from './pages/TeamCalendarPage'
import GeofencingPage from './pages/GeofencingPage'
import OfficeManagementPage from './pages/OfficeManagementPage'
import OrganizationManagement from './pages/OrganizationManagement'
import AdvancedFeatures from './pages/AdvancedFeatures'
import RoleManagementPage from './pages/RoleManagementPage'
import BillingManagement from './pages/BillingManagement'
import WebhookManagementPage from './pages/WebhookManagementPage'
import AnalyticsPage from './pages/AnalyticsPage'
import QRCodeAdmin from './pages/admin/QRCodeAdmin'
import LeaveApprovalPage from './pages/admin/LeaveApprovalPage'
import QRScanner from './components/qrcode/QRScanner'
import AttendanceSuccess from './pages/attendance/AttendanceSuccess'
import ExtensionRequestsPage from './pages/ExtensionRequests'
import SubscriptionPlanPage from './pages/SubscriptionPlanPage'
import SuperAdminSubscriptionPage from './pages/SuperAdminSubscriptionPage'
import Missions from './pages/Missions'
import DebugPage from './pages/Debug'; // Page temporaire pour le débogage
import LeaveManagement from './pages/LeaveManagement';
import LeaveRequestPage from './pages/leave/LeaveRequestPage';
import MyLeaveHistoryPage from './pages/leave/MyLeaveHistoryPage';
import TeamLeaveCalendar from './pages/leave/TeamLeaveCalendar';
import LeaveApprovalManager from './pages/leave/LeaveApprovalPage';
import LeaveBalancesPage from './pages/leave/LeaveBalancesPage';
import RoleTestPage from './pages/RoleTestPage';
import Layout from './components/Layout'
import { attendanceService } from './services/api'

function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission 
}: { 
  children: React.ReactNode, 
  requiredRole?: string,
  requiredPermission?: string
}) {
  const { user, loading } = useAuth()
  const { checkPermission } = usePermissions()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />
  }
  
  if (requiredPermission && !checkPermission(requiredPermission)) {
    return <Navigate to="/" />
  }
  
  return <>{children}</>
}
function App() {
  // État pour suivre l'initialisation de Firebase
  const [firebaseInitAttempted, setFirebaseInitAttempted] = useState(false);

  // Effet pour synchroniser les check-ins hors ligne
  useEffect(() => {
    const syncOfflineCheckins = async () => {
      const stored = localStorage.getItem('offline_checkins')
      if (stored) {
        const checkins: string[] = JSON.parse(stored)
        const remaining: string[] = []
        for (const timestamp of checkins) {
          try {
            await attendanceService.checkInOffline(timestamp)
          } catch (error) {
            remaining.push(timestamp)
          }
        }
        if (remaining.length > 0) {
          localStorage.setItem('offline_checkins', JSON.stringify(remaining))
        } else {
          localStorage.removeItem('offline_checkins')
        }
      }
    }

    window.addEventListener('online', syncOfflineCheckins)
    syncOfflineCheckins()
    return () => window.removeEventListener('online', syncOfflineCheckins)
  }, [])
  
  // Effet pour initialiser Firebase de manière sécurisée
  useEffect(() => {
    if (!firebaseInitAttempted) {
      console.log("Tentative d'initialisation de Firebase en arrière-plan...");
      
      // Vérifier si les notifications sont disponibles
      const notificationsAvailable = areNotificationsAvailable();
      if (!notificationsAvailable) {
        console.log("Les notifications ne sont pas disponibles dans ce navigateur.");
        return;
      }
      
      // Initialiser Firebase de manière sécurisée
      initializeFirebaseSafely()
        .then(success => {
          console.log(success 
            ? "Firebase initialisé avec succès en arrière-plan" 
            : "Impossible d'initialiser Firebase en arrière-plan");
        })
        .catch(err => {
          console.error("Erreur lors de l'initialisation de Firebase:", err);
        })
        .finally(() => {
          setFirebaseInitAttempted(true);
        });
    }
  }, [firebaseInitAttempted]);

  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Route de débogage (à supprimer en production) */}
          <Route path="/debug" element={<DebugPage />} />
          
          {/* Routes SuperAdmin */}
          <Route path="/superadmin" element={
            <ProtectedRoute requiredRole="superadmin">
              <Layout>
                <SuperAdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/superadmin/companies" element={
            <ProtectedRoute requiredRole="superadmin">
              <Layout>
                <CompanyManagement />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/superadmin/billing" element={
            <ProtectedRoute requiredRole="superadmin">
              <Layout>
                <BillingManagement />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/superadmin/subscription" element={
            <ProtectedRoute requiredRole="superadmin">
              <Layout>
                <SuperAdminSubscriptionPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Route conservée pour la compatibilité */}
          <Route path="/superadmin/subscription-plans" element={
            <ProtectedRoute requiredRole="superadmin">
              <Layout>
                <Navigate to="/superadmin/subscription" replace />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/superadmin/extension-requests" element={
            <ProtectedRoute requiredRole="superadmin">
              <Layout>
                <ExtensionRequestsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/superadmin/notifications" element={
            <ProtectedRoute requiredRole="superadmin">
              <Layout>
                <AdminNotificationsHistory />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Routes Admin */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/employees" element={
            <ProtectedRoute>
              <Layout>
                <EmployeeManagement />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/employees/:id" element={
            <ProtectedRoute>
              <Layout>
                <EmployeeDetailsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/offices" element={
            <ProtectedRoute>
              <Layout>
                <OfficeManagementPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/organization" element={
            <ProtectedRoute>
              <Layout>
                <OrganizationManagement />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/webhooks" element={
            <ProtectedRoute> {/* Assuming general admin access, refine with specific role if needed */}
              <Layout>
                <WebhookManagementPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/notifications-history" element={
            <ProtectedRoute>
              <Layout>
                <AdminNotificationsHistory />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/attendance-history" element={
            <ProtectedRoute>
              <Layout>
                <AttendanceHistoryAdmin />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/attendance-report" element={
            <ProtectedRoute>
              <Layout>
                <AttendanceReport />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/superadmin/admin/notifications-history" element={
            <ProtectedRoute requiredRole="superadmin">
              <Layout>
                <AdminNotificationsHistory />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Admin Billing */}
          <Route path="/admin/billing" element={
            <ProtectedRoute>
              <Layout>
                <BillingManagement />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Dashboards par rôle */}
          <Route path="/chef-service" element={
            <ProtectedRoute requiredRole="chef_service">
              <Layout>
                <ChefServiceDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/chef-projet" element={
            <ProtectedRoute requiredRole="chef_projet">
              <Layout>
                <ChefProjetDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager" element={
            <ProtectedRoute requiredRole="manager">
              <Layout>
                <ManagerDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/auditeur" element={
            <ProtectedRoute requiredRole="auditeur">
              <Layout>
                <AuditeurDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Nouvelles routes */}
          <Route path="/reports" element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/team-calendar" element={
            <ProtectedRoute>
              <Layout>
                <TeamCalendarPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/team-calendar" element={
            <ProtectedRoute>
              <Layout>
                <TeamCalendarPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/geofencing" element={
            <ProtectedRoute>
              <Layout>
                <GeofencingPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/geofencing" element={
            <ProtectedRoute>
              <Layout>
                <GeofencingPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/qr-code" element={
            <ProtectedRoute>
              <Layout>
                <QRCodeAdmin />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/leave-approval" element={
            <ProtectedRoute>
              <LeaveApprovalPage />
            </ProtectedRoute>
          } />
          <Route path="/attendance/qr-scanner" element={
            <ProtectedRoute>
              <Layout>
                <QRScanner />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/attendance/qr-checkin/:token" element={
            <ProtectedRoute>
              <Layout>
                <QRScanner />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/attendance/success" element={
            <ProtectedRoute>
              <Layout>
                <AttendanceSuccess />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/missions" element={
            <ProtectedRoute>
              <Layout>
                <Missions />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/advanced" element={
            <ProtectedRoute>
              <Layout>
                <AdvancedFeatures />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/roles" element={
            <ProtectedRoute>
              <Layout>
                <RoleManagementPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/roles/test" element={
            <ProtectedRoute>
              <Layout>
                <RoleTestPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/leave" element={
            <ProtectedRoute>
              <Layout>
                <LeaveManagement />
              </Layout>
            </ProtectedRoute>
          }>
            {/* Sous-routes pour la gestion des congés */}
            <Route path="request" element={<LeaveRequestPage />} />
            <Route path="my-history" element={<MyLeaveHistoryPage />} />
            <Route path="team-calendar" element={<TeamLeaveCalendar />} />
            <Route path="approvals" element={<LeaveApprovalManager />} />
            <Route path="balances" element={<LeaveBalancesPage />} />
            <Route index element={<Navigate to="/leave/my-history" replace />} />
          </Route>
          <Route path="/subscription-plans" element={
            <ProtectedRoute>
              <Layout>
                <SubscriptionPlanPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <Layout>
                <History />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Routes d'authentification et de profil */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Route d'historique des notifications pour tous les utilisateurs */}
          <Route path="/notifications/history" element={
            <ProtectedRoute>
              <Layout>
                <NotificationsHistory />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Routes de présence */}
          <Route path="/attendance" element={
            <ProtectedRoute>
              <Layout>
                <AttendancePage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/attendance/home" element={
            <ProtectedRoute>
              <Layout>
                <AttendanceHome />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/attendance/checkin" element={
            <ProtectedRoute>
              <Layout>
                <CheckInPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/checkin" element={
            <ProtectedRoute>
              <CheckIn />
            </ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          } />
          <Route path="/pause" element={
            <ProtectedRoute>
              <PausePage />
            </ProtectedRoute>
          } />
          
          {/* Tableau de bord analytique */}
          <Route path="/analytics" element={
            <ProtectedRoute requiredPermission="analytics.access_basic">
              <Layout>
                <AnalyticsPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Route par défaut */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Redirection pour les routes inconnues */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
