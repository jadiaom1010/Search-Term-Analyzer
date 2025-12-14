import React, { useRef } from "react";

function FileUploadSection({ onProcess, threshold, setThreshold, loading }) {
  const searchFileRef = useRef(null);
  const targetingFileRef = useRef(null);

  const handleUpload = () => {
    const searchFile = searchFileRef.current?.files?.[0];
    const targetingFile = targetingFileRef.current?.files?.[0];

    if (!searchFile || !targetingFile) {
      alert("Please select both files");
      return;
    }

    onProcess(searchFile, targetingFile);
  };

  return (
    <section className="upload-section">
      <div className="upload-container">
        <div className="upload-grid">
          {/* Search File Upload */}
          <div className="upload-box">
            <label htmlFor="search-file" className="upload-label">
              <div className="upload-icon">📄</div>
              <span className="label-text">Search Terms File</span>
              <span className="label-hint">Excel or CSV</span>
            </label>
            <input
              id="search-file"
              type="file"
              ref={searchFileRef}
              accept=".xlsx,.xls,.csv"
              disabled={loading}
            />
          </div>

          {/* Targeting File Upload */}
          <div className="upload-box">
            <label htmlFor="targeting-file" className="upload-label">
              <div className="upload-icon">🎯</div>
              <span className="label-text">Targeting File</span>
              <span className="label-hint">Excel or CSV</span>
            </label>
            <input
              id="targeting-file"
              type="file"
              ref={targetingFileRef}
              accept=".xlsx,.xls,.csv"
              disabled={loading}
            />
          </div>
        </div>

        {/* Threshold Control */}
        <div className="threshold-control">
          <label htmlFor="threshold" className="threshold-label">
            Minimum Order Threshold
          </label>
          <input
            id="threshold"
            type="number"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
            disabled={loading}
            className="threshold-input"
            placeholder="Enter minimum orders"
          />
          <div className="threshold-hint">
            Only keywords with at least {threshold} order{threshold !== 1 ? "s" : ""} will be considered positive
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleUpload}
          disabled={loading}
          className="submit-btn"
        >
          {loading ? "Processing..." : "Analyze Keywords"}
        </button>
      </div>
    </section>
  );
}

export default FileUploadSection;