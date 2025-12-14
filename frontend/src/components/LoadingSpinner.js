import React from "react";

function LoadingSpinner() {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="spinner"></div>
        <h2>Analyzing Keywords...</h2>
        <p>Please wait while we process your files</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;