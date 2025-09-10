import React from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import api from '../services/api'

const TemplateDownload = () => {
  const handleDownload = async () => {
    try {
      const response = await api.get('/uploads/template', {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'retailer-data-template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Excel Template</h3>
      <div className="text-center">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <p className="text-sm text-gray-600 mb-4">
          Download the Excel template with the correct format
        </p>
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </button>
      </div>
    </div>
  )
}

export default TemplateDownload
