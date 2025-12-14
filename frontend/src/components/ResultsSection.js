import React, { useState } from "react";
import DataTable from "./DataTable";

function ResultsSection({ results }) {
  const [copiedCell, setCopiedCell] = useState(null);
  const [posLimit, setPosLimit] = useState(10);
  const [negLimit, setNegLimit] = useState(10);

  const handleCopyCell = (text, cellId) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(cellId);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  const ResultCard = ({ title, icon, data, type, limit, setLimit }) => {
    const limitedData = data.slice(0, limit);
    const showMoreAvailable = data.length > limit;

    if (!data || data.length === 0) {
      return (
        <div className="result-card empty-card">
          <div className="card-header">
            <span className="card-icon">{icon}</span>
            <h3>{title}</h3>
          </div>
          <p className="empty-message">No keywords found</p>
        </div>
      );
    }

    return (
      <div className="result-card">
        {showMoreAvailable && (
          <div className="limit-control-top">
            <label htmlFor={`limit-${type}-${title}`}>Show results: </label>
            <input
              id={`limit-${type}-${title}`}
              type="number"
              min="1"
              max={data.length}
              value={limit}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setLimit('');
                } else {
                  const numVal = Math.max(1, Math.min(parseInt(val), data.length));
                  setLimit(numVal);
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '' || parseInt(e.target.value) < 1) {
                  setLimit(1);
                }
              }}
              className="limit-input"
              placeholder="Enter number"
            />
            <span className="limit-info">/ {data.length} total</span>
          </div>
        )}
        <div className="card-header">
          <span className="card-icon">{icon}</span>
          <div className="card-title-group">
            <h3>{title}</h3>
            <span className="card-count">{limitedData.length} of {data.length} keywords</span>
          </div>
        </div>
        <DataTable
          data={limitedData}
          type={type}
          onCopyCell={handleCopyCell}
          copiedCell={copiedCell}
        />
      </div>
    );
  };

  return (
    <section className="results-section">
      <div className="results-container">
        <div className="results-header">
          <h2>Analysis Results</h2>
          <p className="results-subtitle">Select and copy multiple search terms using right-click or click individual terms. Use the limit controls to manage results</p>
        </div>

        <div className="results-grid">
          {/* Positive Keywords */}
          <div className="result-group">
            <h2 className="group-title">✨ Positive Keywords</h2>
            <div className="cards-container">
              <ResultCard
                title="Regular Keywords"
                icon="📈"
                data={results.positive.no_b0}
                type="positive"
                limit={posLimit}
                setLimit={setPosLimit}
              />
            </div>
            <div className="cards-container">
              <ResultCard
                title="B0 Keywords"
                icon="🏷️"
                data={results.positive.only_b0}
                type="positive"
                limit={posLimit}
                setLimit={setPosLimit}
              />
            </div>
          </div>

          {/* Negative Keywords */}
          <div className="result-group">
            <h2 className="group-title">🚫 Negative Keywords</h2>
            <div className="cards-container">
              <ResultCard
                title="Regular Keywords"
                icon="📉"
                data={results.negative.no_b0}
                type="negative"
                limit={negLimit}
                setLimit={setNegLimit}
              />
            </div>
            <div className="cards-container">
              <ResultCard
                title="B0 Keywords"
                icon="🏷️"
                data={results.negative.only_b0}
                type="negative"
                limit={negLimit}
                setLimit={setNegLimit}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ResultsSection;