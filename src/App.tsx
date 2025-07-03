import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import ChefServiceDashboard from './pages/ChefServiceDashboard'
import ChefProjetDashboard from './pages/ChefProjetDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import AuditeurDashboard from './pages/AuditeurDashboard'
import CheckIn from './pages/CheckIn'
import Checkout from './pages/Checkout'
import Profile from './pages/Profile'
import History from './pages/History'
import Settings from './pages/Settings'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import CompanyManagement from './pages/CompanyManagement'
import EmployeeManagement from './pages/EmployeeManagement'
import Reports from './pages/Reports'
import TeamCalendarPage from './pages/TeamCalendarPage'
import GeofencingPage from './pages/GeofencingPage'
import OfficeManagementPage from './pages/OfficeManagementPage'
import OrganizationManagement from './pages/OrganizationManagement'
import AdvancedFeatures from './pages/AdvancedFeatures'
import RoleManagementPage from './pages/RoleManagementPage'
import BillingManagement from './pages/BillingManagement'
import Missions from './pages/Missions'
import Layout from './components/Layout'

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) {
  const { user, loading } = useAuth()
  
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
  
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
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
          <Route path="/team-calendar" element={
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
          
          {/* Routes communes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/checkin" element={
            <ProtectedRoute>
              <Layout>
                <CheckIn />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute>
              <Layout>
                <Checkout />
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
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App