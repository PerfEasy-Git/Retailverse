import api from './api';

const fitScoreService = {
  // Calculate fit score for a retailer
  calculate: async (retailerId) => {
    const response = await api.post('/fit-scores/calculate', { retailerId });
    return response.data;
  },

  // Get brand matches
  getBrandMatches: async () => {
    const response = await api.get('/brands/matches');
    return response.data;
  },

  // Get fit scores for a brand
  getByBrand: async (brandId) => {
    const response = await api.get(`/fit-scores/brand/${brandId}`);
    return response.data;
  },

  // Get fit scores for a retailer
  getByRetailer: async (retailerId) => {
    const response = await api.get(`/fit-scores/retailer/${retailerId}`);
    return response.data;
  },

  // Get all fit scores
  getAll: async () => {
    const response = await api.get('/fit-scores');
    return response.data;
  }
};

export default fitScoreService; 