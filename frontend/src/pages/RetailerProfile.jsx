import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useMessage } from '../contexts/MessageContext'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import api from '../services/api'
import { Store, Edit, Save, Plus } from 'lucide-react'

const RetailerProfile = () => {
  const { user } = useAuth()
  const { showSuccess, showError } = useMessage()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    website: '',
    region: '',
    format: '',
    retailer_type: '',
    categories_present: '',
    subcategories_present: '',
    buying_model: '',
    avg_credit_days: '',
    asp_category: '',
    competitor_benchmark: '',
    category_size_value: '',
    category_size_units: '',
    supply_type: '',
    price_point_sales_distribution: '',
    sku_names_under_subcategory: '',
    sku_mrp_values: '',
    sku_contribution_percent: '',
    store_count: '',
    contact_email: '',
    contact_phone: '',
    annual_revenue: '',
    target_audience: '',
    logo_url: ''
  })

  const { data: retailers, isLoading } = useQuery(
    ['retailers', user?.id],
    async () => {
      const response = await api.get('/retailers/my-retailers');
      return response.data.retailers || [];
    },
    {
      enabled: !!user,
      onSuccess: (data) => {
        if (data && data.length > 0 && !selectedRetailer) {
          setSelectedRetailer(data[0].id);
        }
      }
    }
  )

  const [selectedRetailer, setSelectedRetailer] = useState(null)

  const createRetailerMutation = useMutation(
    (data) => api.post('/retailers', data),
    {
      onSuccess: (newRetailer) => {
        queryClient.invalidateQueries(['retailers', user?.id])
        showSuccess('Retailer profile created successfully!')
        setIsEditing(false)
        setSelectedRetailer(newRetailer.data.retailer.id)
      },
      onError: (error) => {
        console.log('Full error response:', error.response?.data);
        if (error.response?.data?.details) {
          const validationErrors = error.response.data.details;
          validationErrors.forEach(err => {
            showError(`${err.path}: ${err.msg}`);
          });
        } else {
          showError(error.response?.data?.error || 'Failed to create retailer profile')
        }
      }
    }
  )

  const updateRetailerMutation = useMutation(
    (data) => api.put(`/retailers/${selectedRetailer}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['retailers', user?.id])
        showSuccess('Retailer profile updated successfully!')
        setIsEditing(false)
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to update retailer profile')
      }
    }
  )

  const selectedRetailerData = retailers?.find(retailer => retailer.id === selectedRetailer)

  useEffect(() => {
    if (selectedRetailerData) {
      setFormData({
        name: selectedRetailerData.name || '',
        category: selectedRetailerData.category || '',
        description: selectedRetailerData.description || '',
        website: selectedRetailerData.website || '',
        region: selectedRetailerData.region || '',
        format: selectedRetailerData.format || '',
        retailer_type: selectedRetailerData.retailer_type || '',
        categories_present: selectedRetailerData.categories_present || '',
        subcategories_present: selectedRetailerData.subcategories_present || '',
        buying_model: selectedRetailerData.buying_model || '',
        avg_credit_days: selectedRetailerData.avg_credit_days || '',
        asp_category: selectedRetailerData.asp_category || '',
        competitor_benchmark: selectedRetailerData.competitor_benchmark || '',
        category_size_value: selectedRetailerData.category_size_value || '',
        category_size_units: selectedRetailerData.category_size_units || '',
        supply_type: selectedRetailerData.supply_type || '',
        price_point_sales_distribution: selectedRetailerData.price_point_sales_distribution || '',
        sku_names_under_subcategory: selectedRetailerData.sku_names_under_subcategory || '',
        sku_mrp_values: selectedRetailerData.sku_mrp_values || '',
        sku_contribution_percent: selectedRetailerData.sku_contribution_percent || '',
        store_count: selectedRetailerData.store_count || '',
        contact_email: selectedRetailerData.contact_email || '',
        contact_phone: selectedRetailerData.contact_phone || '',
        annual_revenue: selectedRetailerData.annual_revenue || '',
        target_audience: selectedRetailerData.target_audience || '',
        logo_url: selectedRetailerData.logo_url || ''
      })
    }
  }, [selectedRetailerData])

  const validateForm = () => {
    const newErrors = {}
    
    // Required field validation (only these 4 fields are truly required)
    if (!formData.name.trim()) {
      newErrors.name = 'Retailer Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Retailer Name must be at least 2 characters'
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required - please select from dropdown'
    }
    
    if (!formData.region.trim()) {
      newErrors.region = 'Region is required - please select from dropdown'
    }
    
    if (!formData.format.trim()) {
      newErrors.format = 'Format is required - please select from dropdown'
    }
    
    // Optional field validation (only validate if user provides a value)
    if (formData.contact_email && formData.contact_email.trim() && !isValidEmail(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address (e.g., user@example.com)'
    }
    
    if (formData.website && formData.website.trim() && !isValidUrl(formData.website)) {
      newErrors.website = 'Please enter a valid URL starting with http:// or https://'
    }
    
    if (formData.logo_url && formData.logo_url.trim() && !isValidUrl(formData.logo_url)) {
      newErrors.logo_url = 'Please enter a valid URL starting with http:// or https://'
    }
    
    // Numeric field validation (only if user provides a value)
    if (formData.avg_credit_days && formData.avg_credit_days.trim() && (isNaN(formData.avg_credit_days) || formData.avg_credit_days < 0)) {
      newErrors.avg_credit_days = 'Credit days must be a positive number'
    }
    
    if (formData.asp_category && formData.asp_category.trim() && (isNaN(formData.asp_category) || formData.asp_category < 0)) {
      newErrors.asp_category = 'ASP category must be a positive number'
    }
    
    if (formData.category_size_value && formData.category_size_value.trim() && (isNaN(formData.category_size_value) || formData.category_size_value < 0)) {
      newErrors.category_size_value = 'Category size value must be a positive number'
    }
    
    if (formData.category_size_units && formData.category_size_units.trim() && (isNaN(formData.category_size_units) || formData.category_size_units < 0)) {
      newErrors.category_size_units = 'Category size units must be a positive number'
    }
    
    if (formData.store_count && formData.store_count.trim() && (isNaN(formData.store_count) || formData.store_count < 0)) {
      newErrors.store_count = 'Store count must be a positive number'
    }
    
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Run validation and set errors
    const newErrors = {}
    
    // Required field validation (only these 4 fields are truly required)
    if (!formData.name.trim()) {
      newErrors.name = 'Retailer Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Retailer Name must be at least 2 characters'
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required - please select from dropdown'
    }
    
    if (!formData.region.trim()) {
      newErrors.region = 'Region is required - please select from dropdown'
    }
    
    if (!formData.format.trim()) {
      newErrors.format = 'Format is required - please select from dropdown'
    }
    

    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      // Show toast with error count and scroll to top
      const errorCount = Object.keys(newErrors).length
      const fieldNameMap = {
        name: 'Retailer Name',
        category: 'Category', 
        region: 'Region',
        format: 'Format',
        contact_email: 'Contact Email',
        website: 'Website',
        logo_url: 'Logo URL',
        avg_credit_days: 'Average Credit Days',
        asp_category: 'ASP Category',
        category_size_value: 'Category Size Value',
        category_size_units: 'Category Size Units',
        store_count: 'Store Count'
      }
      const errorFieldNames = Object.keys(newErrors).map(field => fieldNameMap[field] || field).join(', ')
      showError(`Please fix ${errorCount} error(s): ${errorFieldNames}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    
    const retailerData = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      region: formData.region.trim(),
      format: formData.format.trim(),
      description: formData.description.trim() || null,
      website: formData.website.trim() || null,
      retailer_type: formData.retailer_type || null,
      categories_present: formData.categories_present.trim() || null,
      subcategories_present: formData.subcategories_present.trim() || null,
      buying_model: formData.buying_model || null,
      avg_credit_days: formData.avg_credit_days ? parseInt(formData.avg_credit_days) : null,
      asp_category: formData.asp_category ? parseFloat(formData.asp_category) : null,
      competitor_benchmark: formData.competitor_benchmark.trim() || null,
      category_size_value: formData.category_size_value ? parseFloat(formData.category_size_value) : null,
      category_size_units: formData.category_size_units ? parseInt(formData.category_size_units) : null,
      supply_type: formData.supply_type || null,
      price_point_sales_distribution: formData.price_point_sales_distribution.trim() || null,
      sku_names_under_subcategory: formData.sku_names_under_subcategory.trim() || null,
      sku_mrp_values: formData.sku_mrp_values.trim() || null,
      sku_contribution_percent: formData.sku_contribution_percent.trim() || null,
      store_count: formData.store_count ? parseInt(formData.store_count) : null,
      contact_email: formData.contact_email.trim() || null,
      contact_phone: formData.contact_phone.trim() || null,
      annual_revenue: formData.annual_revenue.trim() || null,
      target_audience: formData.target_audience.trim() || null,
      logo_url: formData.logo_url.trim() || null
    }
    
    if (selectedRetailer) {
      updateRetailerMutation.mutate(retailerData)
    } else {
      createRetailerMutation.mutate(retailerData)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    // Only clear error when the field is actually fixed
    if (errors[name]) {
      // For required fields (with asterisks), only clear if they're actually filled
      if (['name', 'category', 'region', 'format'].includes(name)) {
        if (name === 'name' && value.trim().length >= 2) {
          setErrors(prev => ({ ...prev, [name]: '' }))
        } else if (['category', 'region', 'format'].includes(name) && value.trim()) {
          setErrors(prev => ({ ...prev, [name]: '' }))
        }
      }
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    // Clear selected retailer when creating a new one
    setSelectedRetailer(null)
    // Reset form data to empty for new retailer
    setFormData({
      name: '',
      category: '',
      region: '',
      format: '',
      description: '',
      website: '',
      retailer_type: '',
      categories_present: '',
      subcategories_present: '',
      buying_model: '',
      avg_credit_days: '',
      asp_category: '',
      competitor_benchmark: '',
      category_size_value: '',
      category_size_units: '',
      supply_type: '',
      price_point_sales_distribution: '',
      sku_names_under_subcategory: '',
      sku_mrp_values: '',
      sku_contribution_percent: '',
      store_count: '',
      contact_email: '',
      contact_phone: '',
      annual_revenue: '',
      target_audience: '',
      logo_url: ''
    })
    // Don't show errors immediately - only show them on submit
    setErrors({})
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setErrors({})
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!retailers || retailers.length === 0) {
    return (
      <div className="space-y-6">
        {!isEditing ? (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No retailer profiles</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first retailer profile.</p>
            <div className="mt-6">
              <button onClick={handleEdit} className="btn btn-primary flex items-center mx-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create First Retailer Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Create New Retailer Profile</h3>
              
              {/* Required Fields Summary */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Required Fields:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Retailer Name</li>
                  <li>• Category</li>
                  <li>• Region</li>
                  <li>• Format</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2">All other fields are optional and can be filled later.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Summary */}
                {Object.keys(errors).length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-medium text-red-900 mb-2">Please fix the following errors:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {Object.entries(errors).map(([field, message]) => {
                        const fieldNameMap = {
                          name: 'Retailer Name',
                          category: 'Category',
                          region: 'Region',
                          format: 'Format',
                          contact_email: 'Contact Email',
                          website: 'Website',
                          logo_url: 'Logo URL',
                          avg_credit_days: 'Average Credit Days',
                          asp_category: 'ASP Category',
                          category_size_value: 'Category Size Value',
                          category_size_units: 'Category Size Units',
                          store_count: 'Store Count'
                        }
                        const fieldName = fieldNameMap[field] || field
                        const errorMessage = message || `${fieldName} is required`
                        return <li key={field}>• {errorMessage}</li>
                      })}
                    </ul>

                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Basic Information</h4>
                    
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Retailer Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        name="name" 
                        id="name" 
                        required 
                        minLength="2"
                        value={formData.name} 
                        onChange={handleChange} 
                        className={`mt-1 input ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`} 
                        placeholder="Enter retailer name"
                        title="Retailer name must be at least 2 characters"
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>

                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select name="category" id="category" required value={formData.category} onChange={handleChange} className={`mt-1 input ${errors.category ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}>
                        <option value="">Select category</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Fashion">Fashion</option>
                        <option value="Home & Garden">Home & Garden</option>
                        <option value="Sports">Sports</option>
                        <option value="Beauty">Beauty</option>
                        <option value="Food & Beverage">Food & Beverage</option>
                        <option value="Automotive">Automotive</option>
                        <option value="Health & Wellness">Health & Wellness</option>
                      </select>
                      {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                    </div>

                    <div>
                      <label htmlFor="region" className="block text-sm font-medium text-gray-700">
                        Region <span className="text-red-500">*</span>
                      </label>
                      <select name="region" id="region" required value={formData.region} onChange={handleChange} className={`mt-1 input ${errors.region ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}>
                        <option value="">Select region</option>
                        <option value="North America">North America</option>
                        <option value="Europe">Europe</option>
                        <option value="Asia Pacific">Asia Pacific</option>
                        <option value="Latin America">Latin America</option>
                        <option value="Middle East">Middle East</option>
                        <option value="Africa">Africa</option>
                      </select>
                      {errors.region && <p className="mt-1 text-sm text-red-600">{errors.region}</p>}
                    </div>

                    <div>
                      <label htmlFor="format" className="block text-sm font-medium text-gray-700">
                        Format <span className="text-red-500">*</span>
                      </label>
                      <select name="format" id="format" required value={formData.format} onChange={handleChange} className={`mt-1 input ${errors.format ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}>
                        <option value="">Select format</option>
                        <option value="Department Store">Department Store</option>
                        <option value="Specialty Store">Specialty Store</option>
                        <option value="Supermarket">Supermarket</option>
                        <option value="Convenience Store">Convenience Store</option>
                        <option value="Online Store">Online Store</option>
                        <option value="Boutique">Boutique</option>
                        <option value="Chain Store">Chain Store</option>
                        <option value="Independent Store">Independent Store</option>
                      </select>
                      {errors.format && <p className="mt-1 text-sm text-red-600">{errors.format}</p>}
                    </div>

                    <div>
                      <label htmlFor="retailer_type" className="block text-sm font-medium text-gray-700">Retailer Type</label>
                      <select name="retailer_type" id="retailer_type" value={formData.retailer_type} onChange={handleChange} className="mt-1 input">
                        <option value="">Select retailer type</option>
                        <option value="National Modern Trade">National Modern Trade</option>
                        <option value="Regional Modern Trade">Regional Modern Trade</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="store_count" className="block text-sm font-medium text-gray-700">Store Count</label>
                      <input 
                        type="number" 
                        name="store_count" 
                        id="store_count" 
                        min="0" 
                        step="1"
                        value={formData.store_count} 
                        onChange={handleChange} 
                        className={`mt-1 input ${errors.store_count ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`} 
                        placeholder="Enter store count"
                        title="Store count must be a positive number"
                      />
                      {errors.store_count && <p className="mt-1 text-sm text-red-600">{errors.store_count}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Contact Information</h4>
                    
                    <div>
                      <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">Contact Email</label>
                      <input 
                        type="email" 
                        name="contact_email" 
                        id="contact_email" 
                        value={formData.contact_email} 
                        onChange={handleChange} 
                        className={`mt-1 input ${errors.contact_email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`} 
                        placeholder="Enter contact email"
                        title="Please enter a valid email address"
                      />
                      {errors.contact_email && <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>}
                    </div>

                    <div>
                      <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">Contact Phone</label>
                      <input type="text" name="contact_phone" id="contact_phone" value={formData.contact_phone} onChange={handleChange} className="mt-1 input" placeholder="Enter contact phone" />
                    </div>

                    <div>
                      <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
                      <input 
                        type="url" 
                        name="website" 
                        id="website" 
                        value={formData.website} 
                        onChange={handleChange} 
                        className={`mt-1 input ${errors.website ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`} 
                        placeholder="https://example.com"
                        title="Please enter a valid URL starting with http:// or https://"
                      />
                      {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website}</p>}
                    </div>

                    <div>
                      <label htmlFor="annual_revenue" className="block text-sm font-medium text-gray-700">Annual Revenue</label>
                      <input type="text" name="annual_revenue" id="annual_revenue" value={formData.annual_revenue} onChange={handleChange} className="mt-1 input" placeholder="Enter annual revenue" />
                    </div>

                    <div>
                      <label htmlFor="target_audience" className="block text-sm font-medium text-gray-700">Target Audience</label>
                      <input type="text" name="target_audience" id="target_audience" value={formData.target_audience} onChange={handleChange} className="mt-1 input" placeholder="Enter target audience" />
                    </div>

                    <div>
                      <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700">Logo URL</label>
                      <input type="url" name="logo_url" id="logo_url" value={formData.logo_url} onChange={handleChange} className={`mt-1 input ${errors.logo_url ? 'border-red-500' : ''}`} placeholder="Enter logo URL" />
                      {errors.logo_url && <p className="mt-1 text-sm text-red-600">{errors.logo_url}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Business Details</h4>
                    
                    <div>
                      <label htmlFor="buying_model" className="block text-sm font-medium text-gray-700">Buying Model</label>
                      <select name="buying_model" id="buying_model" value={formData.buying_model} onChange={handleChange} className="mt-1 input">
                        <option value="">Select buying model</option>
                        <option value="Outright">Outright</option>
                        <option value="SOR">SOR</option>
                        <option value="MG">MG</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="avg_credit_days" className="block text-sm font-medium text-gray-700">Avg Credit Days</label>
                      <input type="number" name="avg_credit_days" id="avg_credit_days" min="0" value={formData.avg_credit_days} onChange={handleChange} className="mt-1 input" placeholder="Enter avg credit days" />
                    </div>

                    <div>
                      <label htmlFor="supply_type" className="block text-sm font-medium text-gray-700">Supply Type</label>
                      <select name="supply_type" id="supply_type" value={formData.supply_type} onChange={handleChange} className="mt-1 input">
                        <option value="">Select supply type</option>
                        <option value="DC supply">DC supply</option>
                        <option value="Direct store supply">Direct store supply</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="asp_category" className="block text-sm font-medium text-gray-700">ASP Category (₹)</label>
                      <input type="number" name="asp_category" id="asp_category" step="0.01" min="0" value={formData.asp_category} onChange={handleChange} className="mt-1 input" placeholder="Enter ASP category" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Category Information</h4>
                    
                    <div>
                      <label htmlFor="categories_present" className="block text-sm font-medium text-gray-700">Categories Present</label>
                      <textarea name="categories_present" id="categories_present" rows={3} value={formData.categories_present} onChange={handleChange} className="mt-1 input" placeholder="Enter categories present" />
                    </div>

                    <div>
                      <label htmlFor="subcategories_present" className="block text-sm font-medium text-gray-700">Subcategories Present</label>
                      <textarea name="subcategories_present" id="subcategories_present" rows={3} value={formData.subcategories_present} onChange={handleChange} className="mt-1 input" placeholder="Enter subcategories present" />
                    </div>

                    <div>
                      <label htmlFor="category_size_value" className="block text-sm font-medium text-gray-700">Category Size Value (₹ Lakhs)</label>
                      <input type="number" name="category_size_value" id="category_size_value" step="0.01" min="0" value={formData.category_size_value} onChange={handleChange} className="mt-1 input" placeholder="Enter category size value" />
                    </div>

                    <div>
                      <label htmlFor="category_size_units" className="block text-sm font-medium text-gray-700">Category Size Units</label>
                      <input type="number" name="category_size_units" id="category_size_units" min="0" value={formData.category_size_units} onChange={handleChange} className="mt-1 input" placeholder="Enter category size units" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Competitor Information</h4>
                    
                    <div>
                      <label htmlFor="competitor_benchmark" className="block text-sm font-medium text-gray-700">Competitor Benchmark</label>
                      <textarea name="competitor_benchmark" id="competitor_benchmark" rows={3} value={formData.competitor_benchmark} onChange={handleChange} className="mt-1 input" placeholder="Enter competitor benchmark" />
                    </div>

                    <div>
                      <label htmlFor="price_point_sales_distribution" className="block text-sm font-medium text-gray-700">Price Point Sales Distribution</label>
                      <textarea name="price_point_sales_distribution" id="price_point_sales_distribution" rows={3} value={formData.price_point_sales_distribution} onChange={handleChange} className="mt-1 input" placeholder="Enter price point sales distribution" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">SKU Information</h4>
                    
                    <div>
                      <label htmlFor="sku_names_under_subcategory" className="block text-sm font-medium text-gray-700">SKU Names Under Subcategory</label>
                      <textarea name="sku_names_under_subcategory" id="sku_names_under_subcategory" rows={3} value={formData.sku_names_under_subcategory} onChange={handleChange} className="mt-1 input" placeholder="Enter SKU names" />
                    </div>

                    <div>
                      <label htmlFor="sku_mrp_values" className="block text-sm font-medium text-gray-700">SKU MRP Values</label>
                      <textarea name="sku_mrp_values" id="sku_mrp_values" rows={3} value={formData.sku_mrp_values} onChange={handleChange} className="mt-1 input" placeholder="Enter SKU MRP values" />
                    </div>

                    <div>
                      <label htmlFor="sku_contribution_percent" className="block text-sm font-medium text-gray-700">SKU Contribution Percentage</label>
                      <textarea name="sku_contribution_percent" id="sku_contribution_percent" rows={3} value={formData.sku_contribution_percent} onChange={handleChange} className="mt-1 input" placeholder="Enter SKU contribution percentage" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea name="description" id="description" rows={4} value={formData.description} onChange={handleChange} className="mt-1 input" placeholder="Enter retailer description" />
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {Object.keys(errors).length > 0 && (
                      <span className="text-red-600">Please fix {Object.keys(errors).length} error(s) before submitting</span>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button type="button" onClick={handleCancel} className="btn btn-secondary">Cancel</button>
                    <button type="submit" disabled={createRetailerMutation.isLoading || updateRetailerMutation.isLoading || Object.keys(errors).length > 0} className="btn btn-primary flex items-center">
                      <Save className="h-4 w-4 mr-2" />
                      {createRetailerMutation.isLoading || updateRetailerMutation.isLoading ? 'Saving...' : 'Create Profile'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retailer Profiles</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your retailer profiles and detailed information</p>
        </div>
        <button onClick={handleEdit} className="btn btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add New Retailer
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Retailer</label>
        <select
          value={selectedRetailer || ''}
          onChange={(e) => setSelectedRetailer(Number(e.target.value))}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a retailer</option>
          {retailers.map(retailer => (
            <option key={retailer.id} value={retailer.id}>
              {retailer.name} - {retailer.category}
            </option>
          ))}
        </select>
      </div>

      {selectedRetailerData && !isEditing && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedRetailerData.name}</h3>
                <p className="text-sm text-gray-500">{selectedRetailerData.category} • {selectedRetailerData.region}</p>
              </div>
              <button onClick={handleEdit} className="btn btn-secondary flex items-center">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Basic Information</h4>
                <div><span className="text-sm font-medium text-gray-500">Format:</span><p className="text-sm text-gray-900">{selectedRetailerData.format || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Retailer Type:</span><p className="text-sm text-gray-900">{selectedRetailerData.retailer_type || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Store Count:</span><p className="text-sm text-gray-900">{selectedRetailerData.store_count || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Annual Revenue:</span><p className="text-sm text-gray-900">{selectedRetailerData.annual_revenue || 'N/A'}</p></div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Contact Information</h4>
                <div><span className="text-sm font-medium text-gray-500">Email:</span><p className="text-sm text-gray-900">{selectedRetailerData.contact_email || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Phone:</span><p className="text-sm text-gray-900">{selectedRetailerData.contact_phone || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Website:</span><p className="text-sm text-gray-900">{selectedRetailerData.website || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Target Audience:</span><p className="text-sm text-gray-900">{selectedRetailerData.target_audience || 'N/A'}</p></div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Business Details</h4>
                <div><span className="text-sm font-medium text-gray-500">Buying Model:</span><p className="text-sm text-gray-900">{selectedRetailerData.buying_model || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Avg Credit Days:</span><p className="text-sm text-gray-900">{selectedRetailerData.avg_credit_days || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Supply Type:</span><p className="text-sm text-gray-900">{selectedRetailerData.supply_type || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">ASP Category:</span><p className="text-sm text-gray-900">{selectedRetailerData.asp_category ? `₹${selectedRetailerData.asp_category}` : 'N/A'}</p></div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Category Information</h4>
                <div><span className="text-sm font-medium text-gray-500">Categories Present:</span><p className="text-sm text-gray-900">{selectedRetailerData.categories_present || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Subcategories Present:</span><p className="text-sm text-gray-900">{selectedRetailerData.subcategories_present || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Category Size Value:</span><p className="text-sm text-gray-900">{selectedRetailerData.category_size_value ? `₹${selectedRetailerData.category_size_value} Lakhs` : 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Category Size Units:</span><p className="text-sm text-gray-900">{selectedRetailerData.category_size_units || 'N/A'}</p></div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Competitor Information</h4>
                <div><span className="text-sm font-medium text-gray-500">Competitor Benchmark:</span><p className="text-sm text-gray-900">{selectedRetailerData.competitor_benchmark || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">Price Point Sales Distribution:</span><p className="text-sm text-gray-900">{selectedRetailerData.price_point_sales_distribution || 'N/A'}</p></div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">SKU Information</h4>
                <div><span className="text-sm font-medium text-gray-500">SKU Names:</span><p className="text-sm text-gray-900">{selectedRetailerData.sku_names_under_subcategory || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">SKU MRP Values:</span><p className="text-sm text-gray-900">{selectedRetailerData.sku_mrp_values || 'N/A'}</p></div>
                <div><span className="text-sm font-medium text-gray-500">SKU Contribution %:</span><p className="text-sm text-gray-900">{selectedRetailerData.sku_contribution_percent || 'N/A'}</p></div>
              </div>
            </div>

            {selectedRetailerData.description && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-700">{selectedRetailerData.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isEditing && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              {selectedRetailer ? 'Edit Retailer Profile' : 'Create New Retailer Profile'}
            </h3>
            
            {/* Required Fields Summary */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Required Fields:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Retailer Name</li>
                <li>• Category</li>
                <li>• Region</li>
                <li>• Format</li>
              </ul>
              <p className="text-xs text-blue-600 mt-2">All other fields are optional and can be filled later.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Summary */}
              {Object.keys(errors).length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-medium text-red-900 mb-2">Please fix the following errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {Object.entries(errors).map(([field, message]) => {
                      const fieldNameMap = {
                        name: 'Retailer Name',
                        category: 'Category',
                        region: 'Region',
                        format: 'Format',
                        contact_email: 'Contact Email',
                        website: 'Website',
                        logo_url: 'Logo URL',
                        avg_credit_days: 'Average Credit Days',
                        asp_category: 'ASP Category',
                        category_size_value: 'Category Size Value',
                        category_size_units: 'Category Size Units',
                        store_count: 'Store Count'
                      }
                      const fieldName = fieldNameMap[field] || field
                      const errorMessage = message || `${fieldName} is required`
                      return <li key={field}>• {errorMessage}</li>
                    })}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Basic Information</h4>
                  
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Retailer Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="name" 
                      id="name" 
                      required 
                      minLength="2"
                      value={formData.name} 
                      onChange={handleChange} 
                      className={`mt-1 input ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`} 
                      placeholder="Enter retailer name"
                      title="Retailer name must be at least 2 characters"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select name="category" id="category" required value={formData.category} onChange={handleChange} className={`mt-1 input ${errors.category ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}>
                      <option value="">Select category</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Home & Garden">Home & Garden</option>
                      <option value="Sports">Sports</option>
                      <option value="Beauty">Beauty</option>
                      <option value="Food & Beverage">Food & Beverage</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Health & Wellness">Health & Wellness</option>
                    </select>
                    {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                  </div>

                  <div>
                    <label htmlFor="region" className="block text-sm font-medium text-gray-700">
                      Region <span className="text-red-500">*</span>
                    </label>
                    <select name="region" id="region" required value={formData.region} onChange={handleChange} className={`mt-1 input ${errors.region ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}>
                      <option value="">Select region</option>
                      <option value="North America">North America</option>
                      <option value="Europe">Europe</option>
                      <option value="Asia Pacific">Asia Pacific</option>
                      <option value="Latin America">Latin America</option>
                      <option value="Middle East">Middle East</option>
                      <option value="Africa">Africa</option>
                    </select>
                    {errors.region && <p className="mt-1 text-sm text-red-600">{errors.region}</p>}
                  </div>

                  <div>
                    <label htmlFor="format" className="block text-sm font-medium text-gray-700">
                      Format <span className="text-red-500">*</span>
                    </label>
                    <select name="format" id="format" required value={formData.format} onChange={handleChange} className={`mt-1 input ${errors.format ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}>
                      <option value="">Select format</option>
                      <option value="Department Store">Department Store</option>
                      <option value="Specialty Store">Specialty Store</option>
                      <option value="Supermarket">Supermarket</option>
                      <option value="Convenience Store">Convenience Store</option>
                      <option value="Online Store">Online Store</option>
                      <option value="Boutique">Boutique</option>
                      <option value="Chain Store">Chain Store</option>
                      <option value="Independent Store">Independent Store</option>
                    </select>
                    {errors.format && <p className="mt-1 text-sm text-red-600">{errors.format}</p>}
                  </div>

                  <div>
                    <label htmlFor="retailer_type" className="block text-sm font-medium text-gray-700">Retailer Type</label>
                    <select name="retailer_type" id="retailer_type" value={formData.retailer_type} onChange={handleChange} className="mt-1 input">
                      <option value="">Select retailer type</option>
                      <option value="National Modern Trade">National Modern Trade</option>
                      <option value="Regional Modern Trade">Regional Modern Trade</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="store_count" className="block text-sm font-medium text-gray-700">Store Count</label>
                    <input type="number" name="store_count" id="store_count" min="0" value={formData.store_count} onChange={handleChange} className="mt-1 input" placeholder="Enter store count" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Contact Information</h4>
                  
                  <div>
                    <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">Contact Email</label>
                    <input type="email" name="contact_email" id="contact_email" value={formData.contact_email} onChange={handleChange} className={`mt-1 input ${errors.contact_email ? 'border-red-500' : ''}`} placeholder="Enter contact email" />
                    {errors.contact_email && <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>}
                  </div>

                  <div>
                    <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">Contact Phone</label>
                    <input type="tel" name="contact_phone" id="contact_phone" value={formData.contact_phone} onChange={handleChange} className="mt-1 input" placeholder="Enter contact phone" />
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
                    <input type="url" name="website" id="website" value={formData.website} onChange={handleChange} className={`mt-1 input ${errors.website ? 'border-red-500' : ''}`} placeholder="Enter website URL" />
                    {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website}</p>}
                  </div>

                  <div>
                    <label htmlFor="annual_revenue" className="block text-sm font-medium text-gray-700">Annual Revenue</label>
                    <input type="text" name="annual_revenue" id="annual_revenue" value={formData.annual_revenue} onChange={handleChange} className="mt-1 input" placeholder="Enter annual revenue" />
                  </div>

                  <div>
                    <label htmlFor="target_audience" className="block text-sm font-medium text-gray-700">Target Audience</label>
                    <input type="text" name="target_audience" id="target_audience" value={formData.target_audience} onChange={handleChange} className="mt-1 input" placeholder="Enter target audience" />
                  </div>

                  <div>
                    <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700">Logo URL</label>
                    <input type="url" name="logo_url" id="logo_url" value={formData.logo_url} onChange={handleChange} className="mt-1 input" placeholder="Enter logo URL" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Business Details</h4>
                  
                  <div>
                    <label htmlFor="buying_model" className="block text-sm font-medium text-gray-700">Buying Model</label>
                    <select name="buying_model" id="buying_model" value={formData.buying_model} onChange={handleChange} className="mt-1 input">
                      <option value="">Select buying model</option>
                      <option value="Outright">Outright</option>
                      <option value="SOR">SOR</option>
                      <option value="MG">MG</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="avg_credit_days" className="block text-sm font-medium text-gray-700">Average Credit Days</label>
                    <input type="number" name="avg_credit_days" id="avg_credit_days" min="0" value={formData.avg_credit_days} onChange={handleChange} className="mt-1 input" placeholder="Enter credit days" />
                  </div>

                  <div>
                    <label htmlFor="supply_type" className="block text-sm font-medium text-gray-700">Supply Type</label>
                    <select name="supply_type" id="supply_type" value={formData.supply_type} onChange={handleChange} className="mt-1 input">
                      <option value="">Select supply type</option>
                      <option value="DC supply">DC supply</option>
                      <option value="Direct store supply">Direct store supply</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="asp_category" className="block text-sm font-medium text-gray-700">ASP Category (₹)</label>
                    <input type="number" name="asp_category" id="asp_category" step="0.01" min="0" value={formData.asp_category} onChange={handleChange} className="mt-1 input" placeholder="Enter ASP category" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Category Information</h4>
                  
                  <div>
                    <label htmlFor="categories_present" className="block text-sm font-medium text-gray-700">Categories Present</label>
                    <textarea name="categories_present" id="categories_present" rows={3} value={formData.categories_present} onChange={handleChange} className="mt-1 input" placeholder="Enter categories present" />
                  </div>

                  <div>
                    <label htmlFor="subcategories_present" className="block text-sm font-medium text-gray-700">Subcategories Present</label>
                    <textarea name="subcategories_present" id="subcategories_present" rows={3} value={formData.subcategories_present} onChange={handleChange} className="mt-1 input" placeholder="Enter subcategories present" />
                  </div>

                  <div>
                    <label htmlFor="category_size_value" className="block text-sm font-medium text-gray-700">Category Size Value (₹ Lakhs)</label>
                    <input type="number" name="category_size_value" id="category_size_value" step="0.01" min="0" value={formData.category_size_value} onChange={handleChange} className="mt-1 input" placeholder="Enter category size value" />
                  </div>

                  <div>
                    <label htmlFor="category_size_units" className="block text-sm font-medium text-gray-700">Category Size Units</label>
                    <input type="number" name="category_size_units" id="category_size_units" min="0" value={formData.category_size_units} onChange={handleChange} className="mt-1 input" placeholder="Enter category size units" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Competitor Information</h4>
                  
                  <div>
                    <label htmlFor="competitor_benchmark" className="block text-sm font-medium text-gray-700">Competitor Benchmark</label>
                    <textarea name="competitor_benchmark" id="competitor_benchmark" rows={3} value={formData.competitor_benchmark} onChange={handleChange} className="mt-1 input" placeholder="Enter competitor benchmark" />
                  </div>

                  <div>
                    <label htmlFor="price_point_sales_distribution" className="block text-sm font-medium text-gray-700">Price Point Sales Distribution</label>
                    <textarea name="price_point_sales_distribution" id="price_point_sales_distribution" rows={3} value={formData.price_point_sales_distribution} onChange={handleChange} className="mt-1 input" placeholder="Enter price point sales distribution" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">SKU Information</h4>
                  
                  <div>
                    <label htmlFor="sku_names_under_subcategory" className="block text-sm font-medium text-gray-700">SKU Names Under Subcategory</label>
                    <textarea name="sku_names_under_subcategory" id="sku_names_under_subcategory" rows={3} value={formData.sku_names_under_subcategory} onChange={handleChange} className="mt-1 input" placeholder="Enter SKU names" />
                  </div>

                  <div>
                    <label htmlFor="sku_mrp_values" className="block text-sm font-medium text-gray-700">SKU MRP Values</label>
                    <textarea name="sku_mrp_values" id="sku_mrp_values" rows={3} value={formData.sku_mrp_values} onChange={handleChange} className="mt-1 input" placeholder="Enter SKU MRP values" />
                  </div>

                  <div>
                    <label htmlFor="sku_contribution_percent" className="block text-sm font-medium text-gray-700">SKU Contribution Percentage</label>
                    <textarea name="sku_contribution_percent" id="sku_contribution_percent" rows={3} value={formData.sku_contribution_percent} onChange={handleChange} className="mt-1 input" placeholder="Enter SKU contribution percentage" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" id="description" rows={4} value={formData.description} onChange={handleChange} className="mt-1 input" placeholder="Enter retailer description" />
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {Object.keys(errors).length > 0 && (
                    <span className="text-red-600">Please fix {Object.keys(errors).length} error(s) before submitting</span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button type="button" onClick={handleCancel} className="btn btn-secondary">Cancel</button>
                  <button type="submit" disabled={createRetailerMutation.isLoading || updateRetailerMutation.isLoading || Object.keys(errors).length > 0} className="btn btn-primary flex items-center">
                    <Save className="h-4 w-4 mr-2" />
                    {createRetailerMutation.isLoading || updateRetailerMutation.isLoading ? 'Saving...' : selectedRetailer ? 'Update Profile' : 'Create Profile'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RetailerProfile 