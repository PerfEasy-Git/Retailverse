import api from './api';

const brandService = {
  // Register a new brand
  register: async (brandData) => {
    const response = await api.post('/brands/register', brandData);
    return response.data;
  },

  // Setup brand profile with categories
  setupProfile: async (brandId, profileData) => {
    const response = await api.post(`/brands/${brandId}/profile-setup`, profileData);
    return response.data;
  },

  // Get brand profile
  getProfile: async () => {
    const response = await api.get('/brands/profile/me');
    return response.data;
  },

  // Get brand matches
  getMatches: async () => {
    const response = await api.get('/brands/matches');
    return response.data;
  },

  // Get brand by ID
  getById: async (brandId) => {
    const response = await api.get(`/brands/${brandId}`);
    return response.data;
  },

  // Get user's brands
  getMyBrands: async () => {
    const response = await api.get('/brands/my-brands');
    return response.data;
  }
};

export default brandService; 