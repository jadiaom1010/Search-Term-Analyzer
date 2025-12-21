import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      <p className="ml-4 text-gray-600 font-medium">Processing your files...</p>
    </div>
  );
};

export default LoadingSpinner;