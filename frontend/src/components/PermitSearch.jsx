import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../lib/ApiService';

const PermitSearch = () => {
  const navigate = useNavigate();
  
  // BC Cities - Organized by region for API integration priority
  const bcCities = [
    // Lower Mainland (Priority 1)
    'Vancouver',
    'Burnaby', 
    'Surrey',
    'Richmond',
    'Coquitlam',
    'North Vancouver',
    'North Vancouver District',
    'West Vancouver',
    'New Westminster',
    'Port Coquitlam',
    'Port Moody',
    'Delta',
    'Langley',
    'Maple Ridge',
    'Pitt Meadows',
    'White Rock',
    
    // Fraser Valley (Priority 2)
    'Abbotsford',
    'Chilliwack',
    'Mission',
    'Harrison Hot Springs',
    'Kent',
    'Agassiz',
    'Hope',
    
    // Vancouver Island
    'Victoria',
    'Saanich',
    'Nanaimo',
    'Courtenay',
    'Campbell River',
    'Duncan',
    'Parksville',
    'Port Alberni',
    'Esquimalt',
    'Oak Bay',
    'Sidney',
    'Sooke',
    
    // Interior BC
    'Kelowna',
    'Kamloops',
    'Prince George',
    'Vernon',
    'Penticton',
    'Cranbrook',
    'Nelson',
    'Trail',
    'Castlegar',
    'Revelstoke',
    'Salmon Arm',
    'Williams Lake',
    'Quesnel',
    'Merritt',
    
    // Northern BC
    'Fort St. John',
    'Dawson Creek',
    'Terrace',
    'Smithers',
    'Fort St. James',
    'Prince Rupert',
    
    // Other
    'Powell River',
    'Squamish',
    'Whistler',
    'Invermere',
    'Fernie',
    'Golden'
  ];

  const [selectedCity, setSelectedCity] = useState('Vancouver');
  const [filters, setFilters] = useState({
    geographic_area: '',
    work_type: '',
    property_use: '',
    specific_use: '',
    year: ''
  });
  
  const [filterOptions, setFilterOptions] = useState({
    geographic_areas: [],
    work_types: [],
    property_uses: [],
    specific_uses: [],
    years: []
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(25);
  const [displayedPermits, setDisplayedPermits] = useState([]);

  // Surrey data state
  const [surreyData, setSurreyData] = useState(null);
  const [surreyLoading, setSurreyLoading] = useState(false);
  const [surreyError, setSurreyError] = useState(null);

  // Inline SVG Icons
  const SearchIcon = ({ className = "", size = 16 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
  );

  const FilterIcon = ({ className = "", size = 16 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
    </svg>
  );

  const MapPinIcon = ({ className = "", size = 16 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  );

  const BuildingIcon = ({ className = "", size = 16 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path>
      <path d="M6 12h4"></path>
      <path d="M6 16h4"></path>
      <path d="M16 12h2"></path>
      <path d="M16 16h2"></path>
    </svg>
  );

  const ArrowLeftIcon = ({ className = "", size = 16 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 19-7-7 7-7"></path>
      <path d="M19 12H5"></path>
    </svg>
  );

  const ChevronLeftIcon = ({ className = "", size = 16 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6"></path>
    </svg>
  );

  const ChevronRightIcon = ({ className = "", size = 16 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6"></path>
    </svg>
  );

  // V2.1 API: Helper function to safely extract field values from nested structure
  const getFieldValue = useCallback((permit, fieldName, defaultValue = 'N/A') => {
    try {
      // Handle both v1.0 format (direct fields) and v2.1 format (nested fields)
      if (permit.fields && permit.fields[fieldName] !== undefined) {
        return permit.fields[fieldName];
      }
      if (permit[fieldName] !== undefined) {
        return permit[fieldName];
      }
      return defaultValue;
    } catch (error) {
      console.warn(`Error extracting field ${fieldName}:`, error);
      return defaultValue;
    }
  }, []);

  // V2.1 API: Enhanced permit data processing
  const processPermitData = useCallback((rawPermits) => {
    if (!Array.isArray(rawPermits)) {
      console.warn('Invalid permits data format:', rawPermits);
      return [];
    }

    return rawPermits.map((permit, index) => {
      try {
        // V2.1 API response structure handling
        const processedPermit = {
          id: permit.id || permit.recordid || index,
          permitnumber: getFieldValue(permit, 'permitnumber') || getFieldValue(permit, 'permit_number'),
          street: getFieldValue(permit, 'street') || getFieldValue(permit, 'address'),
          propertyuse: getFieldValue(permit, 'propertyuse') || getFieldValue(permit, 'property_use'),
          typeofwork: getFieldValue(permit, 'typeofwork') || getFieldValue(permit, 'type_of_work'),
          issueddate: getFieldValue(permit, 'issueddate') || getFieldValue(permit, 'issued_date'),
          projectvalue: getFieldValue(permit, 'projectvalue') || getFieldValue(permit, 'project_value'),
          applicant: getFieldValue(permit, 'applicant') || getFieldValue(permit, 'applicant_name'),
          applicantaddress: getFieldValue(permit, 'applicantaddress') || getFieldValue(permit, 'applicant_address'),
          geographicarea: getFieldValue(permit, 'geographicarea') || getFieldValue(permit, 'geographic_area'),
          specificuse: getFieldValue(permit, 'specificuse') || getFieldValue(permit, 'specific_use'),
          // Additional fields for enhanced functionality
          description: getFieldValue(permit, 'description') || getFieldValue(permit, 'project_description'),
          buildingcontractor: getFieldValue(permit, 'buildingcontractor') || getFieldValue(permit, 'building_contractor'),
          yearissued: getFieldValue(permit, 'yearissued') || getFieldValue(permit, 'year_issued'),
          // Raw data for debugging
          _raw: permit
        };

        // Convert project value to number if it's a string
        if (typeof processedPermit.projectvalue === 'string') {
          const numValue = parseFloat(processedPermit.projectvalue.replace(/[^0-9.-]/g, ''));
          processedPermit.projectvalue = isNaN(numValue) ? null : numValue;
        }

        return processedPermit;
      } catch (error) {
        console.error('Error processing permit:', permit, error);
        return {
          id: index,
          permitnumber: 'Error',
          street: 'Error processing permit data',
          propertyuse: 'N/A',
          typeofwork: 'N/A',
          issueddate: null,
          projectvalue: null,
          applicant: 'N/A',
          applicantaddress: 'N/A',
          _raw: permit
        };
      }
    });
  }, [getFieldValue]);

  // Enhanced filter loading with error handling and caching
  const loadFilterOptions = useCallback(async () => {
    try {
      setFiltersLoading(true);
      setError('');
      
      console.log('DEBUG: Loading Vancouver filters (v2.1)...');
      const response = await apiService.getVancouverFilters();
      console.log('DEBUG: Filter options received:', response);
      
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid filter response format');
      }
      
      setFilterOptions({
        geographic_areas: Array.isArray(response.geographic_areas) ? response.geographic_areas : [],
        work_types: Array.isArray(response.work_types) ? response.work_types : [],
        property_uses: Array.isArray(response.property_uses) ? response.property_uses : [],
        specific_uses: Array.isArray(response.specific_uses) ? response.specific_uses : [],
        years: Array.isArray(response.years) ? response.years : []
      });
      
      console.log('DEBUG: Filter options processed successfully');
    } catch (error) {
      console.error('Failed to load filter options:', error);
      setError(`Failed to load filter options: ${error.message}`);
      // Set empty arrays as fallback
      setFilterOptions({
        geographic_areas: [],
        work_types: [],
        property_uses: [],
        specific_uses: [],
        years: []
      });
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCity === 'Vancouver') {
      loadFilterOptions();
    } else if (selectedCity === 'Surrey') {
      fetchSurreyData();
    } else {
      setFiltersLoading(false);
    }
  }, [selectedCity, loadFilterOptions]);

  // Update displayed permits when permits or pagination changes
  useEffect(() => {
    updateDisplayedPermits();
  }, [permits, currentPage, resultsPerPage]);

  const fetchSurreyData = async () => {
    setSurreyLoading(true);
    setSurreyError(null);
    try {
      setSurreyData({
        message: "Surrey provides building permit summary data (monthly totals and statistics) rather than individual permit records.",
        dataSource: "https://cosmos.surrey.ca/geo_ref/Images/OpenDataArchives/JSON_Monthly/",
        format: "Monthly ZIP files containing JSON summaries",
        note: "Individual permit search requires different integration approach"
      });
    } catch (err) {
      console.error("Failed to fetch Surrey data:", err);
      setSurreyError("Failed to load Surrey permit data. Please try again later.");
    } finally {
      setSurreyLoading(false);
    }
  };

  // Enhanced search with better error handling and validation
  const handleSearch = async () => {
    try {
      setLoading(true);
      setError('');
      setCurrentPage(1); // Reset to first page on new search
      
      // Only Vancouver has API integration for now
      if (selectedCity !== 'Vancouver') {
        setError(`${selectedCity} permit search is not yet available. API integration coming soon!`);
        setPermits([]);
        setTotalResults(0);
        setLoading(false);
        return;
      }
      
      // Input validation
      if (searchTerm && searchTerm.length < 2) {
        setError('Search term must be at least 2 characters long');
        setLoading(false);
        return;
      }
      
      const searchParams = {};
      
      // Add search term with validation
      if (searchTerm && searchTerm.trim()) {
        searchParams.search = searchTerm.trim();
      }
      
      // Add filters with validation
      if (filters.geographic_area) searchParams.geographic_area = filters.geographic_area;
      if (filters.work_type) searchParams.work_type = filters.work_type;
      if (filters.property_use) searchParams.property_use = filters.property_use;
      if (filters.specific_use) searchParams.specific_use = filters.specific_use;
      if (filters.year) {
        const year = parseInt(filters.year);
        if (year >= 2020 && year <= 2030) {
          searchParams.year = year;
        }
      }
      
      console.log('DEBUG: Search params (v2.1):', searchParams);
      
      const response = await apiService.searchVancouverPermits(searchParams);
      console.log('DEBUG: Search response (v2.1):', response);
      
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid search response format');
      }
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Process permit data for v2.1 compatibility
      const processedPermits = processPermitData(response.permits || []);
      
      setPermits(processedPermits);
      setTotalResults(response.total_count || processedPermits.length);
      
      console.log('DEBUG: Processed permits:', processedPermits.length);
    } catch (error) {
      console.error('Search failed:', error);
      setError(`Search failed: ${error.message}`);
      setPermits([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const updateDisplayedPermits = () => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    setDisplayedPermits(permits.slice(startIndex, endIndex));
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      geographic_area: '',
      work_type: '',
      property_use: '',
      specific_use: '',
      year: ''
    });
    setSearchTerm('');
    setPermits([]);
    setTotalResults(0);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of results
    document.querySelector('.results-container')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleResultsPerPageChange = (newResultsPerPage) => {
    setResultsPerPage(newResultsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Enhanced date formatting with better error handling
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if not a valid date
      }
      return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    } catch {
      return dateString;
    }
  };

  // Enhanced value formatting
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'number' && !isNaN(value)) {
      return `$${value.toLocaleString()}`;
    }
    if (typeof value === 'string' && value.match(/^\d+(\.\d{2})?$/)) {
      return `$${parseFloat(value).toLocaleString()}`;
    }
    return value;
  };

  // Pagination calculations
  const totalPages = Math.ceil(permits.length / resultsPerPage);
  const startResult = permits.length > 0 ? (currentPage - 1) * resultsPerPage + 1 : 0;
  const endResult = Math.min(currentPage * resultsPerPage, permits.length);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (filtersLoading && selectedCity === 'Vancouver') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{selectedCity} Permits Search</h1>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{selectedCity} Permits Search</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {totalResults > 0 && `${totalResults.toLocaleString()} permits available`}
          </div>
          <div className="flex items-center space-x-2">
            <MapPinIcon className="h-4 w-4 text-gray-500" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {bcCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Surrey Information Section */}
      {selectedCity === 'Surrey' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <BuildingIcon className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-medium text-gray-900">Searching: {selectedCity}</span>
            </div>
            <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
              API Integration: Partial (Surrey provides summary data)
            </div>
          </div>
          
          {surreyLoading && <p className="text-blue-500 mt-4">Loading Surrey permit data...</p>}
          {surreyError && <p className="text-red-500 mt-4">{surreyError}</p>}
          {!surreyLoading && !surreyError && surreyData && (
            <div className="mt-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h3 className="text-lg font-semibold mb-2">Surrey Building Permits Data</h3>
                <p className="text-gray-700 mb-2">{surreyData.message}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p><span className="font-medium">Data Source:</span> {surreyData.dataSource}</p>
                  <p><span className="font-medium">Format:</span> {surreyData.format}</p>
                  <p><span className="font-medium">Note:</span> {surreyData.note}</p>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Available Data:</strong> Monthly permit totals, dwelling counts, permit values, and statistical summaries.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vancouver Search Interface */}
      {selectedCity === 'Vancouver' && (
        <>
          {/* Search and Filters */}
          <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
            {/* City Info */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <BuildingIcon className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-medium text-gray-900">Searching: {selectedCity}</span>
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                API Integration: Active (v2.1)
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search permits by address, applicant, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Geographic Area
                </label>
                <select
                  value={filters.geographic_area}
                  onChange={(e) => handleFilterChange('geographic_area', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Areas</option>
                  {(filterOptions.geographic_areas || []).map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type of Work
                </label>
                <select
                  value={filters.work_type}
                  onChange={(e) => handleFilterChange('work_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {(filterOptions.work_types || []).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Use
                </label>
                <select
                  value={filters.property_use}
                  onChange={(e) => handleFilterChange('property_use', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Uses</option>
                  {(filterOptions.property_uses || []).map((use) => (
                    <option key={use} value={use}>
                      {use}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specific Use
                </label>
                <select
                  value={filters.specific_use}
                  onChange={(e) => handleFilterChange('specific_use', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Specific Uses</option>
                  {(filterOptions.specific_uses || []).map((use) => (
                    <option key={use} value={use}>
                      {use}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Year
                </label>
                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Years</option>
                  {(filterOptions.years || []).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear all filters
              </button>
              <div className="flex items-center text-sm text-gray-500">
                <FilterIcon className="h-4 w-4 mr-1" />
                {Object.values(filters).filter(Boolean).length} filters applied
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Results */}
          {permits.length > 0 && (
            <div className="results-container bg-white rounded-lg shadow-sm border">
              {/* Results Header with Pagination Controls */}
              <div className="p-6 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Search Results (Vancouver API v2.1)
                    </h2>
                    <p className="text-sm text-gray-600">
                      Showing {startResult}-{endResult} of {permits.length} results 
                      {totalResults > permits.length && ` (${totalResults.toLocaleString()} total available)`}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Show:</label>
                      <select
                        value={resultsPerPage}
                        onChange={(e) => handleResultsPerPageChange(Number(e.target.value))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-20 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permit Number
                      </th>
                      <th className="w-32 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="w-24 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property Use
                      </th>
                      <th className="w-24 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type of Work
                      </th>
                      <th className="w-20 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issue Date
                      </th>
                      <th className="w-20 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project Value
                      </th>
                      <th className="w-28 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applicant
                      </th>
                      <th className="w-28 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applicant Address
                      </th>
                      <th className="w-20 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedPermits.map((permit, index) => (
                      <tr key={permit.id || index} className="hover:bg-gray-50">
                        <td className="px-2 py-3 text-xs font-medium text-gray-900 break-words">
                          {permit.permitnumber}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900 break-words">
                          {permit.street}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900 break-words">
                          {permit.propertyuse}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900 break-words">
                          {permit.typeofwork}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900 break-words">
                          {formatDate(permit.issueddate)}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900 break-words">
                          {formatValue(permit.projectvalue)}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900 break-words">
                          {permit.applicant}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900 break-words">
                          {permit.applicantaddress}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          <button
                            onClick={() => {
                              const applicantName = permit.applicant || '';
                              const address = permit.street || '';
                              const city = 'Vancouver BC';
                              
                              // Create search queries
                              const googleQuery = `${applicantName} ${city}`;
                              const yellowPagesQuery = `${applicantName} ${city}`;
                              const linkedinQuery = `${applicantName} ${city}`;
                              const canada411Query = `${applicantName} ${city}`;
                              
                              // Open multiple search tabs
                              const searches = [
                                `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`,
                                `https://www.yellowpages.ca/search/si/1/${encodeURIComponent(yellowPagesQuery)}`,
                                `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(linkedinQuery)}`,
                                `https://www.canada411.ca/search/?stype=si&what=${encodeURIComponent(canada411Query)}`
                              ];
                              
                              searches.forEach(url => {
                                window.open(url, '_blank');
                              });
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-1 py-1 rounded transition-colors duration-200"
                            title="Find contact information"
                          >
                            Find
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </button>
                      
                      {getPageNumbers().map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 border rounded text-sm ${
                            currentPage === page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Other Cities */}
      {selectedCity !== 'Vancouver' && selectedCity !== 'Surrey' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <BuildingIcon className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-medium text-gray-900">Searching: {selectedCity}</span>
            </div>
            <div className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
              API Integration Pending
            </div>
          </div>
          <div className="mt-4">
            <p className="text-gray-600">
              We're working on integrating {selectedCity}'s permit system. 
              Check back soon for updates!
            </p>
            <div className="mt-3 text-sm text-gray-500">
              <p>Each city has different permit systems and data formats:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Some cities provide individual permit records</li>
                <li>Others provide summary statistics only</li>
                <li>Integration approach varies by city</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermitSearch;

