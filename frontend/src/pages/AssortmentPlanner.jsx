import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const AssortmentPlanner = () => {
  const { user } = useAuth();
  const [brands, setBrands] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [products, setProducts] = useState([]);
  const [assortmentPlan, setAssortmentPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [optimizationParams, setOptimizationParams] = useState({
    targetScore: 60,
    maxSkus: 10
  });

  useEffect(() => {
    loadBrands();
    loadRetailers();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      loadProducts();
    }
  }, [selectedBrand]);

  const loadBrands = async () => {
    try {
      const response = await api.get('/brands/my-brands');
      setBrands(response.data.brands);
      if (response.data.brands.length > 0) {
        setSelectedBrand(response.data.brands[0].id);
      } else {
        setError('No brands found. Please create a brand profile first.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
      setError('Failed to load brands');
      setLoading(false);
    }
  };

  const loadRetailers = async () => {
    try {
      const response = await api.get('/retailers');
      setRetailers(response.data.retailers);
    } catch (error) {
      console.error('Error loading retailers:', error);
      setError('Failed to load retailers');
    }
  };

  const loadProducts = async () => {
    if (!selectedBrand) return;
    
    try {
      const response = await api.get(`/products?brandId=${selectedBrand}`);
      setProducts(response.data.products);
      setSelectedProducts(response.data.products.map(p => p.id));
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products');
    }
  };

  const createAssortmentPlan = async () => {
    if (!selectedBrand || !selectedRetailer || selectedProducts.length === 0) {
      setError('Please select brand, retailer, and products');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedProductData = products.filter(p => selectedProducts.includes(p.id));
      const response = await api.post('/assortment/plan', {
        brandId: selectedBrand,
        retailerId: selectedRetailer,
        skus: selectedProductData
      });
      
      setAssortmentPlan(response.data.assortmentPlan);
    } catch (error) {
      console.error('Error creating assortment plan:', error);
      setError('Failed to create assortment plan');
    } finally {
      setLoading(false);
    }
  };

  const optimizeAssortment = async () => {
    if (!selectedBrand || !selectedRetailer) {
      setError('Please select brand and retailer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/assortment/optimize', {
        brandId: selectedBrand,
        retailerId: selectedRetailer,
        targetScore: optimizationParams.targetScore,
        maxSkus: optimizationParams.maxSkus
      });
      
      setAssortmentPlan(response.data.optimizedPlan);
    } catch (error) {
      console.error('Error optimizing assortment:', error);
      setError('Failed to optimize assortment plan');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'High': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-orange-600 bg-orange-100';
      case 'Very Low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    setSelectedProducts(products.map(p => p.id));
  };

  const deselectAllProducts = () => {
    setSelectedProducts([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Assortment Planner</h1>
          <p className="mt-2 text-gray-600">Plan SKU-level assortment strategies for optimal retailer fit</p>
        </div>

        {error && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  {error.includes('No brands found') ? 'Create Your First Brand' : 'Action Required'}
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>{error}</p>
                  {error.includes('No brands found') && (
                    <div className="mt-4">
                      <a
                        href="/brand/profile"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Create Brand Profile
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selection Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Plan Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Brand Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Brand
              </label>
              <select
                value={selectedBrand || ''}
                onChange={(e) => setSelectedBrand(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a brand</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Retailer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Retailer
              </label>
              <select
                value={selectedRetailer || ''}
                onChange={(e) => setSelectedRetailer(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a retailer</option>
                {retailers.map(retailer => (
                  <option key={retailer.id} value={retailer.id}>
                    {retailer.name} - {retailer.category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Selection */}
          {products.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Select Products ({selectedProducts.length}/{products.length})
                </label>
                <div className="space-x-2">
                  <button
                    onClick={selectAllProducts}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllProducts}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                {products.map(product => (
                  <label key={product.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleProductSelection(product.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.category} • ₹{product.price}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={createAssortmentPlan}
              disabled={loading || !selectedBrand || !selectedRetailer || selectedProducts.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating Plan...' : 'Create Assortment Plan'}
            </button>
            
            <button
              onClick={optimizeAssortment}
              disabled={loading || !selectedBrand || !selectedRetailer}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Optimizing...' : 'Optimize Assortment'}
            </button>
          </div>
        </div>

        {/* Optimization Parameters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Optimization Parameters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Score
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={optimizationParams.targetScore}
                onChange={(e) => setOptimizationParams(prev => ({ ...prev, targetScore: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max SKUs
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={optimizationParams.maxSkus}
                onChange={(e) => setOptimizationParams(prev => ({ ...prev, maxSkus: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Assortment Plan Results */}
        {assortmentPlan && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Assortment Plan Results</h3>
              <p className="text-sm text-gray-600 mt-1">
                {assortmentPlan.retailerName} • Overall Score: {assortmentPlan.overallScore}
              </p>
            </div>
            
            <div className="p-6">
              {/* Summary Stats */}
              {assortmentPlan.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {assortmentPlan.summary.stronglyRecommended}
                    </div>
                    <div className="text-sm text-gray-600">Strongly Recommended</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {assortmentPlan.summary.recommended}
                    </div>
                    <div className="text-sm text-gray-600">Recommended</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {assortmentPlan.summary.consider}
                    </div>
                    <div className="text-sm text-gray-600">Consider</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {assortmentPlan.summary.notRecommended}
                    </div>
                    <div className="text-sm text-gray-600">Not Recommended</div>
                  </div>
                </div>
              )}

              {/* SKU Details Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fit Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recommendation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assortmentPlan.skus?.map((sku) => (
                      <tr key={sku.skuId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {sku.skuName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {sku.skuCategory} / {sku.skuSubcategory}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ₹{sku.skuPrice}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-lg font-semibold ${getScoreColor(sku.fitScore)}`}>
                            {sku.fitScore}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {sku.recommendation?.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(sku.recommendation?.confidence)}`}>
                            {sku.recommendation?.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssortmentPlanner; 