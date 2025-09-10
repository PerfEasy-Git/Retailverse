import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useMessage } from '../contexts/MessageContext'
import api from '../services/api'
import { Upload, File, CheckCircle, AlertCircle, X } from 'lucide-react'

const FileUpload = ({ onUploadComplete }) => {
  const { user } = useAuth()
  const { showSuccess, showError } = useMessage()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [progress, setProgress] = useState(0)
  const [statusTimeout, setStatusTimeout] = useState(null)
  const [processingStatus, setProcessingStatus] = useState(null)
  const [detailedResults, setDetailedResults] = useState(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (statusTimeout) {
        clearTimeout(statusTimeout)
      }
    }
  }, [statusTimeout])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file) => {
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      showError('Please upload an Excel file (.xlsx or .xls)')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showError('File size must be less than 10MB')
      return
    }

    await uploadFile(file)
  }

  const uploadFile = async (file) => {
    try {
      setUploading(true)
      setProgress(0)
      setUploadStatus(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/uploads/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setProgress(percentCompleted)
        },
      })

      setStatusWithAutoDismiss({
        type: 'success',
        message: 'File uploaded successfully! Processing started.',
        uploadId: response.data.data.upload_id
      }, 3000) // Auto-dismiss after 3 seconds

      showSuccess('File uploaded successfully! Processing started.')
      
      if (onUploadComplete) {
        onUploadComplete(response.data.data)
      }

      // Start polling for status
      pollUploadStatus(response.data.data.upload_id)

    } catch (error) {
      console.error('Upload error:', error)
      setStatusWithAutoDismiss({
        type: 'error',
        message: error.response?.data?.error || 'Upload failed'
      }, 8000) // Auto-dismiss after 8 seconds for errors
      showError(error.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const pollUploadStatus = async (uploadId) => {
    const maxAttempts = 30 // 5 minutes max
    let attempts = 0

    const poll = async () => {
      try {
        const response = await api.get(`/uploads/status/${uploadId}`)
        const status = response.data.data

        // Debug logging
        console.log('📡 Status response:', status)

        // Update progress and status
        if (status.progress !== undefined) {
          setProgress(status.progress)
          console.log('📈 Progress updated to:', status.progress)
        }
        if (status.status_message) {
          setProcessingStatus(status.status_message)
          console.log('📝 Status message updated to:', status.status_message)
        }

        if (status.status === 'completed') {
          setProgress(100)
          setProcessingStatus('Processing completed!')
          
          // Parse detailed results
          if (status.processing_results) {
            console.log('📊 Processing results received:', status.processing_results)
            const results = typeof status.processing_results === 'string' 
              ? JSON.parse(status.processing_results) 
              : status.processing_results
            console.log('📊 Parsed results:', results)
            setDetailedResults(results)
          } else {
            console.log('❌ No processing results in response')
          }

          setStatusWithAutoDismiss({
            type: 'success',
            message: `Processing completed! ${status.records_processed} records processed.`,
            uploadId: uploadId
          }, 5000) // Auto-dismiss after 5 seconds
          showSuccess(`Processing completed! ${status.records_processed} records processed.`)
          return
        } else if (status.status === 'failed') {
          setProcessingStatus('Processing failed')
          setStatusWithAutoDismiss({
            type: 'error',
            message: `Processing failed: ${status.error_message}`,
            uploadId: uploadId
          }, 8000) // Auto-dismiss after 8 seconds for errors
          showError(`Processing failed: ${status.error_message}`)
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000) // Poll every 2 seconds for real-time updates
        } else {
          setProcessingStatus('Processing timeout')
          setStatusWithAutoDismiss({
            type: 'warning',
            message: 'Processing is taking longer than expected. Please check back later.',
            uploadId: uploadId
          }, 10000) // Auto-dismiss after 10 seconds for warnings
        }
      } catch (error) {
        console.error('Status polling error:', error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        }
      }
    }

    setTimeout(poll, 2000) // Start polling after 2 seconds
  }

  const clearStatus = () => {
    setUploadStatus(null)
    setProgress(0)
    setProcessingStatus(null)
    setDetailedResults(null)
    if (statusTimeout) {
      clearTimeout(statusTimeout)
      setStatusTimeout(null)
    }
  }

  const setStatusWithAutoDismiss = (status, autoDismissDelay = 5000) => {
    setUploadStatus(status)
    
    // Clear any existing timeout
    if (statusTimeout) {
      clearTimeout(statusTimeout)
    }
    
    // Set new timeout for auto-dismiss
    const timeout = setTimeout(() => {
      setUploadStatus(null)
      setStatusTimeout(null)
    }, autoDismissDelay)
    
    setStatusTimeout(timeout)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Excel File
        </h3>
        <p className="text-sm text-gray-600">
          Upload an Excel file containing retailer data. The file should contain sheets for:
          RETAILER_INFO, PRODUCT_INFO, RETAILER_PRODUCT_MAPPING, and RETAILER_LOCATION.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />
        
        <label
          htmlFor="file-upload"
          className="cursor-pointer"
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="text-lg font-medium text-gray-900 mb-2">
            {uploading ? 'Uploading...' : 'Drop your Excel file here'}
          </div>
          <div className="text-sm text-gray-600">
            or click to browse files
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Supports .xlsx and .xls files up to 10MB
          </div>
        </label>
      </div>

      {/* Progress Bar */}
      {(uploading || processingStatus) && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{processingStatus || 'Uploading...'}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      {detailedResults && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Processing Results</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(detailedResults).map(([sheetName, result]) => (
              <div key={sheetName} className="bg-white rounded-lg p-4 border">
                <h5 className="font-medium text-gray-900 mb-2">
                  {sheetName.replace(/_/g, ' ')}
                </h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processed:</span>
                    <span className="font-medium text-green-600">{result.processed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Errors:</span>
                    <span className="font-medium text-red-600">{result.errors ? result.errors.length : 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Rows:</span>
                    <span className="font-medium text-gray-900">{result.totalRows}</span>
                  </div>
                </div>
                {result.errors && result.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                      View {result.errors.length} error(s)
                    </summary>
                    <div className="mt-2 text-xs text-red-600 max-h-20 overflow-y-auto">
                      {result.errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="mb-1">• {error}</div>
                      ))}
                      {result.errors.length > 5 && (
                        <div className="text-gray-500">... and {result.errors.length - 5} more</div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadStatus && (
        <div className={`mt-4 p-4 rounded-lg flex items-start ${
          uploadStatus.type === 'success' ? 'bg-green-50 border border-green-200' :
          uploadStatus.type === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex-shrink-0">
            {uploadStatus.type === 'success' && <CheckCircle className="h-5 w-5 text-green-400" />}
            {uploadStatus.type === 'error' && <AlertCircle className="h-5 w-5 text-red-400" />}
            {uploadStatus.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-400" />}
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm ${
              uploadStatus.type === 'success' ? 'text-green-800' :
              uploadStatus.type === 'error' ? 'text-red-800' :
              'text-yellow-800'
            }`}>
              {uploadStatus.message}
            </p>
          </div>
          <button
            onClick={clearStatus}
            className="ml-3 flex-shrink-0"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      )}
    </div>
  )
}

export default FileUpload
