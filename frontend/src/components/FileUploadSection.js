import React from 'react';
import { Upload } from 'lucide-react';

const FileUploadSection = ({ searchFile, targetingFile, onSearchFileChange, onTargetingFileChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <FileUploadBox
        label="Search Terms File"
        file={searchFile}
        onChange={onSearchFileChange}
        description="Excel file (.xlsx)"
      />

      <FileUploadBox
        label="Targeting File / Keyword File"
        file={targetingFile}
        onChange={onTargetingFileChange}
        description="Excel file (.xlsx)"
      />
    </div>
  );
};

const FileUploadBox = ({ label, file, onChange, description }) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        {label}
      </label>
      <label className="flex items-center justify-center w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group">
        <div className="text-center">
          <Upload size={24} className="mx-auto mb-2 text-gray-500 group-hover:text-blue-600 transition-colors" />
          <p className="text-sm font-medium text-gray-700">
            {file ? file.name : 'Click to upload'}
          </p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={onChange}
          className="hidden"
        />
      </label>
    </div>
  );
};

export default FileUploadSection;