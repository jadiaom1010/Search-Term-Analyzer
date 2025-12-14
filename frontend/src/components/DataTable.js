import React, { useState } from "react";

function DataTable({ data, type, onCopyCell, copiedCell }) {
  const [sortConfig, setSortConfig] = useState({ key: "sales", direction: "desc" });

  const sortedData = [...data].sort((a, b) => {
    const key = sortConfig.key;
    const aVal = a[key];
    const bVal = b[key];

    if (typeof aVal === "number") {
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    return sortConfig.direction === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "desc"
          ? "asc"
          : "desc",
    });
  };

  const formatNumber = (num) => {
    if (typeof num !== "number") return num;
    return num.toLocaleString();
  };

  const columns = [
    { key: "customer search term", label: "Search Term", sortable: true, width: "200px" },
    { key: "campaign name", label: "Campaign", sortable: true, width: "150px" },
    { key: "ad group name", label: "Ad Group", sortable: true, width: "150px" },
    { key: "match type", label: "Match Type", sortable: true, width: "100px" },
    { key: "14 day total orders (#)", label: "Orders", sortable: true, width: "80px" },
    { key: "14 day total sales", label: "Sales", sortable: true, width: "100px" },
    { key: "spend", label: "Spend", sortable: true, width: "100px" },
    { key: "impressions", label: "Impressions", sortable: true, width: "100px" },
    { key: "clicks", label: "Clicks", sortable: true, width: "80px" },
  ];

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                className={col.sortable ? "sortable" : ""}
                style={{ width: col.width }}
              >
                <div className="th-content">
                  {col.label}
                  {col.sortable && (
                    <span className="sort-indicator">
                      {sortConfig.key === col.key &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr key={idx} className={`row-${type}`}>
              {columns.map((col) => {
                const cellId = `${idx}-${col.key}`;
                const isCopied = copiedCell === cellId;
                const cellValue = row[col.key];
                const isSearchTerm = col.key === "customer search term";

                return (
                  <td
                    key={col.key}
                    style={{ width: col.width }}
                    className={`${isSearchTerm ? "search-term-cell" : ""} ${
                      isCopied ? "copied" : ""
                    }`}
                    onClick={() => isSearchTerm && onCopyCell(cellValue, cellId)}
                    title={isSearchTerm ? "Click to copy" : ""}
                  >
                    <div className="cell-content">
                      {typeof cellValue === "number"
                        ? formatNumber(cellValue)
                        : cellValue}
                      {isSearchTerm && isCopied && (
                        <span className="copy-indicator">✓ Copied!</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;