import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const GTMStrategy = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [preferences, setPreferences] = useState({
        paymentTerm: 'All',
        businessModel: 'All',
        nmtRmt: 'All'
    });
    // Get FIT score results from navigation state
    const fitScoreResults = location.state?.fitScoreResults;

    // Filter retailers based on preferences and sort by FIT score (descending)        
    const filteredRetailers = useMemo(() => {
        if (!fitScoreResults?.retailers) return [];

        // Filter retailers based on preferences
        let filtered = fitScoreResults.retailers.filter(retailer => {
            // Filter by Payment Term
            if (preferences.paymentTerm !== 'All' && retailer.purchase_model !== preferences.paymentTerm) {
                return false;
            }
            
            // Filter by Business Model
            if (preferences.businessModel !== 'All' && retailer.retailer_sale_model !== preferences.businessModel) {
                return false;
            }
            
            // Filter by NMT/RMT (using retailer_category)
            if (preferences.nmtRmt !== 'All') {
                if (preferences.nmtRmt === 'NMT' && !retailer.retailer_category?.includes('NMT')) {
                    return false;
                }
                if (preferences.nmtRmt === 'RMT' && !retailer.retailer_category?.includes('RMT')) {
                    return false;
                }
                if (preferences.nmtRmt === 'HYBRID' && !retailer.retailer_category?.includes('HYBRID')) {
                    return false;
                }
            }
            
            return true;
        });

        // Map and sort by FIT score in descending order
        return filtered
            .map(retailer => ({
                id: retailer.retailer_id,
                name: retailer.retailer_name,
                fitScore: retailer.fit_score,
                outletCount: retailer.outlet_count || 0
            }))
            .sort((a, b) => b.fitScore - a.fitScore); // Sort by FIT score descending  
    }, [fitScoreResults, preferences]);

    const handlePreferenceChange = (type, value) => {
        setPreferences(prev => ({
            ...prev,
            [type]: value
        }));
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
        paymentTerm: ['All', 'OUTRIGHT', 'CREDIT', 'CONSIGNMENT'],
        businessModel: ['All', 'B2C', 'B2B', 'B2B2C'],
        nmtRmt: ['All', 'NMT', 'RMT', 'HYBRID']
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

                </div>

                {/* Retailer Results - Show by default, update when preferences change */}
                {fitScoreResults && (
                    <div className="space-y-6">
                        {/* Strategy Title */}
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900">
                                RETAILER MATCH
                            </h2>
                        </div>

                        {/* No Matches Message */}
                        {filteredRetailers.length === 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                                <div className="text-yellow-600">
                                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Retailers Match Selected Criteria</h3>
                                    <p className="text-yellow-700">Please adjust your filter preferences to see matching retailers.</p>
                                </div>
                            </div>
                        )}

                        {/* Retailer Match Results - Matching Existing Design */}      
                        {filteredRetailers.length > 0 && (
                            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                                <div className="divide-y divide-gray-200">
                                    {filteredRetailers.map((retailer, index) => (
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
                        )}
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
