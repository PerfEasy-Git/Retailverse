import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import axios from 'axios';

const GTMStrategy = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [preferences, setPreferences] = useState({
        paymentTerm: 'OUTRIGHT',
        businessModel: 'B2C',
        nmtRmt: 'NMT'
    });
    const [gtmResults, setGtmResults] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Get FIT score results from navigation state
    const fitScoreResults = location.state?.fitScoreResults;

    // Generate GTM strategy mutation
    const generateStrategyMutation = useMutation(
        async (strategyData) => {
            const response = await axios.post('/api/gtm/generate-strategy', strategyData);
            return response.data;
        },
        {
            onSuccess: (data) => {
                setGtmResults(data);
                setIsGenerating(false);
            },
            onError: (error) => {
                console.error('GTM strategy generation error:', error);
                setIsGenerating(false);
            }
        }
    );

    // Filter retailers based on preferences
    const filteredRetailers = useMemo(() => {
        if (!fitScoreResults?.retailers) return [];
        
        // For now, return all retailers (we'll enhance this with actual filtering logic later)
        // The filtering will be done on the backend when we call the GTM API
        return fitScoreResults.retailers.map(retailer => ({
            id: retailer.retailer_id,
            name: retailer.retailer_name,
            fitScore: retailer.fit_score,
            outletCount: retailer.outlet_count || 0
        }));
    }, [fitScoreResults, preferences]);

    const handlePreferenceChange = (type, value) => {
        setPreferences(prev => ({
            ...prev,
            [type]: value
        }));
    };

    const handleGenerateStrategy = () => {
        if (!fitScoreResults) {
            alert('No FIT score data available. Please calculate FIT scores first.');
            return;
        }

        setIsGenerating(true);
        generateStrategyMutation.mutate({
            preferences,
            fitScoreResults
        });
    };

    const handleBackClick = () => {
        navigate('/discovery', { 
            state: { 
                activeTab: 'fit-scores',
                fitScoreResults 
            } 
        });
    };

    const preferenceOptions = {
        paymentTerm: ['OUTRIGHT', 'CREDIT', 'CONSIGNMENT'],
        businessModel: ['B2C', 'B2B', 'B2B2C'],
        nmtRmt: ['NMT', 'RMT', 'HYBRID']
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="px-8 py-4">
                    <div className="flex items-center">
                        <button
                            onClick={handleBackClick}
                            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="text-sm font-medium">Back to Discovery</span>
                        </button>
                        <div className="ml-8">
                            <h1 className="text-2xl font-bold text-gray-900">Go To Market Strategy</h1>
                            <p className="text-sm text-gray-600 mt-1">Generate your retail partnership strategy</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-8 py-8">
                {/* Preference Selection - Matching Existing RetailVerse Design */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">SELECT YOUR PREFERENCE</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Payment Term */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">PAYMENT TERM</label>
                            <select
                                value={preferences.paymentTerm}
                                onChange={(e) => handlePreferenceChange('paymentTerm', e.target.value)}
                                className="input w-full"
                            >
                                {preferenceOptions.paymentTerm.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        {/* Business Model */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">BUSINESS MODEL</label>
                            <select
                                value={preferences.businessModel}
                                onChange={(e) => handlePreferenceChange('businessModel', e.target.value)}
                                className="input w-full"
                            >
                                {preferenceOptions.businessModel.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        {/* NMT/RMT */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">NMT/RMT</label>
                            <select
                                value={preferences.nmtRmt}
                                onChange={(e) => handlePreferenceChange('nmtRmt', e.target.value)}
                                className="input w-full"
                            >
                                {preferenceOptions.nmtRmt.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleGenerateStrategy}
                            disabled={isGenerating}
                            className="btn-primary px-8 py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? 'GENERATING...' : 'GENERATE'}
                        </button>
                    </div>
                </div>

                {/* Retailer Results - Show by default, update when preferences change */}
                {fitScoreResults && (
                    <div className="space-y-6">
                        {/* Strategy Title */}
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {gtmResults ? 'YOUR GO TO MARKET STRATEGY' : 'RETAILER MATCH'}
                            </h2>
                        </div>

                        {/* Retailer Match Results - Matching Existing Design */}
                        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                            <div className="divide-y divide-gray-200">
                                {(gtmResults?.retailers || filteredRetailers).map((retailer, index) => (
                                    <div key={retailer.id || index} className={`flex items-center justify-between p-4 ${
                                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                    }`}>
                                        {/* Retailer Logo and Name */}
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                                index % 4 === 0 ? 'bg-red-500' :
                                                index % 4 === 1 ? 'bg-blue-500' :
                                                index % 4 === 2 ? 'bg-orange-500' :
                                                'bg-purple-500'
                                            }`}>
                                                {retailer.name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2)}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{retailer.name}</h3>
                                            </div>
                                        </div>

                                        {/* Match Score */}
                                        <div className="text-right">
                                            <div className={`text-2xl font-bold ${
                                                (retailer.matchScore || retailer.fitScore) >= 80 ? 'text-green-600' :
                                                (retailer.matchScore || retailer.fitScore) >= 60 ? 'text-yellow-600' :
                                                'text-red-600'
                                            }`}>
                                                {retailer.matchScore || retailer.fitScore}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isGenerating && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                        <p className="mt-4 text-gray-600">Generating your Go To Market Strategy...</p>
                    </div>
                )}

                {/* Error State */}
                {generateStrategyMutation.isError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800">Failed to generate GTM strategy. Please try again.</p>
                    </div>
                )}

                {/* No Data State */}
                {!fitScoreResults && (
                    <div className="text-center py-12">
                        <div className="bg-gray-50 rounded-lg p-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No FIT Score Data Available</h3>
                            <p className="text-gray-600 mb-4">Please calculate FIT scores first to use the GTM strategy feature.</p>
                            <button
                                onClick={handleBackClick}
                                className="btn-primary"
                            >
                                Go to Discovery
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GTMStrategy;
