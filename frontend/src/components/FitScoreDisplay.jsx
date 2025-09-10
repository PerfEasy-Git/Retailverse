import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import fitScoreService from '../services/fitScoreService';

const FitScoreDisplay = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const response = await fitScoreService.getBrandMatches();
      setMatches(response.matches || []);
    } catch (error) {
      setError('Failed to load matches');
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleRetailerClick = (match) => {
    setSelectedMatch(match);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Retailer Matches & Fit Scores</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading matches...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matches List */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Retailer Matches ({matches.length})</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {matches.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <p>No matches found. Complete your brand profile and add products to see matches.</p>
                  </div>
                ) : (
                  matches.map((match) => (
                    <div
                      key={match.id}
                      onClick={() => handleRetailerClick(match)}
                      className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedMatch?.id === match.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{match.retailer?.name || 'Unknown Retailer'}</h4>
                          <p className="text-sm text-gray-600">{match.retailer?.category} • {match.retailer?.region}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getScoreColor(match.score)}`}>
                            {match.score}%
                          </div>
                          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(match.recommendation?.priority)}`}>
                            {match.recommendation?.priority}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-700">{match.recommendation?.action}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Selected Retailer Details */}
          <div className="lg:col-span-1">
            {selectedMatch ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Retailer Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedMatch.retailer?.name}</h4>
                    <p className="text-sm text-gray-600">{selectedMatch.retailer?.category}</p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Fit Score</span>
                      <span className={`text-lg font-bold ${getScoreColor(selectedMatch.score)}`}>
                        {selectedMatch.score}%
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Category Match</span>
                        <span>{Math.round((selectedMatch.factors?.category_match || 0) * 100)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Subcategory Match</span>
                        <span>{Math.round((selectedMatch.factors?.subcategory_match || 0) * 100)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Trade Margin</span>
                        <span>{Math.round((selectedMatch.factors?.margin_match || 0) * 100)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>ASP Match</span>
                        <span>{Math.round((selectedMatch.factors?.asp_match || 0) * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedMatch.recommendation?.priority)}`}>
                      {selectedMatch.recommendation?.priority} Priority
                    </div>
                    <h5 className="font-medium text-gray-900 mt-2">{selectedMatch.recommendation?.action}</h5>
                    <p className="text-sm text-gray-600 mt-1">{selectedMatch.recommendation?.notes}</p>
                  </div>

                  <div className="border-t pt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Additional Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Brand ASP:</span>
                        <span>₹{selectedMatch.brand_asp || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retailer ASP:</span>
                        <span>₹{selectedMatch.retailer_asp || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subcategory Gap:</span>
                        <span>{selectedMatch.subcategory_gap || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="text-center text-gray-500">
                  <p>Select a retailer to view detailed information</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Score Legend */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Score Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium text-green-800">High Priority (≥80%)</h4>
            <p className="text-sm text-green-600">Recommend Launch in All Stores</p>
            <p className="text-xs text-green-500 mt-1">Prefer Outright if credit days < 30</p>
          </div>
          <div className="border-l-4 border-yellow-500 pl-4">
            <h4 className="font-medium text-yellow-800">Medium Priority (60-79%)</h4>
            <p className="text-sm text-yellow-600">Pilot Launch in Select Stores</p>
            <p className="text-xs text-yellow-500 mt-1">Prefer SOR if competition high</p>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="font-medium text-red-800">Low Priority (<60%)</h4>
            <p className="text-sm text-red-600">Delay Entry</p>
            <p className="text-xs text-red-500 mt-1">Suggest rework or reprice strategy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FitScoreDisplay; 