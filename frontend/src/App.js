import React, { useState } from "react";
import "./App.css";
import FileUploadSection from "./components/FileUploadSection";
import ResultsSection from "./components/ResultsSection";
import LoadingSpinner from "./components/LoadingSpinner";

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(1);

  const handleProcess = async (searchFile, targetingFile) => {
    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append("search_file", searchFile);
    formData.append("targeting_file", targetingFile);
    formData.append("positive_order_threshold", threshold);

    try {
      const response = await fetch("http://localhost:5000/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Processing failed");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>Search Term Analyzer</h1>
          <p className="subtitle">Optimize your ad campaigns with intelligent keyword analysis</p>
        </div>
      </header>

      <main className="app-main">
        <FileUploadSection
          onProcess={handleProcess}
          threshold={threshold}
          setThreshold={setThreshold}
          loading={loading}
        />

        {loading && <LoadingSpinner />}

        {error && (
          <div className="error-container">
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <div>
                <h3>Error</h3>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {results && !loading && <ResultsSection results={results} />}

        {!results && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h2>Ready to analyze your keywords</h2>
            <p>Upload your search terms and targeting files to get started</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;