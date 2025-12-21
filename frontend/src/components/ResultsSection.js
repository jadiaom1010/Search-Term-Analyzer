import React from 'react';
import DataTable from './DataTable';

const ResultsSection = ({ results, sortConfig, onSort }) => {
  if (!results) return null;

  return (
    <div className="space-y-8">
      {/* Positive Keywords */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Positive Keywords</h2>
        <div className="grid grid-cols-1 gap-6">
          <DataTable
            title="Positive (Non-B0)"
            data={results.positive.no_b0}
            category="pos-non-b0"
            bgColor="bg-green-50"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <DataTable
            title="Positive (B0 Only)"
            data={results.positive.only_b0}
            category="pos-b0"
            bgColor="bg-green-50"
            sortConfig={sortConfig}
            onSort={onSort}
          />
        </div>
      </div>

      {/* Negative Keywords */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Negative Keywords</h2>
        <div className="grid grid-cols-1 gap-6">
          <DataTable
            title="Negative (Non-B0)"
            data={results.negative.no_b0}
            category="neg-non-b0"
            bgColor="bg-red-50"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <DataTable
            title="Negative (B0 Only)"
            data={results.negative.only_b0}
            category="neg-b0"
            bgColor="bg-red-50"
            sortConfig={sortConfig}
            onSort={onSort}
          />
        </div>
      </div>
    </div>
  );
};

export default ResultsSection;