import React from 'react';
import { BarChart3 } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 size={32} className="text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Search Term Analyzer</h1>
            <p className="text-sm text-gray-600 mt-1">
              Identify positive and negative keywords for your campaigns
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;