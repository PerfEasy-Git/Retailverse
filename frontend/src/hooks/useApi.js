import { useState, useCallback } from 'react'
import api from '../services/api'

export const useApi = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const request = useCallback(async (apiCall) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiCall()
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const get = useCallback((url, config) => {
    return request(() => api.get(url, config))
  }, [request])

  const post = useCallback((url, data, config) => {
    return request(() => api.post(url, data, config))
  }, [request])

  const put = useCallback((url, data, config) => {
    return request(() => api.put(url, data, config))
  }, [request])

  const patch = useCallback((url, data, config) => {
    return request(() => api.patch(url, data, config))
  }, [request])

  const del = useCallback((url, config) => {
    return request(() => api.delete(url, config))
  }, [request])

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    patch,
    delete: del
  }
}
