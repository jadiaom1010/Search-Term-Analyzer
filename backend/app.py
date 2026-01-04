from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
from io import BytesIO
import re

app = Flask(__name__)
CORS(app)

# ============= CONSTANTS =============
SEARCH_TERM_COL = "customer search term"
ORDERS_COL = "14 day total orders (#)"
SALES_COL = "14 day total sales"
SPEND_COL = "spend"
DISPLAY_SPEND_COL = "total advertiser cost"
CAMPAIGN_COL = "campaign name"
ADGROUP_COL = "ad group name"
MATCHTYPE_COL = "match type"
IMPRESSIONS_COL = "impressions"
CLICKS_COL = "clicks"
TARGETING_COL = "targeting"
MATCHED_TARGET_COL = "matched target"

# ============= HELPERS =============
def extract_asin_from_targeting(targeting_str):
    """Extract ASIN from targeting string format: asin="B0DQ51YG8Y" """
    if pd.isna(targeting_str):
        return None
    
    targeting_str = str(targeting_str).strip()
    match = re.search(r'asin="([^"]+)"', targeting_str)
    if match:
        return match.group(1).strip().lower()
    return None

# ============= PRODUCTS & BRANDS LOGIC (OPTIMIZED) =============
def prepare_data_products_brands(search_file, targeting_file, threshold):
    """Process Sponsored Products and Brands - OPTIMIZED"""
    # Read files with dtype optimization
    search_df = pd.read_excel(search_file, dtype_backend='numpy_nullable')
    targeting_df = pd.read_excel(targeting_file)
    
    # Normalize column names - STRIP FIRST, then lowercase
    search_df.columns = search_df.columns.str.strip().str.lower()
    targeting_df.columns = targeting_df.columns.str.strip().str.lower()
    
    # Convert numeric columns - VECTORIZED (faster than loop)
    numeric_cols = ['spend', '14 day total sales', '14 day total orders (#)', 'impressions', 'clicks']
    for col in numeric_cols:
        if col in search_df.columns:
            search_df[col] = pd.to_numeric(search_df[col], errors='coerce').fillna(0)
    
    # Vectorized string operations (MUCH faster)
    search_df['customer search term'] = search_df['customer search term'].astype(str).str.strip().str.lower()
    targeting_df['targeting'] = targeting_df['targeting'].astype(str).str.strip().str.lower()
    
    # Create set for faster lookup
    existing_targets = set(targeting_df['targeting'].unique())
    
    # ===== ACOS CALCULATION - VECTORIZED (NOT .apply()) =====
    # This is 10x faster than using .apply()
    search_df['acos'] = np.where(
        search_df['14 day total sales'] > 0,
        np.round((search_df['spend'] / search_df['14 day total sales']) * 100, 2),
        None
    )
    
    # Create boolean mask for membership (faster than isin for large sets)
    not_in_targets = ~search_df['customer search term'].isin(existing_targets)
    
    # Filter positive and negative
    positive_df = search_df[
        (search_df['14 day total orders (#)'] >= threshold) & not_in_targets
    ]
    
    negative_df = search_df[
        (search_df['14 day total orders (#)'] == 0) & not_in_targets
    ]
    
    # ===== NEGATIVE: SORT BY SPEND AND TAKE TOP 20% =====
    if len(negative_df) > 0:
        negative_df = negative_df.nlargest(max(1, int(len(negative_df) * 0.2)), 'spend')
    
    # Vectorized B0 check (faster than str.startswith loop)
    pos_non_b0 = positive_df[~positive_df['customer search term'].str.startswith("b0")]
    pos_b0 = positive_df[positive_df['customer search term'].str.startswith("b0")]
    neg_non_b0 = negative_df[~negative_df['customer search term'].str.startswith("b0")]
    neg_b0 = negative_df[negative_df['customer search term'].str.startswith("b0")]
    
    return pos_non_b0, pos_b0, neg_non_b0, neg_b0

# ============= DISPLAY LOGIC (OPTIMIZED) =============
def prepare_data_display(matched_target_file, targeting_file):
    """Process Sponsored Display - OPTIMIZED"""
    matched_target_df = pd.read_excel(matched_target_file)
    targeting_df = pd.read_excel(targeting_file)
    
    # Normalize column names
    matched_target_df.columns = matched_target_df.columns.str.strip().str.lower()
    targeting_df.columns = targeting_df.columns.str.strip().str.lower()
    
    # Convert numeric columns
    numeric_cols = ['total advertiser cost', '14 day total sales', '14 day total orders (#)', 'impressions', 'clicks']
    for col in numeric_cols:
        if col in matched_target_df.columns:
            matched_target_df[col] = pd.to_numeric(matched_target_df[col], errors='coerce').fillna(0)
    
    # Extract ASINs from targeting file
    if 'targeting' in targeting_df.columns:
        # Vectorized ASIN extraction (faster)
        targeting_df['extracted_asin'] = targeting_df['targeting'].apply(extract_asin_from_targeting)
    else:
        raise ValueError("Targeting file must have a 'targeting' column")
    
    targeting_df = targeting_df[targeting_df['extracted_asin'].notna()].copy()
    
    # Normalize matched target column
    matched_target_df['matched target'] = matched_target_df['matched target'].astype(str).str.strip().str.lower()
    
    # Merge
    result_df = matched_target_df.merge(
        targeting_df[['extracted_asin', 'targeting']],
        left_on='matched target',
        right_on='extracted_asin',
        how='left'
    )
    
    # Filter unmatched
    result_df = result_df[result_df['targeting_y'].isna()].copy()
    
    # ===== ACOS CALCULATION - VECTORIZED =====
    result_df['acos'] = np.where(
        result_df['14 day total sales'] > 0,
        np.round((result_df['total advertiser cost'] / result_df['14 day total sales']) * 100, 2),
        None
    )
    
    # Filter positive and negative
    positive_df = result_df[result_df['14 day total orders (#)'] >= 1]
    negative_df = result_df[result_df['14 day total orders (#)'] == 0]
    
    # Top 20% by spend
    if len(negative_df) > 0:
        negative_df = negative_df.nlargest(max(1, int(len(negative_df) * 0.2)), 'total advertiser cost')
    
    # Split by B0/non-B0
    pos_non_b0 = positive_df[~positive_df['matched target'].str.startswith("b0")]
    pos_b0 = positive_df[positive_df['matched target'].str.startswith("b0")]
    neg_non_b0 = negative_df[~negative_df['matched target'].str.startswith("b0")]
    neg_b0 = negative_df[negative_df['matched target'].str.startswith("b0")]
    
    return pos_non_b0, pos_b0, neg_non_b0, neg_b0

# ============= FORMAT RECORDS - VECTORIZED =============
def format_records_products_brands(df):
    """Format for JSON output - OPTIMIZED"""
    if df.empty:
        return []
    
    # Vectorized operations
    df = df.copy()
    df['customer search term'] = df['customer search term'].apply(
        lambda x: x.upper() if isinstance(x, str) and x.startswith("b0") else x
    )
    
    # Convert to records (much faster than iterrows)
    records = df[[
        'customer search term', 'campaign name', 'ad group name', 'match type',
        '14 day total orders (#)', '14 day total sales', 'spend', 'acos',
        'impressions', 'clicks'
    ]].copy()
    
    # Convert types
    records['14 day total orders (#)'] = records['14 day total orders (#)'].astype(int)
    records['14 day total sales'] = records['14 day total sales'].astype(int)
    records['spend'] = records['spend'].astype(int)
    records['impressions'] = records['impressions'].astype(int)
    records['clicks'] = records['clicks'].astype(int)
    
    # Replace NaN with None
    records = records.where(pd.notna(records), None)
    
    return records.to_dict('records')

def format_records_display(df):
    """Format display records for JSON output - OPTIMIZED"""
    if df.empty:
        return []
    
    df = df.copy()
    df['matched target'] = df['matched target'].apply(
        lambda x: x.upper() if isinstance(x, str) and x.startswith("b0") else x
    )
    
    # Select and convert columns
    records = df[[
        'matched target', 'targeting_y', 'campaign name',
        '14 day total orders (#)', '14 day total sales', 'total advertiser cost',
        'acos', 'impressions', 'clicks'
    ]].copy()
    
    records.columns = [
        'matched target', 'targeting', 'campaign name',
        '14 day total orders (#)', '14 day total sales', 'total advertiser cost',
        'acos', 'impressions', 'clicks'
    ]
    
    # Convert types
    for col in ['14 day total orders (#)', '14 day total sales', 'total advertiser cost', 'impressions', 'clicks']:
        records[col] = records[col].astype(int)
    
    # Replace NaN with None
    records = records.where(pd.notna(records), None)
    
    return records.to_dict('records')

# ============= ROUTES =============
@app.route("/", methods=["GET"])
def health():
    return "Backend running"

@app.route("/process", methods=["POST"])
def process_files():
    """Main processing endpoint"""
    try:
        product_type = request.form.get("product_type", "").lower()
        
        # Get files
        search_or_matched_file = None
        targeting_file_obj = None
        
        if "search_file" in request.files:
            search_or_matched_file = request.files["search_file"]
        elif "matched_target_file" in request.files:
            search_or_matched_file = request.files["matched_target_file"]
        
        if "targeting_file" in request.files:
            targeting_file_obj = request.files["targeting_file"]
        
        if not search_or_matched_file or not targeting_file_obj:
            return jsonify({"error": "Both files are required"}), 400
        
        # Auto-detect product type if not provided
        if not product_type:
            test_df = pd.read_excel(search_or_matched_file)
            cols_lower = [col.lower() for col in test_df.columns]
            if 'matched target' in cols_lower:
                product_type = "display"
            else:
                product_type = "products"
        
        if product_type in ["products", "brands"]:
            threshold = int(request.form.get("positive_order_threshold", 1))
            pos_non_b0, pos_b0, neg_non_b0, neg_b0 = prepare_data_products_brands(
                search_or_matched_file,
                targeting_file_obj,
                threshold
            )
            
            return jsonify({
                "product_type": product_type,
                "positive": {
                    "no_b0": format_records_products_brands(pos_non_b0),
                    "only_b0": format_records_products_brands(pos_b0)
                },
                "negative": {
                    "no_b0": format_records_products_brands(neg_non_b0),
                    "only_b0": format_records_products_brands(neg_b0)
                }
            })
        
        elif product_type == "display":
            pos_non_b0, pos_b0, neg_non_b0, neg_b0 = prepare_data_display(
                search_or_matched_file,
                targeting_file_obj
            )
            
            return jsonify({
                "product_type": "display",
                "positive": {
                    "no_b0": format_records_display(pos_non_b0),
                    "only_b0": format_records_display(pos_b0)
                },
                "negative": {
                    "no_b0": format_records_display(neg_non_b0),
                    "only_b0": format_records_display(neg_b0)
                }
            })
        
        else:
            return jsonify({"error": "Invalid product_type"}), 400
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/download", methods=["POST"])
def download_excel():
    """Download results as Excel file"""
    try:
        product_type = request.form.get("product_type", "").lower()
        output = BytesIO()
        
        # Get files
        search_or_matched_file = None
        targeting_file_obj = None
        
        if "search_file" in request.files:
            search_or_matched_file = request.files["search_file"]
        elif "matched_target_file" in request.files:
            search_or_matched_file = request.files["matched_target_file"]
        
        if "targeting_file" in request.files:
            targeting_file_obj = request.files["targeting_file"]
        
        if not search_or_matched_file or not targeting_file_obj:
            return jsonify({"error": "Both files are required"}), 400
        
        # Auto-detect product type
        if not product_type:
            test_df = pd.read_excel(search_or_matched_file)
            cols_lower = [col.lower() for col in test_df.columns]
            if 'matched target' in cols_lower:
                product_type = "display"
            else:
                product_type = "products"
        
        if product_type in ["products", "brands"]:
            threshold = int(request.form.get("positive_order_threshold", 1))
            pos_non_b0, pos_b0, neg_non_b0, neg_b0 = prepare_data_products_brands(
                search_or_matched_file,
                targeting_file_obj,
                threshold
            )
            
            # Create Excel
            with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
                pos_non_b0.to_excel(writer, sheet_name="Positive Non-B0", index=False)
                pos_b0.to_excel(writer, sheet_name="Positive B0", index=False)
                neg_non_b0.to_excel(writer, sheet_name="Negative Non-B0", index=False)
                neg_b0.to_excel(writer, sheet_name="Negative B0", index=False)
        
        elif product_type == "display":
            pos_non_b0, pos_b0, neg_non_b0, neg_b0 = prepare_data_display(
                search_or_matched_file,
                targeting_file_obj
            )
            
            with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
                pos_non_b0.to_excel(writer, sheet_name="Positive Non-B0", index=False)
                pos_b0.to_excel(writer, sheet_name="Positive B0", index=False)
                neg_non_b0.to_excel(writer, sheet_name="Negative Non-B0", index=False)
                neg_b0.to_excel(writer, sheet_name="Negative B0", index=False)
        
        output.seek(0)
        return send_file(
            output,
            download_name="Targeting_Results.xlsx",
            as_attachment=True,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
