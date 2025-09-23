import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useMessage } from '../contexts/MessageContext'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { 
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  FileSpreadsheet,
  Package,
  TrendingUp
} from 'lucide-react'

const Discovery = () => {
  const { user } = useAuth()
  const { showSuccess, showError } = useMessage()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('products')
  const [isAddingProduct, setIsAddingProduct] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showExcelUpload, setShowExcelUpload] = useState(true)
  const [errors, setErrors] = useState({})
  const [fitScoreResults, setFitScoreResults] = useState(null)
  
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    sub_category: '',
    mrp: '',
    asp: '',
    quantity: '',
    uom: 'Pieces',
    trade_margin: ''
  })

  // Fetch categories for dropdown
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery(
    ['categories'],
    async () => {
      const response = await api.get('/categories');
      return response.data.data;
    },
    {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );

  // Convert categories to dropdown format
  const categorySubcategoryMap = categoriesData?.reduce((acc, category) => {
    if (category.category && category.subcategories && Array.isArray(category.subcategories)) {
      acc[category.category] = category.subcategories;
    }
    return acc;
  }, {}) || {};

  // Fetch brand products
  const { data: products, isLoading: productsLoading } = useQuery(
    ['brand-products'],
    async () => {
      const response = await api.get('/discovery/products');
      return response.data.data;
    },
    {
      enabled: user?.role === 'brand_admin' || user?.role === 'brand_user'
    }
  )

  // Create product mutation
  const createProductMutation = useMutation(
    async (data) => {
      const response = await api.post('/discovery/products', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['brand-products']);
        showSuccess('Product added successfully!');
        // Keep form visible for adding more products
        resetForm();
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to add product');
      }
    }
  )

  // Update product mutation
  const updateProductMutation = useMutation(
    async ({ id, data }) => {
      const response = await api.put(`/discovery/products/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['brand-products']);
        showSuccess('Product updated successfully!');
        setIsEditing(false);
        setEditingProduct(null);
        resetForm();
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to update product');
      }
    }
  )

  // Delete product mutation
  const deleteProductMutation = useMutation(
    async (id) => {
      const response = await api.delete(`/discovery/products/${id}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['brand-products']);
        showSuccess('Product deleted successfully!');
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to delete product');
      }
    }
  )

  // Excel upload mutation
  const excelUploadMutation = useMutation(
    async (file) => {
      const formData = new FormData();
      formData.append('excelFile', file);
      
      const response = await api.post('/discovery/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['brand-products']);
        showSuccess(data.message);
        // Keep Excel upload section visible for uploading more files
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.error || 'Failed to upload Excel file';
        const details = error.response?.data?.details;
        
        if (details && Array.isArray(details)) {
          const firstFewErrors = details.slice(0, 5).join('\n');
          const moreErrors = details.length > 5 ? `\n... and ${details.length - 5} more errors` : '';
          showError(`${errorMessage}\n\nFirst few errors:\n${firstFewErrors}${moreErrors}`);
        } else {
          showError(errorMessage);
        }
      }
    }
  )

  // FIT Score calculation mutation
  const fitScoreMutation = useMutation(
    async () => {
      const response = await api.post('/fit-scores/calculate');
      return response.data;
    },
    {
      onSuccess: (data) => {
        // Don't show success message - user will see results on FIT Scores tab
        setFitScoreResults(data.data);
        setActiveTab('fit-scores'); // Automatically switch to FIT Scores tab
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to calculate FIT scores');
      }
    }
  )

  const resetForm = () => {
    setFormData({
      product_name: '',
      category: '',
      sub_category: '',
      mrp: '',
      asp: '',
      quantity: '',
      uom: 'Pieces',
      trade_margin: ''
    });
    setErrors({});
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
      ...prev,
        [name]: ''
      }));
    }
  }

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.product_name.trim()) {
      newErrors.product_name = 'Product name is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.sub_category) {
      newErrors.sub_category = 'Sub category is required';
    }
    if (!formData.mrp || isNaN(formData.mrp) || parseFloat(formData.mrp) <= 0) {
      newErrors.mrp = 'Valid MRP is required';
    }
    if (!formData.asp || isNaN(formData.asp) || parseFloat(formData.asp) <= 0) {
      newErrors.asp = 'Valid ASP is required';
    }
    if (!formData.quantity || isNaN(formData.quantity) || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (!formData.trade_margin || isNaN(formData.trade_margin) || parseFloat(formData.trade_margin) < 0 || parseFloat(formData.trade_margin) > 100) {
      newErrors.trade_margin = 'Valid trade margin (0-100%) is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const submitData = {
      ...formData,
      mrp: parseFloat(formData.mrp),
      asp: parseFloat(formData.asp),
      quantity: parseInt(formData.quantity),
      trade_margin: parseFloat(formData.trade_margin)
    };
    
    if (isEditing && editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: submitData });
    } else {
      createProductMutation.mutate(submitData);
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsEditing(true);
    setFormData({
      product_name: product.product_name,
      category: product.category,
      sub_category: product.sub_category,
      mrp: parseFloat(product.mrp).toString(),
      asp: parseFloat(product.asp).toString(),
      quantity: parseInt(product.quantity).toString(),
      uom: product.uom || '',
      trade_margin: parseFloat(product.trade_margin).toString()
    });
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(id);
    }
  }

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      excelUploadMutation.mutate(file);
    }
  }

  const handleCalculateFitScore = () => {
    if (products && products.length === 0) {
      showError('Please add products before calculating FIT scores');
      return;
    }
    fitScoreMutation.mutate();
  }


  // Get available subcategories based on selected category
  const availableSubcategories = formData.category ? categorySubcategoryMap[formData.category] || [] : [];

  if (user?.role !== 'brand_admin' && user?.role !== 'brand_user') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Access denied. This page is only for brand users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
      <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Discovery</h1>
        <p className="mt-1 text-sm text-gray-500">
            Add your products to discover the best retail partners
        </p>
      </div>
        <div className="flex space-x-3">
            {/* Show Calculate FIT Scores button only on Products tab */}
            {activeTab === 'products' && (
                <button
                onClick={handleCalculateFitScore}
                disabled={fitScoreMutation.isLoading || !products || products.length === 0}
                className="btn btn-primary flex items-center"
                >
                <TrendingUp className="h-4 w-4 mr-2" />
                {fitScoreMutation.isLoading ? 'Calculating...' : 'Calculate FIT Scores'}
                </button>
            )}
            
            {/* Show GTM button only on FIT Scores tab */}
            {activeTab === 'fit-scores' && fitScoreResults && (
            <button
                onClick={() => navigate('/gtm-strategy', { 
                    state: { 
                        fitScoreResults,
                        activeTab: 'fit-scores'
                    } 
                })}
                className="btn btn-primary flex items-center"
                >
                <TrendingUp className="h-4 w-4 mr-2" />
                GTM
            </button>
            )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Products ({products?.length || 0})
            </button>
            {fitScoreResults && (
            <button
                onClick={() => setActiveTab('fit-scores')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'fit-scores'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
                <TrendingUp className="h-4 w-4 inline mr-2" />
                FIT Scores ({fitScoreResults.retailers?.length || 0})
            </button>
            )}
          </nav>
        </div>

        <div className="p-3">
          {activeTab === 'products' && (
            <>

          {/* Add/Edit Product Form */}
          {(isAddingProduct || isEditing) && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button
                  onClick={() => {
                    setIsAddingProduct(false);
                    setIsEditing(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
            </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* First Row: Product Name (full width) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Name *
                  </label>
            <input
              type="text"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleChange}
                    className={`mt-1 input w-full ${errors.product_name ? 'border-red-500' : ''}`}
                    placeholder="Enter product name"
                  />
                  {errors.product_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.product_name}</p>
                  )}
          </div>

                {/* Second Row: Category and Sub Category */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Category *
                    </label>
              <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={`mt-1 input w-full ${errors.category ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select Category</option>
                      {Object.keys(categorySubcategoryMap).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
              </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                    )}
          </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sub Category *
                    </label>
              <select
                      name="sub_category"
                      value={formData.sub_category}
                      onChange={handleChange}
                      disabled={!formData.category}
                      className={`mt-1 input w-full ${errors.sub_category ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select Sub Category</option>
                      {availableSubcategories.map(subcategory => (
                        <option key={subcategory} value={subcategory}>{subcategory}</option>
                      ))}
              </select>
                    {errors.sub_category && (
                      <p className="mt-1 text-sm text-red-600">{errors.sub_category}</p>
                    )}
                  </div>
            </div>

                {/* Third Row: MRP, ASP, Quantity, UOM, Trade Margin */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      MRP (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="mrp"
                      value={formData.mrp}
                      onChange={handleChange}
                      className={`mt-1 input w-full ${errors.mrp ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                    />
                    {errors.mrp && (
                      <p className="mt-1 text-sm text-red-600">{errors.mrp}</p>
                    )}
                    </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ASP (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="asp"
                      value={formData.asp}
                      onChange={handleChange}
                      className={`mt-1 input w-full ${errors.asp ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                    />
                    {errors.asp && (
                      <p className="mt-1 text-sm text-red-600">{errors.asp}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      className={`mt-1 input w-full ${errors.quantity ? 'border-red-500' : ''}`}
                      placeholder="0"
                    />
                    {errors.quantity && (
                      <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
                    )}
            </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700">
                      UOM
                    </label>
              <select
                      name="uom"
                      value={formData.uom}
                      onChange={handleChange}
                      className="mt-1 input w-full"
                    >
                      <option value="">Select UOM</option>
                      <option value="Pieces">Pieces</option>
                      <option value="GM">GM</option>
                      <option value="ML">ML</option>
              </select>
            </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Trade Margin (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="trade_margin"
                      value={formData.trade_margin}
                      onChange={handleChange}
                      className={`mt-1 input w-full ${errors.trade_margin ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                    />
                    {errors.trade_margin && (
                      <p className="mt-1 text-sm text-red-600">{errors.trade_margin}</p>
                    )}
            </div>
          </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingProduct(false);
                      setIsEditing(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProductMutation.isLoading || updateProductMutation.isLoading}
                    className="btn btn-primary flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createProductMutation.isLoading || updateProductMutation.isLoading
                      ? 'Saving...'
                      : isEditing
                      ? 'Update Product'
                      : 'Add Product'}
                  </button>
                </div>
              </form>
                    </div>
          )}

          {/* OR Separator */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <div className="px-4 bg-white">
              <span className="text-sm font-medium text-gray-500">OR</span>
            </div>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Excel Upload */}
          {showExcelUpload && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload Excel File</h3>
            <button
                  onClick={() => setShowExcelUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
            >
                  <X className="h-5 w-5" />
            </button>
                  </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Download Template</h4>
                      <p className="text-sm text-blue-700">Download the BRAND_TEMPLATE.xlsx file</p>
                    </div>
                    <div className="ml-auto">
                      <a 
                        href="/api/templates/brand-template.xlsx" 
                        download="BRAND_TEMPLATE.xlsx"
                        className="btn btn-sm btn-primary"
                      >
                        Download Template
                      </a>
          </div>
        </div>
      </div>

                <p className="text-sm text-gray-600">
                  Upload your BRAND_TEMPLATE.xlsx file to define which categories and subcategories your brand deals in.
                </p>
                
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileSpreadsheet className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> Excel file
                      </p>
                      <p className="text-xs text-gray-500">XLSX, XLS (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      disabled={excelUploadMutation.isLoading}
                    />
                  </label>
                </div>
                
                {excelUploadMutation.isLoading && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Processing Excel file...</p>
              </div>
                )}
          </div>
        </div>
      )}

          {/* Products List */}
          {productsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : products && products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MRP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ASP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {product.product_name}
                          </div>
                          {product.uom && (
                            <div className="text-sm text-gray-500">
                              {product.uom}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">{product.category}</div>
                          <div className="text-sm text-gray-500">{product.sub_category}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(product.mrp).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{parseFloat(product.asp).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseInt(product.quantity).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(product.trade_margin).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
            <button
                            onClick={() => handleEdit(product)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Edit className="h-4 w-4" />
            </button>
            <button
                            onClick={() => handleDelete(product.id)}
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
          ) : (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first product or uploading an Excel file.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsAddingProduct(true)}
                  className="btn btn-primary flex items-center mx-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </button>
                    </div>
                  </div>
          )}
            </>
          )}

          {activeTab === 'fit-scores' && fitScoreResults && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {fitScoreResults.retailers.length}
                  </div>
                  <div className="text-sm text-gray-600">MATCHED RETAIL CHAIN</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {fitScoreResults.retailers.reduce((sum, r) => sum + (r.outlet_count || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">NO OF STORE</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {fitScoreResults?.calculation_summary?.total_market_size_display || "0.00Cr"}
                  </div>
                  <div className="text-sm text-gray-600">TOTAL MARKET SIZE</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    1
                    </div>
                  <div className="text-sm text-gray-600">STATE PRESENCE</div>
                    </div>
                  </div>

              {/* Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">RETAILER MATCH</h3>
                </div>

              {/* Retailer Rows */}
              <div className="space-y-4">
                {fitScoreResults.retailers
                  .sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0)) // Sort by FIT score descending
                  .map((retailer, index) => (
                  <div key={retailer.retailer_id || `retailer-${index}`} className="flex items-center space-x-4">
                    {/* Section 1: Logo + Name (Complete Border) */}
                    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6 flex items-center w-80">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 ${
                        index % 4 === 0 ? 'bg-red-500' :
                        index % 4 === 1 ? 'bg-blue-500' :
                        index % 4 === 2 ? 'bg-orange-500' :
                        'bg-purple-500'
                      }`}>
                        {retailer.retailer_name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-1">{retailer.retailer_name}</h4>
                        <p className="text-sm text-gray-600">Contact Person</p>
                    </div>
                  </div>

                    {/* Section 2: Three Values (Complete Border) */}
                    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6 flex-1">
                      <div className="flex items-center justify-around">
                        {/* Market Size */}
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-2">Market Size</div>
                          <div className="text-xl font-bold text-gray-900">{retailer.market_size_display || "0.0Cr"}</div>
                        </div>

                        {/* Match Score */}
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-2">MATCH SCORE</div>
                          <div className={`text-2xl font-bold px-4 py-2 rounded-lg border-2 ${
                            retailer.fit_score >= 80 ? 'text-green-600 border-green-200 bg-green-50' :
                            retailer.fit_score >= 60 ? 'text-yellow-600 border-yellow-200 bg-yellow-50' :
                            'text-red-600 border-red-200 bg-red-50'
                          }`}>
                            {retailer.fit_score}%
                          </div>
                    </div>

                        {/* Store Count */}
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-2">Store Count</div>
                          <div className="text-xl font-bold text-gray-900">{retailer.outlet_count || 0}</div>
                    </div>
                      </div>
                    </div>

                    {/* Section 3: Discover More Button (No Border) */}
                    <div className="w-48 flex items-center justify-center">
                      <button 
                        onClick={() => navigate(`/retailer/${retailer.retailer_id}`)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        DISCOVER MORE
                      </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Discovery 