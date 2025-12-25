import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DataTable = ({ title, data, category, bgColor, sortConfig, onSort, productType }) => {
  const [displayLimit, setDisplayLimit] = useState(10);
  const [customLimit, setCustomLimit] = useState('');

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
        <p className="text-gray-500">No results</p>
      </div>
    );
  }

  // Determine which columns to show based on product type
  const getColumns = (type) => {
    if (type === "display") {
      // For Sponsored Display - use matched target instead of search term
      return [
        'matched target',
        'campaign name',
        'ad group name',
        'match type',
        '14 day total orders (#)',
        '14 day total sales',
        'total advertiser cost',
        'acos',
        'impressions',
        'clicks',
      ];
    } else {
      // For Sponsored Products & Brands - use customer search term
      return [
        'customer search term',
        'campaign name',
        'ad group name',
        'match type',
        '14 day total orders (#)',
        '14 day total sales',
        'spend',
        'acos',
        'impressions',
        'clicks',
      ];
    }
  };

  const columns = getColumns(productType || "products");

  const sortedData = getSortedData(data, sortConfig, category);
  const displayedData = sortedData.slice(0, displayLimit);

  const handleCustomLimitChange = () => {
    const num = parseInt(customLimit);
    if (!isNaN(num) && num > 0) {
      setDisplayLimit(num);
      setCustomLimit('');
    }
  };

  const formatValue = (val, col) => {
    // Handle ACOS - show the value with % sign, or dash if null/undefined
    if (col === 'acos') {
      if (val === null || val === undefined || val === 'null') {
        return '-';
      }
      return `${val}%`;
    }
    
    // Handle numeric columns with thousand separators
    const numericColumns = [
      '14 day total sales',
      'spend',
      'total advertiser cost',
      'impressions',
      'clicks',
      '14 day total orders (#)'
    ];
    
    if (numericColumns.includes(col)) {
      if (val === null || val === undefined) return '-';
      return Number(val).toLocaleString();
    }
    
    // Handle other columns
    if (val === null || val === undefined) return '-';
    return val;
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <div className={`${bgColor} px-6 py-4 border-b border-gray-200`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {displayedData.length} of {sortedData.length} results
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Show:</label>
              <select
                value={displayLimit}
                onChange={(e) => setDisplayLimit(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
            <span className="text-sm text-gray-600">or</span>
            <div className="flex gap-1">
              <input
                type="number"
                min="1"
                placeholder="Custom"
                value={customLimit}
                onChange={(e) => setCustomLimit(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleCustomLimitChange();
                }}
                className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCustomLimitChange}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => onSort(col, category)}
                  className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    {col}
                    {sortConfig.category === category && sortConfig.field === col && (
                      <ChevronDown
                        size={16}
                        className={`transform transition-transform ${
                          sortConfig.direction === 'desc' ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedData.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatValue(row[col], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getSortedData = (data, sortConfig, category) => {
  if (!data || data.length === 0 || sortConfig.category !== category) return data;

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortConfig.field];
    const bVal = b[sortConfig.field];

    // Handle null/undefined values
    if (aVal === null || aVal === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return sortConfig.direction === 'asc' ? -1 : 1;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    return sortConfig.direction === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });

  return sorted;
};

export default DataTable;