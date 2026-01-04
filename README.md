# Search Term Analyzer

🎯 **Identify positive and negative keywords for your Amazon advertising campaigns**

A full-stack application that analyzes Amazon Sponsored Products, Sponsored Brands, and Sponsored Display search terms/matched targets to help you optimize your ad spend and identify high-performing and underperforming keywords.

## Features

✨ **Multi-Campaign Support**
- Sponsored Products (SP)
- Sponsored Brands (SB)
- Sponsored Display (SD)

📊 **Smart Analysis**
- Automatic positive/negative keyword identification
- ACOS (Advertising Cost of Sales) calculation
- Top 20% negative keyword filtering by spend
- B0/non-B0 ASIN categorization
- Threshold-based filtering

🎨 **User-Friendly Interface**
- Tabbed interface for easy switching between campaign types
- Real-time ACOS filtering
- Custom result display limits
- One-click Excel download

⚡ **Performance**
- Fast processing with pandas
- Memory-optimized for large files
- Independent sections (no data mixing)

## Tech Stack

**Frontend:**
- React.js
- Tailwind CSS
- Lucide React (Icons)

**Backend:**
- Python 3.11+
- Flask
- Flask-CORS
- Pandas
- OpenPyXL
- XlsxWriter

**Deployment:**
- Frontend: Vercel
- Backend: Render

## Installation

### Prerequisites
- Node.js 14+ (for frontend)
- Python 3.11+ (for backend)
- Git

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/jadiaom1010/Search-Term-Analyzer.git
cd Search-Term-Analyzer/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

Backend will run on `http://localhost:5000`

### Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will run on `http://localhost:3000`

## Usage

1. **Upload Files**
   - Select your campaign type (Products, Brands, or Display)
   - Upload the search term/matched target report
   - Upload the targeting/keyword file

2. **Configure Settings**
   - Set Positive Order Threshold (minimum orders to mark as positive)
   - Apply ACOS Filter if needed (optional)

3. **Analyze**
   - Click "Analyze" button
   - View results in real-time

4. **Download**
   - Click "Download" to get Excel file with 4 sheets:
     - Positive Non-B0
     - Positive B0
     - Negative Non-B0
     - Negative B0

## File Formats

### Sponsored Products / Brands
- **Search Terms File**: Amazon Search Term Report (.xlsx)
- **Targeting File**: Amazon Targeting Report (.xlsx)

### Sponsored Display
- **Matched Target File**: Amazon Matched Target Report (.xlsx)
- **Targeting File**: Amazon Targeting Report (.xlsx)

## Key Metrics

**ACOS (Advertising Cost of Sales)**
```
ACOS = (Total Ad Spend / 14 Day Total Sales) × 100
```
- Lower ACOS = Better performance
- Filter to find keywords with ACOS > X

**Positive Keywords**
- Orders ≥ Threshold
- Not already in targeting file
- Recommended for expansion

**Negative Keywords**
- Orders = 0 (no conversions)
- Top 20% by spend (highest waste first)
- Recommended for negation

## Deployment

### Deploy Backend to Render

1. Push code to GitHub
2. Connect GitHub repo to Render
3. Set environment variables:
   - `PYTHON_VERSION`: 3.11.0
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `gunicorn app:app --timeout 300 --workers 2 --threads 2 --max-requests 50 --max-requests-jitter 10`

### Deploy Frontend to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variable:
   - `REACT_APP_BACKEND_URL`: Your Render backend URL
4. Deploy

## API Endpoints

### POST `/process`
Process uploaded files and return analysis

**Request:**
```
FormData:
- search_file: File
- targeting_file: File
- product_type: "products" | "brands" | "display"
- positive_order_threshold: number
```

**Response:**
```json
{
  "product_type": "products",
  "positive": {
    "no_b0": [...],
    "only_b0": [...]
  },
  "negative": {
    "no_b0": [...],
    "only_b0": [...]
  }
}
```

### POST `/download`
Generate and download Excel file with results

**Request:**
```
FormData:
- search_file: File
- targeting_file: File
- product_type: "products" | "brands" | "display"
- positive_order_threshold: number
```

**Response:** Excel file (.xlsx)

## Performance

**Processing Time:**
- Small files (< 5000 rows): 5-10 seconds
- Medium files (5000-20000 rows): 10-30 seconds
- Large files (> 20000 rows): 30-60 seconds

*Times vary based on server resources and file complexity*

## Troubleshooting

**"Failed to fetch" error**
- Check backend is running/deployed
- Verify backend URL in frontend code
- Check CORS is enabled

**Processing timeout**
- Try with smaller file
- Upgrade server plan for larger files
- Increase `--timeout` in gunicorn command

**Memory errors**
- Split large files into smaller batches
- Upgrade server plan
- Clear browser cache

## Future Enhancements

- [ ] Batch file processing
- [ ] API key authentication
- [ ] Historical data tracking
- [ ] Keyword recommendations ML model
- [ ] Campaign comparison analytics
- [ ] Auto-generated keyword suggestions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions, please:
1. Check existing GitHub issues
2. Create a new GitHub issue with detailed description
3. Include error messages and file examples if applicable

## Disclaimer

This tool is for informational purposes only. Always verify results before making changes to your Amazon advertising campaigns. The author is not responsible for any negative impacts from using this tool.

## Changelog

### v1.0.0 (2024-12-25)
- Initial release
- Support for SP, SB, SD campaigns
- ACOS calculation and filtering
- Excel export functionality
- Multi-tab interface

## Author

**Om Jadia**
- GitHub: [@jadiaom1010](https://github.com/jadiaom1010)
- Project: [Search-Term-Analyzer](https://github.com/jadiaom1010/Search-Term-Analyzer)

## Acknowledgments

- Amazon Advertising team for insights
- Pandas community for excellent data tools
- React and Flask communities

---

**Made with ☕ caffeine and 🚀 stubbornness**

© 2024 Search Term Analyzer™. All rights reserved.
