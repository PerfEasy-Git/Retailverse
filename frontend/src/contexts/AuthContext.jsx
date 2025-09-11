import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMessage } from './MessageContext'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  console.log('🔐 AuthProvider rendering...', new Date().toISOString())
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const authCheckRef = useRef(false)
  
  // Debug user state changes
  useEffect(() => {
    console.log('👤 User state changed:', user, new Date().toISOString())
  }, [user])
  
  // Debug loading state changes
  useEffect(() => {
    console.log('⏳ Loading state changed:', loading, new Date().toISOString())
  }, [loading])
  
  const navigate = useNavigate()
  const { showSuccess, showError } = useMessage()
  
  console.log('🔐 AuthProvider state:', { user, loading, authCheckRef: authCheckRef.current })

  useEffect(() => {
    console.log('🔍 AuthContext useEffect triggered, authCheckRef.current:', authCheckRef.current, new Date().toISOString())
    if (!authCheckRef.current) {
      console.log('✅ Setting authCheckRef to true and calling checkAuth', new Date().toISOString())
      authCheckRef.current = true
      checkAuth()
    } else {
      console.log('⏭️ Skipping checkAuth - already called', new Date().toISOString())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    console.log('🔍 checkAuth function called', new Date().toISOString())
    console.log('🔍 authCheckRef.current:', authCheckRef.current)
    console.log('🔍 loading state:', loading)
    
    if (authCheckRef.current && !loading) {
      console.log('⏭️ checkAuth already completed, skipping', new Date().toISOString())
      return
    }
    
    try {
      // Check if user is authenticated via session cookie
      console.log('🔍 Checking authentication...', new Date().toISOString())
      const response = await api.get('/auth/me')
      console.log('✅ Auth check successful:', response.data, new Date().toISOString())
      setUser(response.data.data.user)
    } catch (error) {
      // User is not authenticated
      console.log('❌ Auth check failed:', error.response?.data || error.message, new Date().toISOString())
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext.login called with email:', email, new Date().toISOString())
      const response = await api.post('/auth/login', { email, password })
      console.log('✅ Login API response received:', response.data, new Date().toISOString())
      
      const { data } = response.data
      const { user, sessionId } = data
      
      console.log('👤 User data from login:', user, new Date().toISOString())
      console.log('🔑 Session ID from login:', sessionId, new Date().toISOString())
      
      // Store session ID (though cookies are the primary auth method)
      localStorage.setItem('sessionId', sessionId)
      
      setUser(user)
      console.log('✅ User state updated in AuthContext', new Date().toISOString())
      
      // Check if user object is valid
      if (!user || !user.role) {
        showError('Invalid user data received')
        return
      }
      
      // Check if brand user needs to complete registration
      if (user.role === 'brand_admin' || user.role === 'brand_user') {
        try {
          console.log('🔍 Checking brand profile for user:', user.id, new Date().toISOString())
          const brandResponse = await api.get('/brands/profile')
          console.log('✅ Brand profile found:', brandResponse.data, new Date().toISOString())
          // If brand profile exists, go to dashboard
          showSuccess('Login successful!')
          console.log('🚀 Navigating to /dashboard', new Date().toISOString())
          navigate('/dashboard')
        } catch (error) {
          console.log('❌ Brand profile not found, redirecting to registration:', error.response?.data || error.message, new Date().toISOString())
          // If brand profile doesn't exist, redirect to brand registration
          showSuccess('Login successful!')
          console.log('🚀 Navigating to /brand/register', new Date().toISOString())
          navigate('/brand/register')
        }
      } else {
        showSuccess('Login successful!')
        console.log('🚀 Navigating to /dashboard (non-brand user)', new Date().toISOString())
        navigate('/dashboard')
      }
    } catch (error) {
      showError(error.response?.data?.error || 'Login failed')
      throw error
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      const { data } = response.data
      const { user, sessionId } = data
      
      // Store session ID (though cookies are the primary auth method)
      localStorage.setItem('sessionId', sessionId)
      
      setUser(user)
      
      // Check if user object is valid
      if (!user || !user.role) {
        showError('Invalid user data received')
        return
      }
      
      showSuccess('Registration successful!')
      
      // Check if brand user needs to complete registration
      if (user.role === 'brand') {
        navigate('/brand/register')
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      showError(error.response?.data?.error || 'Registration failed')
      throw error
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('sessionId')
      setUser(null)
      navigate('/')
      showSuccess('Logged out successfully')
    }
  }


  const value = {
    user,
    loading,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 