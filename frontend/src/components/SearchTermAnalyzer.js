import React, { useState } from 'react';
import { Download, AlertCircle, BarChart3 } from 'lucide-react';
import Header from './Header';
import FileUploadSection from './FileUploadSection';
import LoadingSpinner from './LoadingSpinner';
import ResultsSection from './ResultsSection';

const SearchTermAnalyzer = () => {
  const [searchFile, setSearchFile] = useState(null);
  const [targetingFile, setTargetingFile] = useState(null);
  const [threshold, setThreshold] = useState(1);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({
    category: null,
    field: 'customer search term',
    direction: 'asc',
  });
  // ACOS Filter States
  const [acosFilter, setAcosFilter] = useState({
    filterType: 'none', // 'none', 'greater', 'less', 'equal'
    value: '',
  });

  const BACKEND_URL = 'https://search-term-analyzer-2.onrender.com';

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      if (fileType === 'search') {
        setSearchFile(file);
      } else {
        setTargetingFile(file);
      }
      setError('');
    }
  };

  const handleProcess = async () => {
    if (!searchFile || !targetingFile) {
      setError('Please upload both files');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('search_file', searchFile);
    formData.append('targeting_file', targetingFile);
    formData.append('positive_order_threshold', threshold);

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
      setSortConfig({ category: null, field: 'customer search term', direction: 'asc' });
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!searchFile || !targetingFile) {
      setError('Please upload both files');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('search_file', searchFile);
    formData.append('targeting_file', targetingFile);
    formData.append('positive_order_threshold', threshold);

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
      a.download = 'Targeting_Results.xlsx';
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

  const handleSort = (field, category) => {
    setSortConfig((prev) => ({
      category,
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Apply ACOS filter to positive results only
  const getFilteredResults = () => {
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

  const displayResults = getFilteredResults();

  const isDisabled = !searchFile || !targetingFile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Upload Files</h2>

          <div className="mb-8">
            <FileUploadSection
              searchFile={searchFile}
              targetingFile={targetingFile}
              onSearchFileChange={(e) => handleFileChange(e, 'search')}
              onTargetingFileChange={(e) => handleFileChange(e, 'targeting')}
            />
          </div>

          {/* Threshold Input and ACOS Filter - Same Row */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Positive Order Threshold */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Positive Order Threshold
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600">
                  Orders to mark as positive
                </p>
              </div>
            </div>

            {/* ACOS Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                🎯 ACOS Filter
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={acosFilter.filterType}
                  onChange={(e) => setAcosFilter({ ...acosFilter, filterType: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-colors"
                >
                  <option value="none">No Filter</option>
                  <option value="greater">Greater Than</option>
                  <option value="less">Less Than</option>
                  <option value="equal">Equals To</option>
                </select>

                {acosFilter.filterType !== 'none' && (
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Value"
                    value={acosFilter.value}
                    onChange={(e) => setAcosFilter({ ...acosFilter, value: e.target.value })}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-colors"
                  />
                )}

                {acosFilter.filterType === 'none' && (
                  <p className="text-xs text-gray-500">Positive keywords only</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleProcess}
              disabled={isDisabled || loading}
              className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Analyze'}
            </button>
            <button
              onClick={handleDownload}
              disabled={isDisabled || loading}
              className="flex-1 md:flex-none px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download Excel
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && <LoadingSpinner />}

        {/* Results Section */}
        {results && !loading && (
          <ResultsSection results={displayResults} sortConfig={sortConfig} onSort={handleSort} />
        )}

        {/* Empty State */}
        {!results && !loading && (
          <div className="text-center py-16">
            <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Upload files and click "Analyze" to see results</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-t border-blue-100 mt-auto">
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
                <p>Made with Om and way too much caffeine</p>
                <p>© 2024 Search Term Analyzer™ </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SearchTermAnalyzer;
