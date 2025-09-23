import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import api from '../services/api';

const RetailerDetails = () => {
  const { retailerId } = useParams();
  const navigate = useNavigate();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fetch retailer details from API
  const { data: retailerResponse, isLoading, error } = useQuery(
    ['retailerDetails', retailerId],
    async () => {
      const response = await api.get(`/retailers/${retailerId}/details`);
      return response.data;
    },
    {
      enabled: !!retailerId,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  const retailerData = retailerResponse?.data;

  const handleBackClick = () => {
    navigate('/discovery');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading retailer details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !retailerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Retailer Not Found</h2>
          <p className="text-gray-600 mb-4">The retailer you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={handleBackClick}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Discovery
          </button>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % retailerData.inStoreImages.length);
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + retailerData.inStoreImages.length) % retailerData.inStoreImages.length);
  };

  // Professional pie chart component
  const PieChart = ({ data, title }) => {
    let cumulativePercentage = 0;
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
        </div>
        
        <div className="relative w-64 h-64 mx-auto mb-8">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {data.map((item, index) => {
              const startAngle = cumulativePercentage * 3.6; // Convert percentage to degrees
              const endAngle = (cumulativePercentage + item.percentage) * 3.6;
              const largeArcFlag = item.percentage > 50 ? 1 : 0;
              
              const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
              
              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              cumulativePercentage += item.percentage;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={item.color}
                  stroke="white"
                  strokeWidth="2"
                  className="hover:opacity-80 transition-opacity duration-200"
                />
              );
            })}
          </svg>
        </div>
        
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-4 shadow-sm" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-gray-700 font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-900 text-lg">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Clean Enterprise Header */}
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
              <h1 className="text-2xl font-bold text-gray-900">Retailer Analysis</h1>
              <p className="text-sm text-gray-600 mt-1">Comprehensive insights and market data</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen">
        {/* Left Sidebar - Retailer Profile */}
        <div className="w-80 bg-gradient-to-br from-purple-600 to-purple-700 flex-shrink-0 p-8 text-white">
          <div className="flex items-center mb-10">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <span className="text-purple-600 font-bold text-xl">
                {retailerData.name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2)}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{retailerData.name}</h2>
              <p className="text-purple-100 text-sm">Retail Partner Profile</p>
            </div>
          </div>
          
          <div className="space-y-5">
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-purple-100 text-sm font-medium">CHAIN TYPE</span>
                <span className="font-bold text-lg">{retailerData.chainType}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-purple-100 text-sm font-medium">STORE COUNT</span>
                <span className="font-bold text-lg">{retailerData.storeCount}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-purple-100 text-sm font-medium">BUSINESS MODEL</span>
                <span className="font-bold text-lg">{retailerData.businessModel}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-purple-100 text-sm font-medium">FORMAT</span>
                <span className="font-bold text-lg">{retailerData.format}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-purple-100 text-sm font-medium">PAYMENT TERM</span>
                <span className="font-bold text-lg">{retailerData.paymentTerm}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-purple-100 text-sm font-medium">PAYMENT TIME</span>
                <span className="font-bold text-lg">{retailerData.paymentTime}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-purple-100 text-sm font-medium">STATE PRESENCE</span>
                <span className="font-bold text-lg">{retailerData.statePresence}</span>
              </div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-purple-100 text-sm font-medium">CITY PRESENCE</span>
                <span className="font-bold text-lg">{retailerData.cityPresence}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
            {/* Match Score Banner */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Partnership Compatibility Analysis
                </h2>
                <div className="text-xl text-gray-700 leading-relaxed">
                  Match Score with <span className="font-semibold text-gray-900">{retailerData.name}</span> is{' '}
                  <span className="text-orange-500 text-4xl font-bold">{retailerData.matchScore}%</span>
                </div>
                <div className="text-lg text-gray-600 mt-4">
                  Category Market Size: <span className="font-semibold text-gray-900">{retailerData.categorySize}</span> • 
                  Market Share: <span className="font-semibold text-gray-900">{retailerData.categoryPercentage}</span>
                </div>
              </div>
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <PieChart data={retailerData.subCategoryShare} title="SUBCATEGORY DISTRIBUTION" />
              <PieChart data={retailerData.brandShare} title="BRAND MARKET SHARE" />
            </div>

            {/* Store Layout Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Store Layout Analysis</h3>
                <p className="text-gray-600">Visual representation of product placement and store environment</p>
              </div>
              
              <div className="relative">
                <div className="flex items-center justify-center">
                  <button
                    onClick={prevImage}
                    className="absolute left-0 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 border border-gray-200"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="flex space-x-6 overflow-hidden max-w-5xl">
                    {retailerData.inStoreImages.map((image, index) => (
                      <div
                        key={index}
                        className={`flex-shrink-0 w-96 h-64 rounded-xl overflow-hidden transition-all duration-300 border-2 ${
                          index === activeImageIndex ? 'border-blue-500 shadow-lg' : 'border-gray-200 opacity-70'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Store layout ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={nextImage}
                    className="absolute right-0 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 border border-gray-200"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                {/* Image indicators */}
                <div className="flex justify-center mt-6 space-x-3">
                  {retailerData.inStoreImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        index === activeImageIndex ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailerDetails;
