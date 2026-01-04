import React, { useState } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import Header from './Header';
import FileUploadSection from './FileUploadSection';
import LoadingSpinner from './LoadingSpinner';
import ResultsSection from './ResultsSection';

const SearchTermAnalyzer = () => {
  const [activeTab, setActiveTab] = useState('products');

  // State for Products
  const [productsFiles, setProductsFiles] = useState({ search: null, targeting: null });
  const [productsResults, setProductsResults] = useState(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [productsThreshold, setProductsThreshold] = useState(1);
  const [productsAcosFilter, setProductsAcosFilter] = useState({ filterType: 'none', value: '' });
  const [productsSortConfig, setProductsSortConfig] = useState({ category: null, field: 'customer search term', direction: 'asc' });

  // State for Brands
  const [brandsFiles, setBrandsFiles] = useState({ search: null, targeting: null });
  const [brandsResults, setBrandsResults] = useState(null);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState('');
  const [brandsThreshold, setBrandsThreshold] = useState(1);
  const [brandsAcosFilter, setBrandsAcosFilter] = useState({ filterType: 'none', value: '' });
  const [brandsSortConfig, setBrandsSortConfig] = useState({ category: null, field: 'customer search term', direction: 'asc' });

  // State for Display
  const [displayFiles, setDisplayFiles] = useState({ search: null, targeting: null });
  const [displayResults, setDisplayResults] = useState(null);
  const [displayLoading, setDisplayLoading] = useState(false);
  const [displayError, setDisplayError] = useState('');
  const [displayAcosFilter, setDisplayAcosFilter] = useState({ filterType: 'none', value: '' });
  const [displaySortConfig, setDisplaySortConfig] = useState({ category: null, field: 'matched target', direction: 'asc' });

  const BACKEND_URL = 'https://search-term-analyzer-3.onrender.com';

  // Product type configurations
  const productTypeConfig = {
    products: {
      label: 'Sponsored Products',
      firstFileLabel: 'Search Terms File',
      firstFilePlaceholder: 'Upload your Sponsored Products search term report',
      secondFileLabel: 'Targeting File / Keyword File',
      secondFilePlaceholder: 'Upload your Sponsored Products targeting/keyword file',
    },
    brands: {
      label: 'Sponsored Brands',
      firstFileLabel: 'Search Terms File',
      firstFilePlaceholder: 'Upload your Sponsored Brands search term report',
      secondFileLabel: 'Targeting File / Keyword File',
      secondFilePlaceholder: 'Upload your Sponsored Brands targeting/keyword file',
    },
    display: {
      label: 'Sponsored Display',
      firstFileLabel: 'Matched Target File',
      firstFilePlaceholder: 'Upload your Sponsored Display matched target report',
      secondFileLabel: 'Targeting File',
      secondFilePlaceholder: 'Upload your Sponsored Display targeting file',
    },
  };

  // Handle file changes
  const handleProductsFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      setProductsFiles(prev => ({ ...prev, [fileType === 'search' ? 'search' : 'targeting']: file }));
      setProductsError('');
    }
  };

  const handleBrandsFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      setBrandsFiles(prev => ({ ...prev, [fileType === 'search' ? 'search' : 'targeting']: file }));
      setBrandsError('');
    }
  };

  const handleDisplayFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      setDisplayFiles(prev => ({ ...prev, [fileType === 'search' ? 'search' : 'targeting']: file }));
      setDisplayError('');
    }
  };

  // Process function
  const processFiles = async (productType, files, threshold, setLoading, setError, setResults) => {
    if (!files.search || !files.targeting) {
      setError(`Please upload both files for ${productTypeConfig[productType].label}`);
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('search_file', files.search);
    formData.append('targeting_file', files.targeting);
    formData.append('positive_order_threshold', threshold);
    formData.append('product_type', productType);

    try {
      const response = await fetch(`${BACKEND_URL}/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process files');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Download function
  const downloadFiles = async (productType, files, threshold, setLoading, setError) => {
    if (!files.search || !files.targeting) {
      setError(`Please upload both files for ${productTypeConfig[productType].label}`);
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('search_file', files.search);
    formData.append('targeting_file', files.targeting);
    formData.append('positive_order_threshold', threshold);
    formData.append('product_type', productType);

    try {
      const response = await fetch(`${BACKEND_URL}/download`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productType}_Targeting_Results.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || 'Failed to download');
    } finally {
      setLoading(false);
    }
  };

  // Filter results
  const getFilteredResults = (results, acosFilter) => {
    if (!results || acosFilter.filterType === 'none') {
      return results;
    }

    const filterValue = parseFloat(acosFilter.value);
    if (isNaN(filterValue)) return results;

    const filterPositive = (items) => {
      return items.filter((item) => {
        if (item.acos === null || item.acos === undefined) return false;
        
        switch (acosFilter.filterType) {
          case 'greater':
            return item.acos > filterValue;
          case 'less':
            return item.acos < filterValue;
          case 'equal':
            return item.acos === filterValue;
          default:
            return true;
        }
      });
    };

    return {
      positive: {
        no_b0: filterPositive(results.positive.no_b0),
        only_b0: filterPositive(results.positive.only_b0),
      },
      negative: results.negative,
    };
  };

  // Render tab content
  const renderTabContent = () => {
    if (activeTab === 'products') {
      return (
        <>
          <div className="mb-6">
            <FileUploadSection
              searchFile={productsFiles.search}
              targetingFile={productsFiles.targeting}
              onSearchFileChange={(e) => handleProductsFileChange(e, 'search')}
              onTargetingFileChange={(e) => handleProductsFileChange(e, 'targeting')}
              firstFileLabel={productTypeConfig.products.firstFileLabel}
              secondFileLabel={productTypeConfig.products.secondFileLabel}
              firstFileDescription={productTypeConfig.products.firstFilePlaceholder}
              secondFileDescription={productTypeConfig.products.secondFilePlaceholder}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Positive Order Threshold
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={productsThreshold}
                  onChange={(e) => setProductsThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600">Orders to mark as positive</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                🎯 ACOS Filter
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={productsAcosFilter.filterType}
                  onChange={(e) => setProductsAcosFilter({ ...productsAcosFilter, filterType: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No Filter</option>
                  <option value="greater">Greater Than</option>
                  <option value="less">Less Than</option>
                  <option value="equal">Equals To</option>
                </select>

                {productsAcosFilter.filterType !== 'none' && (
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Value"
                    value={productsAcosFilter.value}
                    onChange={(e) => setProductsAcosFilter({ ...productsAcosFilter, value: e.target.value })}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => processFiles('products', productsFiles, productsThreshold, setProductsLoading, setProductsError, setProductsResults)}
              disabled={!productsFiles.search || !productsFiles.targeting || productsLoading}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {productsLoading ? 'Processing...' : 'Analyze'}
            </button>
            <button
              onClick={() => downloadFiles('products', productsFiles, productsThreshold, setProductsLoading, setProductsError)}
              disabled={!productsFiles.search || !productsFiles.targeting || productsLoading}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              <Download size={18} />
              Download
            </button>
          </div>

          {productsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 mb-6">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{productsError}</p>
            </div>
          )}

          {productsLoading && <LoadingSpinner />}

          {productsResults && !productsLoading && (
            <ResultsSection 
              results={getFilteredResults(productsResults, productsAcosFilter)} 
              sortConfig={productsSortConfig} 
              onSort={(field, category) => setProductsSortConfig({ category, field, direction: productsSortConfig.field === field && productsSortConfig.direction === 'asc' ? 'desc' : 'asc' })}
              productType="products"
            />
          )}
        </>
      );
    } else if (activeTab === 'brands') {
      return (
        <>
          <div className="mb-6">
            <FileUploadSection
              searchFile={brandsFiles.search}
              targetingFile={brandsFiles.targeting}
              onSearchFileChange={(e) => handleBrandsFileChange(e, 'search')}
              onTargetingFileChange={(e) => handleBrandsFileChange(e, 'targeting')}
              firstFileLabel={productTypeConfig.brands.firstFileLabel}
              secondFileLabel={productTypeConfig.brands.secondFileLabel}
              firstFileDescription={productTypeConfig.brands.firstFilePlaceholder}
              secondFileDescription={productTypeConfig.brands.secondFilePlaceholder}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Positive Order Threshold
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={brandsThreshold}
                  onChange={(e) => setBrandsThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600">Orders to mark as positive</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                🎯 ACOS Filter
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={brandsAcosFilter.filterType}
                  onChange={(e) => setBrandsAcosFilter({ ...brandsAcosFilter, filterType: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No Filter</option>
                  <option value="greater">Greater Than</option>
                  <option value="less">Less Than</option>
                  <option value="equal">Equals To</option>
                </select>

                {brandsAcosFilter.filterType !== 'none' && (
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Value"
                    value={brandsAcosFilter.value}
                    onChange={(e) => setBrandsAcosFilter({ ...brandsAcosFilter, value: e.target.value })}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => processFiles('brands', brandsFiles, brandsThreshold, setBrandsLoading, setBrandsError, setBrandsResults)}
              disabled={!brandsFiles.search || !brandsFiles.targeting || brandsLoading}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {brandsLoading ? 'Processing...' : 'Analyze'}
            </button>
            <button
              onClick={() => downloadFiles('brands', brandsFiles, brandsThreshold, setBrandsLoading, setBrandsError)}
              disabled={!brandsFiles.search || !brandsFiles.targeting || brandsLoading}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              <Download size={18} />
              Download
            </button>
          </div>

          {brandsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 mb-6">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{brandsError}</p>
            </div>
          )}

          {brandsLoading && <LoadingSpinner />}

          {brandsResults && !brandsLoading && (
            <ResultsSection 
              results={getFilteredResults(brandsResults, brandsAcosFilter)} 
              sortConfig={brandsSortConfig} 
              onSort={(field, category) => setBrandsSortConfig({ category, field, direction: brandsSortConfig.field === field && brandsSortConfig.direction === 'asc' ? 'desc' : 'asc' })}
              productType="brands"
            />
          )}
        </>
      );
    } else if (activeTab === 'display') {
      return (
        <>
          <div className="mb-6">
            <FileUploadSection
              searchFile={displayFiles.search}
              targetingFile={displayFiles.targeting}
              onSearchFileChange={(e) => handleDisplayFileChange(e, 'search')}
              onTargetingFileChange={(e) => handleDisplayFileChange(e, 'targeting')}
              firstFileLabel={productTypeConfig.display.firstFileLabel}
              secondFileLabel={productTypeConfig.display.secondFileLabel}
              firstFileDescription={productTypeConfig.display.firstFilePlaceholder}
              secondFileDescription={productTypeConfig.display.secondFilePlaceholder}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Minimum Orders for Positive
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={1}
                  readOnly
                  className="w-20 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
                <p className="text-xs text-gray-600">(Fixed at 1 for Display)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                🎯 ACOS Filter
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={displayAcosFilter.filterType}
                  onChange={(e) => setDisplayAcosFilter({ ...displayAcosFilter, filterType: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No Filter</option>
                  <option value="greater">Greater Than</option>
                  <option value="less">Less Than</option>
                  <option value="equal">Equals To</option>
                </select>

                {displayAcosFilter.filterType !== 'none' && (
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Value"
                    value={displayAcosFilter.value}
                    onChange={(e) => setDisplayAcosFilter({ ...displayAcosFilter, value: e.target.value })}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => processFiles('display', displayFiles, 1, setDisplayLoading, setDisplayError, setDisplayResults)}
              disabled={!displayFiles.search || !displayFiles.targeting || displayLoading}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {displayLoading ? 'Processing...' : 'Analyze'}
            </button>
            <button
              onClick={() => downloadFiles('display', displayFiles, 1, setDisplayLoading, setDisplayError)}
              disabled={!displayFiles.search || !displayFiles.targeting || displayLoading}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              <Download size={18} />
              Download
            </button>
          </div>

          {displayError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 mb-6">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{displayError}</p>
            </div>
          )}

          {displayLoading && <LoadingSpinner />}

          {displayResults && !displayLoading && (
            <ResultsSection 
              results={getFilteredResults(displayResults, displayAcosFilter)} 
              sortConfig={displaySortConfig} 
              onSort={(field, category) => setDisplaySortConfig({ category, field, direction: displaySortConfig.field === field && displaySortConfig.direction === 'asc' ? 'desc' : 'asc' })}
              productType="display"
            />
          )}
        </>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs Container */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Tab Buttons */}
          <div className="flex border-b border-gray-200">
            {Object.entries(productTypeConfig).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-4 px-6 font-semibold text-center transition-all ${
                  activeTab === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {value.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-t border-blue-100 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-gray-900 font-bold text-lg mb-3">⚡ Search Term Analyzer</h3>
              <p className="text-gray-700 text-sm">
                Because manually scrolling through 1000+ keywords is for people who hate themselves 😅
              </p>
            </div>
            <div>
              <h3 className="text-gray-900 font-bold text-lg mb-3">🎯 What We Do</h3>
              <p className="text-gray-700 text-sm">
                We turn data chaos into keyword gold.
              </p>
            </div>
            <div>
              <h3 className="text-gray-900 font-bold text-lg mb-3">🚀 Pro Tip</h3>
              <p className="text-gray-700 text-sm">
                Our algorithm is powered by coffee, stubbornness, and a tiny bit of magic ✨
              </p>
            </div>
          </div>

          <div className="border-t border-blue-100 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-700 text-sm">
                <p>💡 "Keywords don't lie, they just sometimes hide" - Someone Smart Probably</p>
              </div>
              <div className="text-right text-gray-600 text-xs">
                <p>Made by Om and way too much caffeine</p>
                <p>© 2025 Search Term Analyzer™ </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SearchTermAnalyzer;
