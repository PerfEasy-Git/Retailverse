import { createContext, useContext, useState, useEffect } from 'react'
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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { showSuccess, showError } = useMessage()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Check if user is authenticated via session cookie
      const response = await api.get('/auth/me')
      setUser(response.data.data.user)
    } catch (error) {
      // User is not authenticated
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
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
      
      // Check if brand user needs to complete registration
      if (user.role === 'brand_admin' || user.role === 'brand_user') {
        try {
          const brandResponse = await api.get('/brands/profile')
          // If brand profile exists, go to dashboard
          showSuccess('Login successful!')
          navigate('/dashboard')
        } catch (error) {
          // If brand profile doesn't exist, redirect to brand registration
          showSuccess('Login successful!')
          navigate('/brand/register')
        }
      } else {
        showSuccess('Login successful!')
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