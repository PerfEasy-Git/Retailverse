import api from './api';

const productService = {
  // Create a single product
  create: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  // Get products by brand
  getByBrand: async (brandId) => {
    const response = await api.get(`/products?brandId=${brandId}`);
    return response.data;
  },

  // Get product by ID
  getById: async (productId) => {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  },

  // Update product
  update: async (productId, productData) => {
    const response = await api.put(`/products/${productId}`, productData);
    return response.data;
  },

  // Delete product
  delete: async (productId) => {
    const response = await api.delete(`/products/${productId}`);
    return response.data;
  },

  // Upload Excel file
  uploadExcel: async (formData) => {
    const response = await api.post('/products/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Bulk create products
  bulkCreate: async (productsData) => {
    const response = await api.post('/products/bulk', productsData);
    return response.data;
  }
};

export default productService; 