// CSS styles for HTML reports

export const reportStyles = `
body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
  padding: 20px; 
  background: #f5f5f5;
  margin: 0;
}

.header {
  background: white;
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

h1 { 
  margin: 0 0 10px 0; 
  color: #333; 
}

.summary {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.summary-card {
  background: #f9f9f9;
  padding: 15px 25px;
  border-radius: 6px;
  border-left: 4px solid #ddd;
}

.summary-card.ok { 
  border-left-color: #4caf50; 
}

.summary-card.diff { 
  border-left-color: #ff9800; 
}

.summary-card.error { 
  border-left-color: #f44336; 
}

.summary-card .count { 
  font-size: 32px; 
  font-weight: bold; 
  margin: 5px 0; 
}

.summary-card .label { 
  color: #666; 
  font-size: 14px; 
}

table { 
  border-collapse: collapse; 
  width: 100%; 
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

th, td { 
  border: 1px solid #e0e0e0; 
  padding: 15px; 
  vertical-align: top; 
}

th { 
  background-color: #37474f; 
  color: white;
  font-weight: 600;
  text-align: left;
}

tr.has-diff { 
  background-color: #fff8e1; 
}

tr.has-error {
  background-color: #ffebee;
}

tr:hover { 
  background-color: #f5f5f5; 
}

tr.has-diff:hover { 
  background-color: #fff3cd; 
}

tr.has-error:hover {
  background-color: #ffcdd2;
}

.status-cell { 
  font-size: 18px; 
  font-weight: bold;
  text-align: center;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.comparison-grid.four-col {
  grid-template-columns: repeat(4, 1fr);
}

.img-container {
  text-align: center;
}

.img-label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #555;
  font-size: 14px;
}

.screenshot { 
  width: 100%;
  max-width: 300px;
  border: 2px solid #ddd;
  border-radius: 6px;
  cursor: zoom-in;
  transition: transform 0.2s;
}

.screenshot:hover {
  border-color: #2196f3;
  transform: scale(1.02);
}

.screenshot.zoomed {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(1.5);
  max-width: 90vw;
  max-height: 90vh;
  z-index: 1000;
  cursor: zoom-out;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}

.img-placeholder {
  width: 100%;
  max-width: 300px;
  height: 150px;
  border: 2px dashed #ccc;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
  text-align: center;
  margin: 0 auto;
}

.diff-info {
  color: #ff6f00;
  font-size: 12px;
  font-weight: 600;
}

.error-info {
  color: #d32f2f;
  font-size: 12px;
  font-weight: 700;
}

.comparison-dates {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  font-size: 18px;
  color: #555;
}

.date-badge {
  background: #e3f2fd;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
}

/* Filter Buttons */
.filter-btn {
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: rgba(33, 150, 243, 0.1);
  transform: scale(1.05);
}

.filter-btn.active {
  background: #2196f3;
  color: white;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}

.filter-btn.active div {
  color: white !important;
}

/* Layout Comparison Styles */
.layout-summary {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  border-left: 4px solid #ddd;
}

.layout-summary.ok {
  border-left-color: #4caf50;
  background: #f1f8f4;
}

.layout-summary.warning {
  border-left-color: #ff9800;
  background: #fff8f1;
}

.layout-summary.error {
  border-left-color: #f44336;
  background: #fff5f5;
}

.layout-score {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 16px;
}

.score-label {
  color: #666;
  font-weight: 600;
}

.score-value {
  background: #37474f;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: bold;
}

.layout-changes-summary {
  color: #555;
  font-size: 14px;
  margin-bottom: 10px;
  font-weight: 500;
}

.layout-details {
  margin-top: 10px;
  cursor: pointer;
}

.layout-details summary {
  font-weight: 600;
  color: #2196f3;
  padding: 8px;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.layout-details summary:hover {
  background: #e3f2fd;
}

.layout-details[open] summary {
  margin-bottom: 10px;
  background: #e3f2fd;
}

.layout-changes-list {
  background: white;
  border-radius: 4px;
  padding: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.layout-change-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 4px;
  background: #fafafa;
  border-left: 3px solid #ddd;
  font-size: 13px;
}

.layout-change-item.severity-major {
  border-left-color: #f44336;
  background: #ffebee;
}

.layout-change-item.severity-moderate {
  border-left-color: #ff9800;
  background: #fff8e1;
}

.layout-change-item.severity-minor {
  border-left-color: #4caf50;
  background: #f1f8f4;
}

.severity-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.change-type {
  background: #37474f;
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  flex-shrink: 0;
}

.change-details {
  color: #555;
  line-height: 1.5;
  flex: 1;
}

/* Scrollbar styling for layout changes list */
.layout-changes-list::-webkit-scrollbar {
  width: 8px;
}

.layout-changes-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.layout-changes-list::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.layout-changes-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}
`;

