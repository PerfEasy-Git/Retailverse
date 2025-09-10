import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true, // Enable cookies for session-based auth
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Session-based auth - no need to add Authorization header
    // Cookies are automatically sent with withCredentials: true
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors by redirecting to login
    if (error.response?.status === 401 && !originalRequest._retry && 
        !originalRequest.url.includes('/auth/login') && 
        !originalRequest.url.includes('/auth/register')) {
      originalRequest._retry = true

      // Clear any stored tokens (if any)
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('sessionId')

      // Redirect to login page
      window.location.href = '/login'
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default api 