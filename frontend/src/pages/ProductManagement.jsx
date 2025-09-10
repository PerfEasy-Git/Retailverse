import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useMessage } from '../contexts/MessageContext'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import api from '../services/api'
import { Package, Plus, Edit, Save, X, Trash2, Building2 } from 'lucide-react'

const ProductManagement = () => {
  const { user } = useAuth()
  const { showSuccess, showError } = useMessage()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [showExcelUpload, setShowExcelUpload] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    sku: 'AUTO_GENERATED', // Dummy value, will be auto-generated
    category: '',
    subcategory: '',
    packSize: '',
    uom: 'PCS',
    mrp: '',
    asp: '',
    gst: '18',
    description: '',
    specifications: ''
  })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(3)

  // Category and subcategory data (same as in BrandProfile)
  const categorySubcategoryMap = {
    'Makeup': ['Face', 'Eyes', 'Lips', 'Nail'],
    'Skin': ['Moisturizers', 'Cleansers', 'Masks', 'Toners', 'Body Care', 'Eye Care', 'Lip Care', 'Sun Care'],
    'Hair': ['Hair Care'],
    'Bath & Body': ['Bath & Shower', 'Body Care', 'Shaving & Hair Removal', 'Men\'s Grooming', 'Hands & Feet', 'Hygiene Essentials', 'Oral Care'],
    'Mom & Baby': ['Baby Care', 'Maternity Care', 'Kids Care', 'Nursing & Feeding'],
    'Health & Wellness': ['Health Supplements', 'Beauty Supplements', 'Sports Nutrition', 'Weight Management', 'Health Foods']
  };

  // Get user's brands
  const { data: brands, isLoading: brandsLoading } = useQuery(
    ['brands', user?.id],
    async () => {
      const response = await api.get('/brands/my-brands');
      return response.data.brands || [];
    },
    {
      enabled: !!user,
      onSuccess: (data) => {
        if (data && data.length > 0 && !selectedBrand) {
          setSelectedBrand(data[0].id);
        }
      }
    }
  )

  const [selectedBrand, setSelectedBrand] = useState(null)

  // Get products for selected brand
  const { data: products, isLoading: productsLoading } = useQuery(
    ['products', selectedBrand],
    async () => {
      if (!selectedBrand) return [];
      const response = await api.get(`/products?brandId=${selectedBrand}`);
      return response.data.products || [];
    },
    {
      enabled: !!selectedBrand,
      onSuccess: () => {
        // Reset pagination when brand changes
        setCurrentPage(1)
      }
    }
  )

  const createProductMutation = useMutation(
    (data) => api.post(`/products`, { ...data, brand_id: selectedBrand }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['products', selectedBrand])
        showSuccess('Product created successfully!')
        setIsAddingProduct(false)
        setSelectedProduct(null)
                 setFormData({
           name: '',
           sku: 'AUTO_GENERATED',
           category: '',
           subcategory: '',
           packSize: '',
           uom: 'PCS',
           mrp: '',
           asp: '',
           gst: '18',
           description: '',
           specifications: ''
         })
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to create product')
      }
    }
  )

  const updateProductMutation = useMutation(
    (data) => api.put(`/products/${selectedProduct}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['products', selectedBrand])
        showSuccess('Product updated successfully!')
        setIsEditing(false)
        setSelectedProduct(null)
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to update product')
      }
    }
  )

  const deleteProductMutation = useMutation(
    (productId) => api.delete(`/products/${productId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['products', selectedBrand])
        showSuccess('Product deleted successfully!')
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to delete product')
      }
    }
  )

  // Get the currently selected brand data
  const selectedBrandData = brands?.find(brand => brand.id === selectedBrand)

  // Get the currently selected product data
  const selectedProductData = products?.find(product => product.id === selectedProduct)

  // Update form data when selected product changes
  useEffect(() => {
    if (selectedProductData) {
             setFormData({
         name: selectedProductData.name || '',
         sku: selectedProductData.sku || '',
         category: selectedProductData.category || '',
         subcategory: selectedProductData.subcategory || '',
         packSize: selectedProductData.pack_size || '',
         uom: selectedProductData.uom || 'PCS',
         mrp: selectedProductData.price || '',
         gst: selectedProductData.gst || '18',
         description: selectedProductData.description || '',
         specifications: selectedProductData.specification || ''
       })
    } else {
             setFormData({
         name: '',
         sku: '',
         category: selectedBrandData?.category || '',
         subcategory: '',
         packSize: '',
         uom: 'PCS',
         mrp: '',
         gst: '18',
         description: '',
         specifications: ''
       })
    }
  }, [selectedProductData, selectedBrandData])

  const validateForm = () => {
    const newErrors = {}
    
    // Product name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Product name must be at least 2 characters'
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Product name must be less than 100 characters'
    }
    
    // SKU validation
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required'
    } else if (formData.sku.trim().length < 3) {
      newErrors.sku = 'SKU must be at least 3 characters'
    } else if (formData.sku.trim().length > 50) {
      newErrors.sku = 'SKU must be less than 50 characters'
    }
    
    // Category validation
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required'
    }
    
    // Subcategory validation
    if (!formData.subcategory.trim()) {
      newErrors.subcategory = 'Subcategory is required'
    }
    
    // Pack size validation
    if (!formData.packSize.trim()) {
      newErrors.packSize = 'Pack size is required'
    } else {
      const packSizeValue = parseInt(formData.packSize)
      if (isNaN(packSizeValue)) {
        newErrors.packSize = 'Pack size must be a valid number'
      } else if (packSizeValue < 1) {
        newErrors.packSize = 'Pack size must be at least 1'
      } else if (packSizeValue > 999999) {
        newErrors.packSize = 'Pack size must be less than 999,999'
      }
    }
    
    // MRP validation
    if (!formData.mrp.trim()) {
      newErrors.mrp = 'MRP is required'
    } else {
      const mrpValue = parseFloat(formData.mrp)
      if (isNaN(mrpValue)) {
        newErrors.mrp = 'MRP must be a valid number'
      } else if (mrpValue <= 0) {
        newErrors.mrp = 'MRP must be a positive number'
      } else if (mrpValue > 999999.99) {
        newErrors.mrp = 'MRP must be less than ₹10,00,000'
      }
    }
    
         // UOM validation
     if (!formData.uom.trim()) {
       newErrors.uom = 'Unit of measurement is required'
     } else if (!['PCS', 'GM', 'ML'].includes(formData.uom)) {
       newErrors.uom = 'UOM must be PCS, GM, or ML'
     }
     
     // ASP validation
     if (!formData.asp.trim()) {
       newErrors.asp = 'ASP is required'
     } else {
       const aspValue = parseFloat(formData.asp)
       if (isNaN(aspValue)) {
         newErrors.asp = 'ASP must be a valid number'
       } else if (aspValue <= 0) {
         newErrors.asp = 'ASP must be a positive number'
       } else if (aspValue > 999999.99) {
         newErrors.asp = 'ASP must be less than ₹10,00,000'
       }
     }
     
     // GST validation
     if (!formData.gst.trim()) {
       newErrors.gst = 'GST is required'
     } else {
       const gstValue = parseFloat(formData.gst)
       if (isNaN(gstValue)) {
         newErrors.gst = 'GST must be a valid number'
       } else if (gstValue < 0) {
         newErrors.gst = 'GST must be a positive number'
       } else if (gstValue > 28) {
         newErrors.gst = 'GST cannot exceed 28%'
       }
     }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Run validation and check if there are any errors
    const isValid = validateForm()
    
    if (!isValid) {
      // Show the validation errors on the UI
      showError(`Please fix ${Object.keys(errors).length} error(s) in the form`)
      return
    }
    
         // Additional validation to ensure data types are correct
     const mrpValue = parseFloat(formData.mrp)
     const aspValue = parseFloat(formData.asp)
     const gstValue = parseFloat(formData.gst)
     
     if (isNaN(mrpValue) || isNaN(aspValue) || isNaN(gstValue)) {
       showError('Please ensure all numeric fields contain valid numbers')
       return
     }
    
    // Format data to ensure proper types and prevent database errors
    const productData = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      category: formData.category.trim(),
      subcategory: formData.subcategory.trim(),
      pack_size: formData.packSize.trim(),
      uom: formData.uom.trim(),
      mrp: Number(mrpValue.toFixed(2)),
      asp: Number(aspValue.toFixed(2)),
      gst: Number(gstValue.toFixed(2)),
      price: Number(aspValue.toFixed(2)), // Use ASP as price
      description: formData.description.trim() || null,
      specification: formData.specifications.trim() || null
    }
    
    // Final validation before sending
    if (productData.price <= 0 || productData.gst < 0) {
      showError('Please ensure all numeric values are valid')
      return
    }
    
    if (selectedProduct) {
      updateProductMutation.mutate(productData)
    } else {
      createProductMutation.mutate(productData)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    // Real-time validation for all fields
    const newErrors = { ...errors }
    
    // Product name validation
    if (name === 'name') {
      if (!value.trim()) {
        newErrors.name = 'Product name is required'
      } else if (value.trim().length < 2) {
        newErrors.name = 'Product name must be at least 2 characters'
      } else if (value.trim().length > 100) {
        newErrors.name = 'Product name must be less than 100 characters'
      } else {
        delete newErrors.name
      }
    }
    
    // SKU validation - removed since it's auto-generated
    
    // Category validation
    if (name === 'category') {
      if (!value.trim()) {
        newErrors.category = 'Category is required'
      } else {
        delete newErrors.category
      }
    }
    
    // Subcategory validation
    if (name === 'subcategory') {
      if (!value.trim()) {
        newErrors.subcategory = 'Subcategory is required'
      } else {
        delete newErrors.subcategory
      }
    }
    
    // Pack size validation
    if (name === 'packSize') {
      if (!value.trim()) {
        newErrors.packSize = 'Pack size is required'
      } else {
        const packSizeValue = parseInt(value)
        if (isNaN(packSizeValue)) {
          newErrors.packSize = 'Pack size must be a valid number'
        } else if (packSizeValue < 1) {
          newErrors.packSize = 'Pack size must be at least 1'
        } else if (packSizeValue > 999999) {
          newErrors.packSize = 'Pack size must be less than 999,999'
        } else {
          delete newErrors.packSize
        }
      }
    }
    
    // MRP validation
    if (name === 'mrp') {
      if (!value.trim()) {
        newErrors.mrp = 'MRP is required'
      } else {
        const mrpValue = parseFloat(value)
        if (isNaN(mrpValue)) {
          newErrors.mrp = 'MRP must be a valid number'
        } else if (mrpValue <= 0) {
          newErrors.mrp = 'MRP must be a positive number'
        } else if (mrpValue > 999999.99) {
          newErrors.mrp = 'MRP must be less than ₹10,00,000'
        } else {
          delete newErrors.mrp
        }
      }
    }
    
    // ASP validation
    if (name === 'asp') {
      if (!value.trim()) {
        newErrors.asp = 'ASP is required'
      } else {
        const aspValue = parseFloat(value)
        if (isNaN(aspValue)) {
          newErrors.asp = 'ASP must be a valid number'
        } else if (aspValue <= 0) {
          newErrors.asp = 'ASP must be a positive number'
        } else if (aspValue > 999999.99) {
          newErrors.asp = 'ASP must be less than ₹10,00,000'
        } else {
          delete newErrors.asp
        }
      }
    }
    
    setErrors(newErrors)
  }

  const handleEditProduct = (product) => {
    setSelectedProduct(product.id)
    setIsEditing(true)
    setIsAddingProduct(false)
  }

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setIsAddingProduct(true)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setIsAddingProduct(false)
    setSelectedProduct(null)
    setErrors({})
  }

  const handleDeleteProduct = (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(productId)
    }
  }

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('brand_id', selectedBrand);

    try {
      const response = await api.post('/products/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      showSuccess(response.data.message);
      setShowExcelUpload(false);
      queryClient.invalidateQueries(['products', selectedBrand]);
    } catch (error) {
      if (error.response?.data?.errors) {
        // Show detailed errors from backend
        const errorMessages = error.response.data.errors;
        errorMessages.forEach(msg => showError(msg));
      } else {
        showError(error.response?.data?.error || 'Failed to upload Excel file');
      }
    }
  }

  if (brandsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!brands || brands.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No brands found</h3>
        <p className="mt-1 text-sm text-gray-500">
          You need to create a brand profile first to manage products.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
             {/* Header */}
       <div className="flex justify-between items-center">
         <div>
           <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
           <p className="mt-1 text-sm text-gray-500">
             Manage your product catalog and SKU details
           </p>
         </div>
         <div className="flex space-x-2">
           <button
             onClick={() => setShowExcelUpload(!showExcelUpload)}
             className="btn btn-secondary flex items-center"
           >
             <Package className="h-4 w-4 mr-2" />
             Upload Excel
           </button>
           <button
             onClick={handleAddProduct}
             className="btn btn-primary flex items-center"
           >
             <Plus className="h-4 w-4 mr-2" />
             Add Product
           </button>
         </div>
       </div>

             {/* Brand Selector */}
       <div className="bg-white shadow rounded-lg p-4">
         <label className="block text-sm font-medium text-gray-700 mb-2">
           Select Brand
         </label>
         <select
           value={selectedBrand || ''}
           onChange={(e) => setSelectedBrand(Number(e.target.value))}
           className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
         >
           <option value="">Select a brand</option>
           {brands.map(brand => (
             <option key={brand.id} value={brand.id}>
               {brand.name} - {brand.category}
             </option>
           ))}
         </select>
       </div>

       {/* Excel Upload Section */}
       {showExcelUpload && selectedBrand && (
         <div className="bg-white shadow rounded-lg p-6">
           <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Excel File</h3>
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Select Excel File
               </label>
               <input
                 type="file"
                 accept=".xlsx,.xls"
                 onChange={handleExcelUpload}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
               />
               <p className="mt-2 text-sm text-gray-500">
                 Upload an Excel file with product details. The file should contain columns: sku name, category, sub_category, short description, specification, pack size, uom, mrp, asp, gst
               </p>
             </div>
           </div>
         </div>
       )}

       {/* Add/Edit Product Form */}
       {(isAddingProduct || isEditing) && selectedBrand && (
         <div className="bg-white shadow rounded-lg">
           <div className="px-4 py-5 sm:p-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-6">
               {isEditing ? 'Edit Product' : 'Add New Product'}
             </h3>
             
             <form onSubmit={handleSubmit} className="space-y-6">
               <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                 {/* SKU Name */}
                 <div>
                   <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                     SKU Name *
                   </label>
                   <input
                     type="text"
                     name="name"
                     id="name"
                     required
                     value={formData.name}
                     onChange={handleChange}
                     className={`mt-1 input ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                     placeholder="Enter SKU name"
                   />
                   {errors.name && (
                     <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                   )}
                 </div>

                 {/* Category */}
                 <div>
                   <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                     Category *
                   </label>
                   <select
                     name="category"
                     id="category"
                     required
                     value={formData.category}
                     onChange={handleChange}
                     className={`mt-1 input ${errors.category ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                   >
                     <option value="">Select Category</option>
                     {Object.keys(categorySubcategoryMap).map(category => (
                       <option key={category} value={category}>
                         {category}
                       </option>
                     ))}
                   </select>
                   {errors.category && (
                     <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                   )}
                 </div>

                 {/* Subcategory */}
                 <div>
                   <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700">
                     Subcategory *
                   </label>
                   <select
                     name="subcategory"
                     id="subcategory"
                     required
                     value={formData.subcategory}
                     onChange={handleChange}
                     disabled={!formData.category}
                     className={`mt-1 input ${errors.subcategory ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                   >
                     <option value="">Select Subcategory</option>
                     {formData.category && categorySubcategoryMap[formData.category]?.map(subcategory => (
                       <option key={subcategory} value={subcategory}>
                         {subcategory}
                       </option>
                     ))}
                   </select>
                   {errors.subcategory && (
                     <p className="mt-1 text-sm text-red-600">{errors.subcategory}</p>
                   )}
                 </div>

                 {/* Pack Size */}
                 <div>
                   <label htmlFor="packSize" className="block text-sm font-medium text-gray-700">
                     Pack Size *
                   </label>
                   <input
                     type="number"
                     name="packSize"
                     id="packSize"
                     required
                     min="1"
                     max="999999"
                     value={formData.packSize}
                     onChange={handleChange}
                     className={`mt-1 input ${errors.packSize ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                     placeholder="e.g., 500, 1, 100"
                   />
                   {errors.packSize && (
                     <p className="mt-1 text-sm text-red-600">{errors.packSize}</p>
                   )}
                   <p className="mt-1 text-xs text-gray-500">
                     Enter only the number (units are selected in UOM field)
                   </p>
                 </div>

                 {/* Unit of Measurement */}
                 <div>
                   <label htmlFor="uom" className="block text-sm font-medium text-gray-700">
                     Unit of Measurement *
                   </label>
                   <select
                     name="uom"
                     id="uom"
                     required
                     value={formData.uom}
                     onChange={handleChange}
                     className={`mt-1 input ${errors.uom ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                   >
                     <option value="PCS">PCS</option>
                     <option value="GM">GM</option>
                     <option value="ML">ML</option>
                   </select>
                   {errors.uom && (
                     <p className="mt-1 text-sm text-red-600">{errors.uom}</p>
                   )}
                 </div>

                 {/* MRP */}
                 <div>
                   <label htmlFor="mrp" className="block text-sm font-medium text-gray-700">
                     MRP (₹) *
                   </label>
                   <input
                     type="number"
                     name="mrp"
                     id="mrp"
                     required
                     step="0.01"
                     min="0.01"
                     max="999999.99"
                     value={formData.mrp}
                     onChange={handleChange}
                     className={`mt-1 input ${errors.mrp ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                     placeholder="0.00"
                   />
                   {errors.mrp && (
                     <p className="mt-1 text-sm text-red-600">{errors.mrp}</p>
                   )}
                 </div>

                 {/* ASP */}
                 <div>
                   <label htmlFor="asp" className="block text-sm font-medium text-gray-700">
                     ASP (₹) *
                   </label>
                   <input
                     type="number"
                     name="asp"
                     id="asp"
                     required
                     step="0.01"
                     min="0.01"
                     max="999999.99"
                     value={formData.asp}
                     onChange={handleChange}
                     className={`mt-1 input ${errors.asp ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                     placeholder="0.00"
                   />
                   {errors.asp && (
                     <p className="mt-1 text-sm text-red-600">{errors.asp}</p>
                   )}
                 </div>

                 {/* GST */}
                 <div>
                   <label htmlFor="gst" className="block text-sm font-medium text-gray-700">
                     GST (%) *
                   </label>
                   <input
                     type="number"
                     name="gst"
                     id="gst"
                     required
                     step="0.01"
                     min="0"
                     max="28"
                     value={formData.gst}
                     onChange={handleChange}
                     className={`mt-1 input ${errors.gst ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                     placeholder="18"
                   />
                   {errors.gst && (
                     <p className="mt-1 text-sm text-red-600">{errors.gst}</p>
                   )}
                 </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 input"
                    placeholder="Product description..."
                  />
                </div>

                {/* Specifications */}
                <div className="sm:col-span-2">
                  <label htmlFor="specifications" className="block text-sm font-medium text-gray-700">
                    Specifications
                  </label>
                  <textarea
                    name="specifications"
                    id="specifications"
                    rows={3}
                    value={formData.specifications}
                    onChange={handleChange}
                    className="mt-1 input"
                    placeholder="Product specifications..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {Object.keys(errors).length > 0 && (
                    <span className="text-red-600">
                      Please fix {Object.keys(errors).length} error(s) before submitting
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProductMutation.isLoading || updateProductMutation.isLoading || Object.keys(errors).length > 0}
                    className="btn btn-primary flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createProductMutation.isLoading || updateProductMutation.isLoading
                      ? 'Saving...'
                      : isEditing
                      ? 'Update Product'
                      : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

       {/* Products Display Section */}
       {selectedBrand && (
         <div className="bg-white shadow rounded-lg">
           <div className="px-4 py-5 sm:p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold text-gray-900">
                 Products ({products?.length || 0})
               </h3>
               <div className="flex items-center space-x-4">
                 {productsLoading && (
                   <div className="text-sm text-gray-500">Loading products...</div>
                 )}
                 {products && products.length > 0 && (
                   <div className="flex items-center space-x-2">
                     <span className="text-sm text-gray-500">Show:</span>
                     <select
                       value={pageSize}
                       onChange={(e) => {
                         setPageSize(Number(e.target.value))
                         setCurrentPage(1) // Reset to first page when changing page size
                       }}
                       className="text-sm border border-gray-300 rounded px-2 py-1"
                     >
                       <option value={10}>10</option>
                       <option value={25}>25</option>
                       <option value={50}>50</option>
                     </select>
                     <span className="text-sm text-gray-500">per page</span>
                   </div>
                 )}
               </div>
             </div>

             {productsLoading ? (
               <div className="flex items-center justify-center h-32">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
               </div>
             ) : products && products.length > 0 ? (
               <>
                 {/* Pagination Info */}
                 <div className="mb-4 text-sm text-gray-500">
                   Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, products.length)} of {products.length} products
                 </div>
                 
                 <div className="overflow-x-auto">
                   <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           SKU Name
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Category
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Subcategory
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           MRP (₹)
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           ASP (₹)
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           GST (%)
                         </th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           Actions
                         </th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                                                {products
                           .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                           .map((product) => (
                         <tr key={product.id} className="hover:bg-gray-50">
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                             {product.sku_name}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             {product.category}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             {product.subcategory}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             ₹{product.mrp}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             ₹{product.price}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             {product.gst}%
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                             <div className="flex space-x-2">
                               <button
                                 onClick={() => handleEditProduct(product)}
                                 className="text-blue-600 hover:text-blue-900"
                               >
                                 <Edit className="h-4 w-4" />
                               </button>
                               <button
                                 onClick={() => handleDeleteProduct(product.id)}
                                 className="text-red-600 hover:text-red-900"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
                 
                 {/* Pagination Controls */}
                 {products.length > pageSize && (
                   <div className="mt-6 flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <button
                         onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                         disabled={currentPage === 1}
                         className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Previous
                       </button>
                       <span className="text-sm text-gray-500">
                         Page {currentPage} of {Math.ceil(products.length / pageSize)}
                       </span>
                       <button
                         onClick={() => setCurrentPage(Math.min(Math.ceil(products.length / pageSize), currentPage + 1))}
                         disabled={currentPage === Math.ceil(products.length / pageSize)}
                         className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Next
                       </button>
                     </div>
                     
                     {/* Page Numbers */}
                     <div className="flex items-center space-x-1">
                       {Array.from({ length: Math.ceil(products.length / pageSize) }, (_, i) => i + 1).map((page) => (
                         <button
                           key={page}
                           onClick={() => setCurrentPage(page)}
                           className={`px-3 py-1 text-sm border rounded ${
                             currentPage === page
                               ? 'bg-blue-600 text-white border-blue-600'
                               : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                           }`}
                         >
                           {page}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
               </>
             ) : (
               <div className="text-center py-8">
                 <Package className="mx-auto h-12 w-12 text-gray-400" />
                 <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                 <p className="mt-1 text-sm text-gray-500">
                   Get started by adding a product or uploading an Excel file.
                 </p>
               </div>
             )}
           </div>
         </div>
       )}
    </div>
  )
}

export default ProductManagement 