import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const ImportHistory = () => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await api.get('/uploads/history')
      console.log('History API response:', response.data)
      
      // Handle different response structures
      const historyData = response.data?.data || response.data || []
      setHistory(Array.isArray(historyData) ? historyData : [])
    } catch (error) {
      console.error('Failed to fetch history:', error)
      setHistory([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing': return <Clock className="h-4 w-4 text-blue-500" />
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6">Loading...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Import History</h3>
      <div className="space-y-3">
        {!Array.isArray(history) || history.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No import history found</p>
        ) : (
          history.map((upload) => (
            <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(upload.status)}
                <div>
                  <p className="text-sm font-medium text-gray-900">{upload.filename}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(upload.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-900">{upload.records_processed} records</p>
                <p className="text-xs text-gray-500 capitalize">{upload.status}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ImportHistory
