import React from 'react';
import DataTable from './DataTable';

const ResultsSection = ({ results, sortConfig, onSort, productType }) => {
  if (!results) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* POSITIVE RESULTS */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Positive Keywords</h2>
        
        <DataTable
          title="Positive (Non-B0)"
          data={results.positive.no_b0}
          category="positive_no_b0"
          bgColor="bg-green-50"
          sortConfig={sortConfig}
          onSort={onSort}
          productType={productType}
        />
        
        <DataTable
          title="Positive (B0 Only)"
          data={results.positive.only_b0}
          category="positive_b0"
          bgColor="bg-green-50"
          sortConfig={sortConfig}
          onSort={onSort}
          productType={productType}
        />
      </div>

      {/* NEGATIVE RESULTS */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Negative Keywords (Top 20% by Spend)</h2>
        
        <DataTable
          title="Negative (Non-B0)"
          data={results.negative.no_b0}
          category="negative_no_b0"
          bgColor="bg-red-50"
          sortConfig={sortConfig}
          onSort={onSort}
          productType={productType}
        />
        
        <DataTable
          title="Negative (B0 Only)"
          data={results.negative.only_b0}
          category="negative_b0"
          bgColor="bg-red-50"
          sortConfig={sortConfig}
          onSort={onSort}
          productType={productType}
        />
      </div>
    </div>
  );
};

export default ResultsSection;