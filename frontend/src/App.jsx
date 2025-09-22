import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { MessageProvider } from './contexts/MessageContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import BrandProfile from './pages/BrandProfile'
import RetailerProfile from './pages/RetailerProfile'
import Discovery from './pages/Discovery'
import RetailerDetails from './pages/RetailerDetails'
import GTMStrategy from './pages/GTMStrategy'
import FitAnalysis from './pages/FitAnalysis'
import AssortmentPlanner from './pages/AssortmentPlanner'
import ProductManagement from './pages/ProductManagement'
import AdminDashboard from './pages/AdminDashboard'
import DataImport from './pages/DataImport'
import BrandRegistration from './components/BrandRegistration'

function App() {
  const location = useLocation()
  console.log('🌐 App component rendering, current location:', location.pathname, new Date().toISOString())
  
  return (
    <MessageProvider>
      <AuthProvider>
        <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/brand/register" element={
          <ProtectedRoute allowedRoles={['brand']}>
            <Layout>
              <BrandRegistration />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/brand/profile" element={
          <ProtectedRoute allowedRoles={['brand', 'brand_admin', 'brand_user']}>
            <Layout>
              <BrandProfile />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/retailer/profile" element={
          <ProtectedRoute allowedRoles={['retailer']}>
            <Layout>
              <RetailerProfile />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/discovery" element={
          <ProtectedRoute>
            <Layout>
              <Discovery />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/retailer/:retailerId" element={
          <ProtectedRoute>
            <Layout>
              <RetailerDetails />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/gtm-strategy" element={
          <ProtectedRoute>
            <Layout>
              <GTMStrategy />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/fit-analysis" element={
          <ProtectedRoute allowedRoles={['brand', 'brand_admin', 'brand_user']}>
            <Layout>
              <FitAnalysis />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/assortment-planner" element={
          <ProtectedRoute allowedRoles={['brand', 'brand_admin', 'brand_user']}>
            <Layout>
              <AssortmentPlanner />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/product-management" element={
          <ProtectedRoute allowedRoles={['brand', 'brand_admin', 'brand_user']}>
            <Layout>
              <ProductManagement />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/data-import" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout>
              <DataImport />
            </Layout>
          </ProtectedRoute>
        } />
        </Routes>
      </AuthProvider>
    </MessageProvider>
  )
}

export default App 