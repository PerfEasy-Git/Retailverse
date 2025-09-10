import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from 'react-query'
import api from '../services/api'
import { Search, Filter, Building2, Store, TrendingUp, MapPin } from 'lucide-react'

const Discovery = () => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    category: '',
    region: '',
    format: ''
  })
  const [activeTab, setActiveTab] = useState('brands')

  const { data: brands, isLoading: brandsLoading } = useQuery(
    ['discovery-brands', filters, searchTerm],
    () => api.get('/discovery/brands', { 
      params: { ...filters, search: searchTerm } 
    }).then(res => res.data.data),
    {
      enabled: activeTab === 'brands'
    }
  )

  const { data: retailers, isLoading: retailersLoading } = useQuery(
    ['discovery-retailers', filters, searchTerm],
    () => api.get('/discovery/retailers', { 
      params: { ...filters, search: searchTerm } 
    }).then(res => res.data.data),
    {
      enabled: activeTab === 'retailers'
    }
  )

  const { data: trending } = useQuery(
    ['discovery-trending'],
    () => api.get('/discovery/trending').then(res => res.data.data),
    {
      refetchInterval: 300000 // 5 minutes
    }
  )

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      category: '',
      region: '',
      format: ''
    })
    setSearchTerm('')
  }

  const isLoading = brandsLoading || retailersLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discovery</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find the perfect partners for your business
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Fashion">Fashion</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Sports">Sports</option>
                <option value="Beauty">Beauty</option>
                <option value="Food & Beverage">Food & Beverage</option>
                <option value="Automotive">Automotive</option>
                <option value="Health & Wellness">Health & Wellness</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Region</label>
              <select
                value={filters.region}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Regions</option>
                <option value="North America">North America</option>
                <option value="Europe">Europe</option>
                <option value="Asia Pacific">Asia Pacific</option>
                <option value="Latin America">Latin America</option>
                <option value="Middle East">Middle East</option>
                <option value="Africa">Africa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Format</label>
              <select
                value={filters.format}
                onChange={(e) => handleFilterChange('format', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Formats</option>
                {activeTab === 'brands' ? (
                  <>
                    <option value="B2B">B2B</option>
                    <option value="B2C">B2C</option>
                    <option value="D2C">D2C</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Retail">Retail</option>
                  </>
                ) : (
                  <>
                    <option value="Department Store">Department Store</option>
                    <option value="Specialty Store">Specialty Store</option>
                    <option value="Supermarket">Supermarket</option>
                    <option value="Convenience Store">Convenience Store</option>
                    <option value="Online Store">Online Store</option>
                    <option value="Boutique">Boutique</option>
                    <option value="Chain Store">Chain Store</option>
                    <option value="Independent Store">Independent Store</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex justify-between items-center">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <Filter className="h-4 w-4 mr-1" />
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {/* Trending Categories */}
      {trending && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
            Trending Categories
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {trending.trendingCategories?.map((category) => (
              <div key={category.category} className="text-center">
                <div className="text-2xl font-bold text-primary-600">{category.count}</div>
                <div className="text-sm text-gray-500">{category.category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('brands')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'brands'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 className="h-4 w-4 inline mr-2" />
              Brands ({brands?.brands?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('retailers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'retailers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Store className="h-4 w-4 inline mr-2" />
              Retailers ({retailers?.retailers?.length || 0})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeTab === 'brands' && brands?.brands?.map((brand) => (
                <div key={brand.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Building2 className="h-8 w-8 text-primary-600" />
                      <h3 className="ml-3 text-lg font-medium text-gray-900">{brand.name}</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">{brand.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {brand.region}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {brand.category}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {brand.format}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {activeTab === 'retailers' && retailers?.retailers?.map((retailer) => (
                <div key={retailer.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Store className="h-8 w-8 text-primary-600" />
                      <h3 className="ml-3 text-lg font-medium text-gray-900">{retailer.name}</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">{retailer.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {retailer.region}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {retailer.category}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {retailer.format}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {activeTab === 'brands' 
                  ? `No brands found${Object.values(filters).some(f => f) ? ' matching your filters' : ''}`
                  : `No retailers found${Object.values(filters).some(f => f) ? ' matching your filters' : ''}`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Discovery 