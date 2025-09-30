import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useMessage } from '../contexts/MessageContext'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import api from '../services/api'
import { Building2, Edit, Save, X, Globe, MapPin } from 'lucide-react'

const BrandProfile = () => {
  const { user } = useAuth()
  const { showSuccess, showError } = useMessage()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState({})
  
  // Debug errors state changes
  useEffect(() => {
    console.log('🔍 Errors state changed:', errors)
    console.log('🔍 Errors keys:', Object.keys(errors))
    console.log('🔍 Errors values:', Object.values(errors))
    console.log('🔍 Has errors with content:', Object.values(errors).some(error => error && error.trim() !== ''))
  }, [errors])
  const [formData, setFormData] = useState({
    brand_name: '',
    poc_name: '',
    designation: '',
    official_email: '',
    website_url: '',
    contact_number: '',
    annual_turnover: '',
    trade_margin: ''
  })

  // Fetch categories from database
  const { data: categoriesData, isLoading: allCategoriesLoading, error: categoriesError } = useQuery(
    ['categories'],
    async () => {
      const response = await api.get('/categories');
      return response.data.data;
    },
    {
      enabled: !!user,
      retry: 2,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    }
  );

  // Convert database categories to the expected format
  const categorySubcategoryMap = useMemo(() => {
    if (!categoriesData || !Array.isArray(categoriesData)) {
      return {};
    }
    
    return categoriesData.reduce((acc, category) => {
      if (category.category && category.subcategories && Array.isArray(category.subcategories)) {
        acc[category.category] = category.subcategories;
      }
      return acc;
    }, {});
  }, [categoriesData]);

  const tradeMarginOptions = ['20-25', '25-30', '30 and above'];
  const annualTurnoverOptions = [
    'equal to less then 1cr',
    '1cr-10cr',
    '10cr-50cr',
    '50Cr-250Cr',
    'more then 250Cr'
  ];

  const [selectedCategories, setSelectedCategories] = useState([])

  const { data: brands, isLoading } = useQuery(
    ['brands', user?.id],
    async () => {
      const response = await api.get('/brands/my-brands');
      console.log('My brands response:', response.data);
      return response.data.data || [];
    },
    {
      enabled: !!user,
      onSuccess: (data) => {
        console.log('Brands data:', data);
        if (data && data.length > 0 && !selectedBrand) {
          setSelectedBrand(data[0].id);
        }
      }
    }
  )

  // Get detailed brand profile
  const { data: brandProfile, isLoading: profileLoading } = useQuery(
    ['brand-profile', user?.id],
    async () => {
      const response = await api.get('/brands/profile');
      return response.data.data;
    },
    {
      enabled: !!user,
      retry: false
    }
  )

  // Get brand categories
  const { data: brandCategories, isLoading: categoriesLoading } = useQuery(
    ['brand-categories', user?.id],
    async () => {
      const response = await api.get('/brands/categories');
      return response.data.data;
    },
    {
      enabled: !!user,
      retry: false
    }
  )

  const [selectedBrand, setSelectedBrand] = useState(null)

  const createBrandMutation = useMutation(
    async (data) => {
      console.log('🚀 Starting brand creation with data:', data)
      
      // Create brand profile
      const profileData = { ...data }
      delete profileData.categories // Remove categories from profile data
      
      console.log('📝 Creating brand profile with:', profileData)
      const profileResponse = await api.post('/brands/create', profileData)
      
      // Add categories if provided
      if (data.categories && data.categories.length > 0) {
        console.log('📂 Adding categories with:', data.categories)
        const categoriesResponse = await api.post('/brands/categories', { categories: data.categories })
        console.log('✅ Categories added:', categoriesResponse.data)
      }
      
      return profileResponse
    },
    {
      onSuccess: (newBrand) => {
        queryClient.invalidateQueries(['brands', user?.id])
        queryClient.invalidateQueries(['brand-profile', user?.id])
        queryClient.invalidateQueries(['brand-categories', user?.id])
        showSuccess('Brand profile created successfully!')
        setIsEditing(false)
        setSelectedBrand(newBrand.data.id)
      },
      onError: (error) => {
        console.error('❌ Brand creation failed:', error)
        showError(error.response?.data?.error || 'Failed to create brand profile')
      }
    }
  )

  const updateBrandMutation = useMutation(
    async (data) => {
      console.log('🚀 Starting brand update with data:', data)
      
      // Update brand profile
      const profileData = { ...data }
      delete profileData.categories // Remove categories from profile data
      
      console.log('📝 Updating brand profile with:', profileData)
      const profileResponse = await api.put('/brands/profile', profileData)
      
      // Update categories if provided
      if (data.categories && data.categories.length > 0) {
        console.log('📂 Updating categories with:', data.categories)
        const categoriesResponse = await api.post('/brands/categories', { categories: data.categories })
        console.log('✅ Categories updated:', categoriesResponse.data)
      }
      
      return profileResponse
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['brands', user?.id])
        queryClient.invalidateQueries(['brand-profile', user?.id])
        queryClient.invalidateQueries(['brand-categories', user?.id])
        showSuccess('Brand profile updated successfully!')
        setIsEditing(false)
      },
      onError: (error) => {
        console.error('❌ Brand update failed:', error)
        showError(error.response?.data?.error || 'Failed to update brand profile')
      }
    }
  )

  // Get the currently selected brand
  const selectedBrandData = brands?.find(brand => brand.id === selectedBrand)

  // Update form data when selected brand changes
  useEffect(() => {
    if (selectedBrandData) {
      setFormData({
        brand_name: selectedBrandData.brand_name || selectedBrandData.name || '',
        poc_name: selectedBrandData.poc_name || '',
        designation: selectedBrandData.designation || '',
        official_email: selectedBrandData.official_email || '',
        website_url: selectedBrandData.website_url || selectedBrandData.website || '',
        contact_number: selectedBrandData.contact_number || '',
        annual_turnover: selectedBrandData.annual_turnover || '',
        trade_margin: selectedBrandData.trade_margin || ''
      })
    } else {
      setFormData({
        brand_name: '',
        poc_name: '',
        designation: '',
        official_email: '',
        website_url: '',
        contact_number: '',
        annual_turnover: '',
        trade_margin: ''
      })
    }
  }, [selectedBrandData])

  // Load existing categories when editing
  useEffect(() => {
    if (brandProfile?.categories && isEditing) {
      const existingCategories = brandProfile.categories.map(cat => ({
        category: cat.category,
        sub_categories: cat.sub_category ? cat.sub_category.split(',').map(s => s.trim()) : [],
        avg_trade_margin: cat.avg_trade_margin || '25-30',
        annual_turnover: cat.annual_turnover || '1cr-10cr'
      }));
      setSelectedCategories(existingCategories);
    }
  }, [brandProfile, isEditing])

  const validateForm = () => {
    const newErrors = {}
    
    console.log('🔍 ===== VALIDATION STARTED =====')
    console.log('🔍 Validating form with data:', formData)
    console.log('🔍 Current errors state before validation:', errors)
    
    // Brand Name validation
    if (!formData.brand_name.trim()) {
      newErrors.brand_name = 'Brand name is required'
    } else if (formData.brand_name.trim().length < 2) {
      newErrors.brand_name = 'Brand name must be at least 2 characters'
    }
    
    // Point of Contact validation
    if (!formData.poc_name.trim()) {
      newErrors.poc_name = 'Point of contact name is required'
    } else if (formData.poc_name.trim().length < 2) {
      newErrors.poc_name = 'Point of contact name must be at least 2 characters'
    }
    
    // Designation validation
    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation is required'
    } else if (formData.designation.trim().length < 2) {
      newErrors.designation = 'Designation must be at least 2 characters'
    }
    
    // Official Email validation
    if (!formData.official_email.trim()) {
      newErrors.official_email = 'Official email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.official_email)) {
      newErrors.official_email = 'Please enter a valid email address'
    }
    
    // Website URL validation (optional but if provided, must be valid)
    if (formData.website_url.trim() && !isValidUrl(formData.website_url)) {
      newErrors.website_url = 'Please enter a valid URL'
    }
    
          // Annual Turnover validation
      if (!formData.annual_turnover.trim()) {
        newErrors.annual_turnover = 'Annual turnover is required'
      }
      
      // Trade Margin validation
      if (!formData.trade_margin.trim()) {
        newErrors.trade_margin = 'Trade margin is required'
      }
    
    console.log('🔍 Validation errors found:', newErrors)
    console.log('🔍 Validation result (true = passed, false = failed):', Object.keys(newErrors).length === 0)
    setErrors(newErrors)
    console.log('🔍 ===== VALIDATION COMPLETED =====')
    return Object.keys(newErrors).length === 0
  }
  
  const isValidUrl = (string) => {
    try {
      const url = new URL(string)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch (_) {
      return false
    }
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    
    console.log('🚀 ===== FORM SUBMISSION STARTED =====')
    console.log('🚀 Form submitted with data:', formData)
    console.log('🚀 Selected categories:', selectedCategories)
    console.log('🚀 Current errors state:', errors)
    console.log('🚀 isEditing state:', isEditing)
    console.log('🚀 selectedBrand:', selectedBrand)
    
    console.log('🔍 Running validation...')
    const validationResult = validateForm()
    console.log('🔍 Validation result:', validationResult)
    console.log('🔍 Errors after validation:', errors)
    
    if (!validationResult) {
      const errorMessages = Object.values(errors).join(', ')
      console.log('❌ Validation failed, errors:', errors)
      console.log('❌ Error messages:', errorMessages)
      showError(`Validation failed: ${errorMessages}`)
      console.log('🚀 ===== FORM SUBMISSION STOPPED (VALIDATION FAILED) =====')
      return
    }
    
    console.log('✅ Validation passed, proceeding with submission')
    
    // Prepare categories data for submission
    const categoriesData = selectedCategories.map(cat => ({
      category: cat.category,
      sub_category: cat.sub_categories.join(','),
      avg_trade_margin: cat.avg_trade_margin,
      annual_turnover: cat.annual_turnover
    }));

    const submitData = {
      ...formData,
      categories: categoriesData
    };
    
    if (selectedBrand) {
      updateBrandMutation.mutate(submitData)
    } else {
      createBrandMutation.mutate(submitData)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      })
    }
    
    // Real-time validation for website URL
    if (name === 'website_url' && value.trim()) {
      if (!isValidUrl(value)) {
        setErrors(prev => ({
          ...prev,
          website_url: 'Please enter a valid URL'
        }))
      } else {
        setErrors(prev => ({
          ...prev,
          website_url: ''
        }))
      }
    }
  }

  // Category handling functions
  const handleCategoryChange = (category, checked) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, { 
        category, 
        sub_categories: [],
        avg_trade_margin: '25-30',
        annual_turnover: '1cr-10cr'
      }]);
    } else {
      setSelectedCategories(selectedCategories.filter(cat => cat.category !== category));
    }
  };

  const handleSubcategoryChange = (category, subcategory, checked) => {
    setSelectedCategories(selectedCategories.map(cat => {
      if (cat.category === category) {
        if (checked) {
          return {
            ...cat,
            sub_categories: [...cat.sub_categories, subcategory]
          };
        } else {
          return {
            ...cat,
            sub_categories: cat.sub_categories.filter(sub => sub !== subcategory)
          };
        }
      }
      return cat;
    }));
  };

  const handleTradeMarginChange = (category, value) => {
    setSelectedCategories(selectedCategories.map(cat => {
      if (cat.category === category) {
        return { ...cat, avg_trade_margin: value };
      }
      return cat;
    }));
  };

  const handleTurnoverChange = (category, value) => {
    setSelectedCategories(selectedCategories.map(cat => {
      if (cat.category === category) {
        return { ...cat, annual_turnover: value };
      }
      return cat;
    }));
  };

  if (isLoading || allCategoriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Handle categories loading error
  if (categoriesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load categories. Please try again.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Profiles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your brand profiles and create new ones
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedBrand(null)
            setIsEditing(true)
          }}
          className="btn btn-primary flex items-center"
        >
          <Building2 className="h-4 w-4 mr-2" />
          Add New Brand
        </button>
      </div>

      {/* Brand Selector */}
      {brands && brands.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Brand
          </label>
          <select
            value={selectedBrand || ''}
            onChange={(e) => setSelectedBrand(Number(e.target.value))}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>
                {brand.name} - {brand.category}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {!isEditing && brands && brands.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No brand profiles</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first brand profile to access all features.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-primary flex items-center mx-auto"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Create First Brand
                </button>
              </div>
            </div>
          ) : !isEditing && (selectedBrandData || brandProfile) ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {(brandProfile || selectedBrandData)?.brand_name || (brandProfile || selectedBrandData)?.name}
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-outline flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Brand
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand Name</label>
                  <p className="mt-1 text-sm text-gray-900">{(brandProfile || selectedBrandData)?.brand_name || (brandProfile || selectedBrandData)?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Point of Contact</label>
                  <p className="mt-1 text-sm text-gray-900">{(brandProfile || selectedBrandData)?.poc_name || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Designation</label>
                  <p className="mt-1 text-sm text-gray-900">{(brandProfile || selectedBrandData)?.designation || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Official Email</label>
                  <p className="mt-1 text-sm text-gray-900">{(brandProfile || selectedBrandData)?.official_email || 'Not specified'}</p>
                </div>
                {(brandProfile || selectedBrandData)?.website_url && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Website URL</label>
                    <p className="mt-1 text-sm text-gray-900">{(brandProfile || selectedBrandData)?.website_url}</p>
                  </div>
                )}
                {(brandProfile || selectedBrandData)?.contact_number && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                    <p className="mt-1 text-sm text-gray-900">{(brandProfile || selectedBrandData)?.contact_number}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Annual Turnover (Rs lacs)</label>
                  <p className="mt-1 text-sm text-gray-900">{(brandProfile || selectedBrandData)?.annual_turnover || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Average Trade Margin (%)</label>
                  <p className="mt-1 text-sm text-gray-900">{(brandProfile || selectedBrandData)?.trade_margin || 'Not specified'}</p>
                </div>
              </div>

              {/* Brand Categories Section */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Brand Categories & Details</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {brandCategories && brandCategories.length > 0 ? (
                    <div className="space-y-4">
                      {(() => {
                        // Group categories by category name
                        const groupedCategories = brandCategories.reduce((acc, cat) => {
                          if (!acc[cat.category]) {
                            acc[cat.category] = {
                              category: cat.category,
                              subcategories: [],
                              avg_trade_margin: cat.avg_trade_margin || 'Not specified',
                              annual_turnover: cat.annual_turnover || 'Not specified'
                            };
                          }
                          acc[cat.category].subcategories.push(cat.sub_category);
                          return acc;
                        }, {});

                        return Object.values(groupedCategories).map((group, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <h5 className="font-medium text-gray-900 text-lg">{group.category}</h5>
                              <div className="text-sm text-gray-600">
                                <span className="mr-4">Margin: {group.avg_trade_margin}</span>
                                <span>Turnover: {group.annual_turnover}</span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Subcategories:</span>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {group.subcategories.map((subcat, subIndex) => (
                                  <span 
                                    key={subIndex} 
                                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                                  >
                                    {subcat}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No categories configured. Complete your brand profile setup to add categories and subcategories.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Brand Name */}
              <div>
                <label htmlFor="brand_name" className="block text-sm font-medium text-gray-700">
                  Brand Name *
                </label>
                <input
                  type="text"
                  name="brand_name"
                  id="brand_name"
                  required
                  disabled={!isEditing}
                  value={formData.brand_name}
                  onChange={handleChange}
                  className={`mt-1 input ${errors.brand_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter brand name"
                />
                {errors.brand_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.brand_name}</p>
                )}
              </div>

              {/* Point of Contact */}
              <div>
                <label htmlFor="poc_name" className="block text-sm font-medium text-gray-700">
                  Point of Contact Name *
                </label>
                <input
                  type="text"
                  name="poc_name"
                  id="poc_name"
                  required
                  disabled={!isEditing}
                  value={formData.poc_name}
                  onChange={handleChange}
                  className={`mt-1 input ${errors.poc_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter point of contact name"
                />
                {errors.poc_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.poc_name}</p>
                )}
              </div>

              {/* Designation */}
              <div>
                <label htmlFor="designation" className="block text-sm font-medium text-gray-700">
                  Designation *
                </label>
                <input
                  type="text"
                  name="designation"
                  id="designation"
                  required
                  disabled={!isEditing}
                  value={formData.designation}
                  onChange={handleChange}
                  className={`mt-1 input ${errors.designation ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter designation"
                />
                {errors.designation && (
                  <p className="mt-1 text-sm text-red-600">{errors.designation}</p>
                )}
              </div>

              {/* Official Email */}
              <div>
                <label htmlFor="official_email" className="block text-sm font-medium text-gray-700">
                  Official Email ID *
                </label>
                <input
                  type="email"
                  name="official_email"
                  id="official_email"
                  required
                  disabled={!isEditing}
                  value={formData.official_email}
                  onChange={handleChange}
                  className={`mt-1 input ${errors.official_email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter your company email address"
                />
                {errors.official_email && (
                  <p className="mt-1 text-sm text-red-600">{errors.official_email}</p>
                )}
              </div>

              {/* Website URL */}
              <div className="sm:col-span-2">
                <label htmlFor="website_url" className="block text-sm font-medium text-gray-700">
                  Website URL
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="website_url"
                    id="website_url"
                    disabled={!isEditing}
                    value={formData.website_url}
                    onChange={handleChange}
                    className={`mt-1 input pl-10 ${errors.website_url ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="www.your-website.com"
                  />
                </div>
                {errors.website_url && (
                  <p className="mt-1 text-sm text-red-600">{errors.website_url}</p>
                )}
              </div>

              {/* Contact Number */}
              <div className="sm:col-span-2">
                <label htmlFor="contact_number" className="block text-sm font-medium text-gray-700">
                  Contact Number
                </label>
                <input
                  type="tel"
                  name="contact_number"
                  id="contact_number"
                  disabled={!isEditing}
                  value={formData.contact_number}
                  onChange={handleChange}
                  className={`mt-1 input ${errors.contact_number ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter contact number"
                  maxLength="15"
                />
                {errors.contact_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.contact_number}</p>
                )}
              </div>

              {/* Annual Turnover */}
              <div>
                <label htmlFor="annual_turnover" className="block text-sm font-medium text-gray-700">
                  Annual Turnover *
                </label>
                <select
                  name="annual_turnover"
                  id="annual_turnover"
                  required
                  disabled={!isEditing}
                  value={formData.annual_turnover}
                  onChange={handleChange}
                  className={`mt-1 input ${errors.annual_turnover ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                >
                  <option value="">Select Annual Turnover</option>
                  <option value="equal to less than 1cr">equal to less than 1cr</option>
                  <option value="1cr-10cr">1cr-10cr</option>
                  <option value="10cr-50cr">10cr-50cr</option>
                  <option value="50Cr-250Cr">50Cr-250Cr</option>
                  <option value="more than 250Cr">more than 250Cr</option>
                </select>
                {errors.annual_turnover && (
                  <p className="mt-1 text-sm text-red-600">{errors.annual_turnover}</p>
                )}
              </div>

              {/* Trade Margin */}
              <div>
                <label htmlFor="trade_margin" className="block text-sm font-medium text-gray-700">
                  Average Trade Margin *
                </label>
                <select
                  name="trade_margin"
                  id="trade_margin"
                  required
                  disabled={!isEditing}
                  value={formData.trade_margin}
                  onChange={handleChange}
                  className={`mt-1 input ${errors.trade_margin ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                >
                  <option value="">Select Trade Margin</option>
                  <option value="20-25">20-25</option>
                  <option value="25-30">25-30</option>
                  <option value="30 and above">30 and above</option>
                </select>
                {errors.trade_margin && (
                  <p className="mt-1 text-sm text-red-600">{errors.trade_margin}</p>
                )}
              </div>
            </div>

            {/* Categories and Subcategories Section */}
            {isEditing && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories & Subcategories</h3>
                <p className="text-sm text-gray-600 mb-6">Select categories and their corresponding subcategories. Each category has specific subcategories that will be available for your products.</p>
                
                {Object.keys(categorySubcategoryMap).length > 0 ? (
                  Object.entries(categorySubcategoryMap).map(([category, subcategories]) => (
                  <div key={category} className="border border-gray-200 rounded-lg p-4 mb-6 hover:border-blue-300 transition-colors">
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.some(cat => cat.category === category)}
                          onChange={(e) => handleCategoryChange(category, e.target.checked)}
                          disabled={!isEditing}
                          className="mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="font-semibold text-lg text-gray-900">{category}</span>
                      </label>
                      {selectedCategories.some(cat => cat.category === category) && (
                        <span className="text-sm text-blue-600 font-medium">✓ Selected</span>
                      )}
                    </div>
                    
                                  {/* Subcategory Selection - Always Show */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Select Subcategories:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {subcategories.map(subcategory => (
                    <label key={subcategory} className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories
                          .find(cat => cat.category === category)?.sub_categories
                          .includes(subcategory) || false}
                        onChange={(e) => handleSubcategoryChange(category, subcategory, e.target.checked)}
                        disabled={!isEditing || !selectedCategories.some(cat => cat.category === category)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-700">{subcategory}</span>
                    </label>
                  ))}
                </div>
              </div>
                    
                                  {/* Trade Details - Only Show when Category is Selected */}
              {selectedCategories.some(cat => cat.category === category) && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Trade Details for {category}:</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Average Trade Margin
                        </label>
                        <select 
                          value={selectedCategories.find(cat => cat.category === category)?.avg_trade_margin || '25-30'}
                          onChange={(e) => handleTradeMarginChange(category, e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
                        >
                          {tradeMarginOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Annual Turnover
                        </label>
                        <select 
                          value={selectedCategories.find(cat => cat.category === category)?.annual_turnover || '1cr-10cr'}
                          onChange={(e) => handleTurnoverChange(category, e.target.value)}
                          disabled={!isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
                        >
                          {annualTurnoverOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                  </div>
                ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No categories available. Please contact support.</p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            {isEditing && (
              <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {Object.values(errors).some(error => error && error.trim() !== '') && (
                  <div className="text-red-600">
                    <div className="font-medium mb-1">Please fix the following errors:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {Object.entries(errors)
                        .filter(([field, message]) => message && message.trim() !== '')
                        .map(([field, message]) => (
                        <li key={field} className="text-sm">{message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setErrors({}) // Clear errors when canceling
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                                     <button
                     type="submit"
                     disabled={createBrandMutation.isLoading || updateBrandMutation.isLoading || Object.values(errors).some(error => error && error.trim() !== '')}
                     onClick={() => {
                       console.log('🔘 ===== BUTTON CLICKED =====')
                       console.log('🔘 Update Brand button clicked')
                       console.log('🔘 Button disabled?', createBrandMutation.isLoading || updateBrandMutation.isLoading || Object.values(errors).some(error => error && error.trim() !== ''))
                       console.log('🔘 createBrandMutation.isLoading:', createBrandMutation.isLoading)
                       console.log('🔘 updateBrandMutation.isLoading:', updateBrandMutation.isLoading)
                       console.log('🔘 Errors count:', Object.keys(errors).length)
                       console.log('🔘 Errors:', errors)
                       console.log('🔘 Form data:', formData)
                       console.log('🔘 Selected categories:', selectedCategories)
                       console.log('🔘 ===== BUTTON CLICK END =====')
                     }}
                     className="btn btn-primary flex items-center"
                   >
                     <Save className="h-4 w-4 mr-2" />
                     {createBrandMutation.isLoading || updateBrandMutation.isLoading
                       ? 'Saving...'
                       : selectedBrand
                       ? 'Update Brand'
                       : 'Create Brand'}
                   </button>
                </div>
              </div>
            )}
            </form>
          )}
        </div>
      </div>

      {/* Profile Status */}
      {selectedBrandData && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Building2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Brand Profile Complete
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Your brand "{selectedBrandData.name}" is complete and visible to potential retail partners.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrandProfile 