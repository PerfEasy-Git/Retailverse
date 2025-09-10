import api from './api'

class AuthService {
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { data } = response.data
      const { token, user } = data

      // Store tokens
      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', token) // Using same token for now
      
      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      return { user, token }
    } catch (error) {
      throw error
    }
  }

  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData)
      const { data } = response.data
      const { token, user } = data

      // Store tokens
      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', token)
      
      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      return { user, token }
    } catch (error) {
      throw error
    }
  }

  async logout() {
    try {
      // Clear local storage
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      
      // Remove authorization header
      delete api.defaults.headers.common['Authorization']
      
      // Call logout endpoint if needed
      // await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', { 
        token, 
        password: newPassword 
      })
      return response.data
    } catch (error) {
      throw error
    }
  }

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await api.post('/auth/refresh', { 
        refreshToken 
      })
      const { data } = response.data
      const { token, user } = data

      // Update stored tokens
      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', token)
      
      // Update authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      return { user, token }
    } catch (error) {
      // If refresh fails, logout user
      this.logout()
      throw error
    }
  }

  getStoredToken() {
    return localStorage.getItem('token')
  }

  isAuthenticated() {
    const token = this.getStoredToken()
    if (!token) return false

    try {
      // Check if token is expired
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp > currentTime
    } catch (error) {
      return false
    }
  }

  getCurrentUser() {
    const token = this.getStoredToken()
    if (!token) return null

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload
    } catch (error) {
      return null
    }
  }
}

export default new AuthService()
