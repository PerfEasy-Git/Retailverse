import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import productService from '../services/productService';

const ProductManagement = () => {
  const { brandId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [formData, setFormData] = useState({
    sku_name: '',
    category: '',
    sub_category: '',
    short_description: '',
    specification: '',
    pack_size: '',
    uom: 'PCS',
    mrp: '',
    gst: '18',
    price: '',
    description: ''
  });

  // Reference data
  const categorySubcategoryMap = {
    'Makeup': ['Face', 'Eyes', 'Lips', 'Nail'],
    'Skin': ['Moisturizers', 'Cleansers', 'Masks', 'Toners', 'Body Care', 'Eye Care', 'Lip Care', 'Sun Care'],
    'Hair': ['Shampoo', 'Conditioner', 'Hair Oil', 'Hair Mask', 'Hair Styling', 'Hair Color'],
    'Bath & Body': ['Soaps', 'Shower Gels', 'Body Lotions', 'Deodorants', 'Hand Care'],
    'Mom & Baby': ['Baby Care', 'Maternity Care', 'Baby Food', 'Baby Toys'],
    'Health & Wellness': ['Vitamins', 'Supplements', 'Health Drinks', 'Fitness']
  };

  const uomOptions = ['PCS', 'GM', 'ML'];

  useEffect(() => {
    loadProducts();
  }, [brandId]);

  const loadProducts = async () => {
    try {
      const response = await productService.getByBrand(brandId);
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await productService.create({
        brand_id: brandId,
        ...formData
      });
      
      setSuccess('Product created successfully!');
      setFormData({
        sku_name: '',
        category: '',
        sub_category: '',
        short_description: '',
        specification: '',
        pack_size: '',
        uom: 'PCS',
        mrp: '',
        gst: '18',
        price: '',
        description: ''
      });
      setShowForm(false);
      loadProducts();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('brand_id', brandId);

      const response = await productService.uploadExcel(formData);
      setSuccess(response.message);
      setShowExcelUpload(false);
      loadProducts();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload Excel file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Product Management</h2>
        <div className="space-x-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'Add Product'}
          </button>
          <button
            onClick={() => setShowExcelUpload(!showExcelUpload)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            {showExcelUpload ? 'Cancel' : 'Upload Excel'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Excel Upload Section */}
      {showExcelUpload && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Upload Excel File</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Excel File</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p><strong>Required columns:</strong> SKU Name, Category, Sub Category, Short Description, Specification, Pack Size, UOM, MRP, GST, Price, Description</p>
              <p><strong>UOM options:</strong> PCS, GM, ML</p>
            </div>
          </div>
        </div>
      )}

      {/* Product Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Product</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SKU Name *</label>
                <input
                  type="text"
                  name="sku_name"
                  value={formData.sku_name}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {Object.keys(categorySubcategoryMap).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sub Category *</label>
                <select
                  name="sub_category"
                  value={formData.sub_category}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Sub Category</option>
                  {formData.category && categorySubcategoryMap[formData.category]?.map(subcategory => (
                    <option key={subcategory} value={subcategory}>{subcategory}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pack Size *</label>
                <input
                  type="number"
                  name="pack_size"
                  value={formData.pack_size}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">UOM *</label>
                <select
                  name="uom"
                  value={formData.uom}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {uomOptions.map(uom => (
                    <option key={uom} value={uom}>{uom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">MRP *</label>
                <input
                  type="number"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">GST *</label>
                <input
                  type="number"
                  name="gst"
                  value={formData.gst}
                  onChange={handleChange}
                  required
                  min="0"
                  max="28"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Short Description</label>
              <input
                type="text"
                name="short_description"
                value={formData.short_description}
                onChange={handleChange}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Specification</label>
              <input
                type="text"
                name="specification"
                value={formData.specification}
                onChange={handleChange}
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Products ({products.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pack Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.sku_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.subcategory}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.pack_size} {product.uom}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{product.mrp}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.gst}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{product.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductManagement; 