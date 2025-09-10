import api from './api'

class UploadService {
  async uploadExcelFile(file, onProgress) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/uploads/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            onProgress(percentCompleted)
          }
        },
      })

      return response.data
    } catch (error) {
      throw error
    }
  }

  async getUploadStatus(uploadId) {
    try {
      const response = await api.get(`/uploads/status/${uploadId}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  async getUploadHistory() {
    try {
      const response = await api.get('/uploads/history')
      return response.data
    } catch (error) {
      throw error
    }
  }

  async deleteUpload(uploadId) {
    try {
      const response = await api.delete(`/uploads/${uploadId}`)
      return response.data
    } catch (error) {
      throw error
    }
  }

  validateFile(file) {
    const errors = []

    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      errors.push('Please upload an Excel file (.xlsx or .xls)')
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size must be less than 10MB')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  getFileSizeString(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  formatUploadDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  getStatusColor(status) {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }
}

export default new UploadService()
