import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import FileUpload from '../components/FileUpload'
import ImportHistory from '../components/ImportHistory'
import TemplateDownload from '../components/TemplateDownload'

const DataImport = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Import</h1>
          <p className="mt-2 text-gray-600">
            Upload Excel files to import retailer and product data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload Area */}
          <div className="lg:col-span-2">
            <FileUpload onUploadComplete={() => {}} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <TemplateDownload />
            <ImportHistory />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataImport
