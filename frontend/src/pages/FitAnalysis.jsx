import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Calculator,
  Filter
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const FitAnalysis = () => {
  const { user } = useAuth();
  const [fitScores, setFitScores] = useState([]);
  const [calculationSummary, setCalculationSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [brandProfile, setBrandProfile] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  useEffect(() => {
    loadBrandProfile();
    loadAvailableCategories();
  }, []);

  const loadBrandProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/brands/profile');
      setBrandProfile(response.data.data);
      setError(null);
    } catch (error) {
      console.error('Error loading brand profile:', error);
      if (error.response?.status === 404) {
        setError('Brand profile not found. Please create a brand profile first.');
      } else {
        setError('Failed to load brand profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCategories = async () => {
    try {
      const response = await api.get('/categories');
      setAvailableCategories(response.data.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const calculateFitScores = async () => {
    if (!brandProfile || selectedCategories.length === 0) {
      setError('Please select at least one category and subcategory');
      return;
    }
    
    try {
      setCalculating(true);
      setError(null);
      
      const response = await api.post('/fit-scores/calculate', {
        selected_categories: selectedCategories
      });
      
      setFitScores(response.data.data.retailers);
      setCalculationSummary(response.data.data.calculation_summary);
      
    } catch (error) {
      console.error('Error calculating fit scores:', error);
      setError('Failed to calculate fit scores');
    } finally {
      setCalculating(false);
    }
  };

  const calculateBulkScores = async () => {
    if (!brandProfile) return;
    
    try {
      setCalculating(true);
      setError(null);
      
      const response = await api.post('/fit-scores/bulk-calculate', { 
        brandId: brandProfile.id 
      });
      
      setFitScores(response.data.data.retailers);
      setCalculationSummary(response.data.data.calculation_summary);
      
    } catch (error) {
      console.error('Error calculating bulk scores:', error);
      setError('Failed to calculate fit scores');
    } finally {
      setCalculating(false);
    }
  };

  const handleCategoryToggle = (category, subcategory) => {
    setSelectedCategories(prev => {
      const existing = prev.find(cat => cat.category === category);
      if (existing) {
        const updatedSubcategories = existing.sub_categories.includes(subcategory)
          ? existing.sub_categories.filter(sub => sub !== subcategory)
          : [...existing.sub_categories, subcategory];
        
        if (updatedSubcategories.length === 0) {
          return prev.filter(cat => cat.category !== category);
        } else {
          return prev.map(cat => 
            cat.category === category 
              ? { ...cat, sub_categories: updatedSubcategories }
              : cat
          );
        }
      } else {
        return [...prev, { category, sub_categories: [subcategory] }];
      }
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const chartData = {
    labels: fitScores.map(fs => fs.retailer_name),
    datasets: [
      {
        label: 'Fit Score',
        data: fitScores.map(fs => fs.fit_score),
        backgroundColor: fitScores.map(fs => 
          fs.fit_score >= 80 ? 'rgba(34, 197, 94, 0.8)' :
          fs.fit_score >= 60 ? 'rgba(234, 179, 8, 0.8)' :
          'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: fitScores.map(fs => 
          fs.fit_score >= 80 ? 'rgb(34, 197, 94)' :
          fs.fit_score >= 60 ? 'rgb(234, 179, 8)' :
          'rgb(239, 68, 68)'
        ),
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Retailer Fit Scores',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  const gtmDistribution = {
    labels: ['High Priority', 'Medium Priority', 'Low Priority'],
    datasets: [
      {
        data: [
          calculationSummary?.high_priority || 0,
          calculationSummary?.medium_priority || 0,
          calculationSummary?.low_priority || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(234, 179, 8)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fit analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">FIT Score Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyze brand-retailer compatibility and get GTM recommendations
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                {error.includes('Brand profile not found') && (
                  <div className="mt-4">
                    <a
                      href="/brand/profile"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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

      {/* Brand Profile Info */}
      {brandProfile && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Brand Profile: {brandProfile.brand_name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Average Trade Margin</dt>
                <dd className="mt-1 text-sm text-gray-900">{brandProfile.avg_trade_margin || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Annual Turnover</dt>
                <dd className="mt-1 text-sm text-gray-900">{brandProfile.annual_turnover || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {brandProfile.website_url ? (
                    <a href={brandProfile.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
                      {brandProfile.website_url}
                    </a>
                  ) : 'Not set'}
                </dd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Selection */}
      {brandProfile && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Select Categories for FIT Score Calculation
              </h3>
              <button
                onClick={() => setShowCategorySelector(!showCategorySelector)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showCategorySelector ? 'Hide' : 'Show'} Categories
              </button>
            </div>

            {showCategorySelector && (
              <div className="space-y-4">
                {availableCategories.map((category) => (
                  <div key={category.category} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">{category.category}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {category.subcategories.map((subcategory) => {
                        const isSelected = selectedCategories.some(
                          cat => cat.category === category.category && cat.sub_categories.includes(subcategory)
                        );
                        return (
                          <button
                            key={subcategory}
                            onClick={() => handleCategoryToggle(category.category, subcategory)}
                            className={`px-3 py-2 text-sm rounded-md border ${
                              isSelected
                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {subcategory}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Categories Summary */}
            {selectedCategories.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Categories:</h4>
                <div className="space-y-1">
                  {selectedCategories.map((cat, index) => (
                    <div key={index} className="text-sm text-blue-800">
                      <strong>{cat.category}:</strong> {cat.sub_categories.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {brandProfile && (
        <div className="flex gap-4">
          <button
            onClick={calculateFitScores}
            disabled={calculating || selectedCategories.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {calculating ? 'Calculating...' : 'Calculate FIT Scores'}
          </button>
          
          <button
            onClick={calculateBulkScores}
            disabled={calculating}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {calculating ? 'Calculating...' : 'Calculate All (Bulk)'}
          </button>
        </div>
      )}

      {/* Charts Section */}
      {fitScores.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">FIT Score Distribution</h3>
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Priority Distribution</h3>
              <Doughnut data={gtmDistribution} />
            </div>
          </div>
        </div>
      )}

      {/* FIT Scores Results Table */}
      {fitScores.length > 0 && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">FIT Score Results</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retailer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      FIT Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recommendation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score Breakdown
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fitScores.map((fitScore) => (
                    <tr key={fitScore.retailer_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {fitScore.retailer_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {fitScore.retailer_category} • {fitScore.retailer_format}
                          </div>
                          <div className="text-sm text-gray-500">
                            {fitScore.outlet_count} outlets
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-2xl font-bold ${getScoreColor(fitScore.fit_score)}`}>
                          {fitScore.fit_score}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{fitScore.recommendation?.action || 'N/A'}</div>
                          {fitScore.recommendation?.notes && (
                            <div className="text-xs text-gray-500 mt-1">{fitScore.recommendation.notes}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(fitScore.recommendation?.priority)}`}>
                          {fitScore.recommendation?.priority || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {fitScore.score_breakdown && (
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span>Category:</span>
                                <span className="font-medium">{fitScore.score_breakdown.category_score}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Subcategory:</span>
                                <span className="font-medium">{fitScore.score_breakdown.subcategory_score}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Margin:</span>
                                <span className="font-medium">{fitScore.score_breakdown.margin_score}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>ASP:</span>
                                <span className="font-medium">{fitScore.score_breakdown.asp_score}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Summary */}
      {calculationSummary && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Calculation Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {calculationSummary.total_retailers}
                </div>
                <div className="text-sm text-gray-600">Total Retailers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {calculationSummary.high_priority}
                </div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {calculationSummary.medium_priority}
                </div>
                <div className="text-sm text-gray-600">Medium Priority</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {calculationSummary.low_priority}
                </div>
                <div className="text-sm text-gray-600">Low Priority</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FitAnalysis; 