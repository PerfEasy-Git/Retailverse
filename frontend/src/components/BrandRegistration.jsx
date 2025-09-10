import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import brandService from '../services/brandService';

const BrandRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [formData, setFormData] = useState({
    brand_name: '',
    poc_name: '',
    designation: '',
    official_email: '',
    website_url: '',
    contact_number: '',
    annual_turnover: '',
    trade_margin: ''
  });

  // Personal email providers to block
  const PERSONAL_EMAIL_PROVIDERS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 'tutanota.com',
    'yandex.com', 'zoho.com', 'fastmail.com', 'gmx.com', 'rediffmail.com',
    'sify.com', 'indiatimes.com', 'timesgroup.com', 'hindustantimes.com'
  ];

  // Validate official email
  const validateOfficialEmail = (email) => {
    if (!email) return '';
    
    const emailLower = email.toLowerCase();
    const domain = emailLower.split('@')[1];
    
    // Check if it's a personal email provider
    if (PERSONAL_EMAIL_PROVIDERS.includes(domain)) {
      return 'Personal email addresses are not allowed. Please use your company email address.';
    }
    
    // Check for common personal email patterns
    const personalPatterns = [
      /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|hotmail|outlook|live|aol|icloud|mail|protonmail|tutanota|yandex|zoho|fastmail|gmx|rediffmail|sify|indiatimes|timesgroup|hindustantimes)\./i
    ];
    
    for (const pattern of personalPatterns) {
      if (pattern.test(emailLower)) {
        return 'Personal email addresses are not allowed. Please use your company email address.';
      }
    }
    
    return '';
  };

  // Validate website URL
  const validateWebsiteUrl = (url) => {
    if (!url) return ''; // Optional field
    
    // Allow URLs without protocol
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    
    if (!urlPattern.test(url)) {
      return 'Please enter a valid website URL';
    }
    
    return '';
  };

  // Validate contact number
  const validateContactNumber = (phone) => {
    if (!phone) return ''; // Optional field
    
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
    const indianMobilePattern = /^[6-9]\d{9}$/;
    
    // Check if it's a valid Indian landline number (with STD code, 10-12 digits total)
    const indianLandlinePattern = /^[0-9]{10,12}$/;
    
    // Check if it's a valid international number (7-15 digits)
    const internationalPattern = /^[+]?[0-9]{7,15}$/;
    
    if (!indianMobilePattern.test(cleanPhone) && 
        !indianLandlinePattern.test(cleanPhone) && 
        !internationalPattern.test(phone)) {
      return 'Please enter a valid contact number (10-15 digits)';
    }
    
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Validate email in real-time
    if (name === 'official_email') {
      const emailError = validateOfficialEmail(value);
      setEmailError(emailError);
    }
    
    // Validate URL in real-time
    if (name === 'website_url') {
      const urlError = validateWebsiteUrl(value);
      setUrlError(urlError);
    }
    
    // Validate phone number in real-time
    if (name === 'contact_number') {
      const phoneError = validateContactNumber(value);
      setPhoneError(phoneError);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for validation errors
    if (emailError || urlError || phoneError) {
      setError('Please fix the validation errors before submitting.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await brandService.register(formData);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Complete Your Brand Profile</h2>
      <p className="text-gray-600 mb-6">Please provide your brand details to complete your registration.</p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Brand Name *</label>
          <input
            type="text"
            name="brand_name"
            value={formData.brand_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your brand name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Point of Contact Name *</label>
          <input
            type="text"
            name="poc_name"
            value={formData.poc_name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter point of contact name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Designation *</label>
          <input
            type="text"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter designation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Official Email ID *</label>
          <input
            type="email"
            name="official_email"
            value={formData.official_email}
            onChange={handleChange}
            required
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              emailError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your company email address"
          />
          {emailError && (
            <p className="text-red-500 text-sm mt-1">{emailError}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Personal email addresses (Gmail, Yahoo, etc.) are not allowed. Please use your company email.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Website URL</label>
          <input
            type="text"
            name="website_url"
            value={formData.website_url}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              urlError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="www.your-website.com"
          />
          {urlError && (
            <p className="text-red-500 text-sm mt-1">{urlError}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Enter your website URL (e.g., www.yourcompany.com)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contact Number</label>
          <input
            type="tel"
            name="contact_number"
            value={formData.contact_number}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              phoneError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter contact number"
            maxLength="15"
          />
          {phoneError && (
            <p className="text-red-500 text-sm mt-1">{phoneError}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Enter a valid phone number (10-15 digits, e.g., 9876543210)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Annual Turnover *</label>
          <select
            name="annual_turnover"
            value={formData.annual_turnover}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Annual Turnover</option>
            <option value="equal to less than 1cr">equal to less than 1cr</option>
            <option value="1cr-10cr">1cr-10cr</option>
            <option value="10cr-50cr">10cr-50cr</option>
            <option value="50Cr-250Cr">50Cr-250Cr</option>
            <option value="more than 250Cr">more than 250Cr</option>
          </select>
          <p className="text-gray-500 text-xs mt-1">
            Select your annual turnover range
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Average Trade Margin *</label>
          <select
            name="trade_margin"
            value={formData.trade_margin}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Trade Margin</option>
            <option value="20-25">20-25</option>
            <option value="25-30">25-30</option>
            <option value="30 and above">30 and above</option>
          </select>
          <p className="text-gray-500 text-xs mt-1">
            Select your average trade margin range
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Completing...' : 'Complete Brand Profile'}
        </button>
      </form>
    </div>
  );
};

export default BrandRegistration; 