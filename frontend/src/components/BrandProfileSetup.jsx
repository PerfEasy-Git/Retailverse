import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import brandService from '../services/brandService';

const BrandProfileSetup = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Reference data from category-Subcat.txt
  const categorySubcategoryMap = {
    'Makeup': ['Face', 'Eyes', 'Lips', 'Nail'],
    'Skin': ['Moisturizers', 'Cleansers', 'Masks', 'Toners', 'Body Care', 'Eye Care', 'Lip Care', 'Sun Care'],
    'Hair': ['Hair Care'],
    'Bath & Body': ['Bath & Shower', 'Body Care', 'Shaving & Hair Removal', 'Men\'s Grooming', 'Hands & Feet', 'Hygiene Essentials', 'Oral Care'],
    'Mom & Baby': ['Baby Care', 'Maternity Care', 'Kids Care', 'Nursing & Feeding'],
    'Health & Wellness': ['Health Supplements', 'Beauty Supplements', 'Sports Nutrition', 'Weight Management', 'Health Foods']
  };

  const tradeMarginOptions = ['20-25', '25-30', '30 and above'];
  const annualTurnoverOptions = [
    'equal to less then 1cr',
    '1cr-10cr',
    '10cr-50cr',
    '50Cr-250Cr',
    'more then 250Cr'
  ];

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const categoriesData = selectedCategories.map(cat => ({
        category: cat.category,
        sub_category: cat.sub_categories.join(','),
        avg_trade_margin: cat.avg_trade_margin,
        annual_turnover: cat.annual_turnover
      }));

      await brandService.setupProfile(brandId, { categories: categoriesData });
      navigate('/brand/products');
    } catch (error) {
      setError(error.response?.data?.error || 'Profile setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Brand Profile Setup</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Select Categories & Subcategories</h3>
          <p className="text-sm text-gray-600 mb-6">Select categories and their corresponding subcategories. Each category has specific subcategories that will be available for your products.</p>
          
          {Object.entries(categorySubcategoryMap).map(([category, subcategories]) => (
            <div key={category} className="border border-gray-200 rounded-lg p-4 mb-6 hover:border-blue-300 transition-colors">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.some(cat => cat.category === category)}
                    onChange={(e) => handleCategoryChange(category, e.target.checked)}
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
                        disabled={!selectedCategories.some(cat => cat.category === category)}
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || selectedCategories.length === 0}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Setting up profile...' : 'Complete Profile Setup'}
        </button>
      </form>
    </div>
  );
};

export default BrandProfileSetup; 