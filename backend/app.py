from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
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
def safe_value(val):
    """Convert NaN to None for JSON safety"""
    if pd.isna(val):
        return None
    return val

def extract_asin_from_targeting(targeting_str):
    """Extract ASIN from targeting string format: asin="B0DQ51YG8Y" """
    if pd.isna(targeting_str):
        return None
    
    targeting_str = str(targeting_str).strip()
    match = re.search(r'asin="([^"]+)"', targeting_str)
    if match:
        return match.group(1).strip().lower()
    return None

# ============= PRODUCTS & BRANDS LOGIC =============
def prepare_data_products_brands(search_file, targeting_file, threshold):
    """Process Sponsored Products and Brands"""
    search_df = pd.read_excel(search_file)
    targeting_df = pd.read_excel(targeting_file)
    
    # Normalize column names - STRIP FIRST, then lowercase
    search_df.columns = search_df.columns.str.strip().str.lower()
    targeting_df.columns = targeting_df.columns.str.strip().str.lower()
    
    # Convert numeric columns
    for col in ['spend', '14 day total sales', '14 day total orders (#)', 'impressions', 'clicks']:
        if col in search_df.columns:
            search_df[col] = pd.to_numeric(search_df[col], errors='coerce').fillna(0)
    
    # Clean search terms
    search_df['customer search term'] = (
        search_df['customer search term'].astype(str).str.strip().str.lower()
    )
    
    targeting_df['targeting'] = (
        targeting_df['targeting'].astype(str).str.strip().str.lower()
    )
    
    existing_targets = set(targeting_df['targeting'].unique())
    
    # ===== ACOS CALCULATION =====
    search_df['acos'] = search_df.apply(
        lambda r: round((r['spend'] / r['14 day total sales']) * 100, 2)
        if r['14 day total sales'] > 0 else None,
        axis=1
    )
    
    # Filter positive and negative
    positive_df = search_df[
        (search_df['14 day total orders (#)'] >= threshold) &
        (~search_df['customer search term'].isin(existing_targets))
    ]
    
    negative_df = search_df[
        (search_df['14 day total orders (#)'] == 0) &
        (~search_df['customer search term'].isin(existing_targets))
    ]
    
    # ===== NEGATIVE: SORT BY SPEND (largest first) AND TAKE TOP 20% =====
    negative_df = negative_df.sort_values('spend', ascending=False)
    top_20_percent_count = max(1, int(len(negative_df) * 0.2))
    negative_df = negative_df.head(top_20_percent_count)
    
    pos_non_b0 = positive_df[~positive_df['customer search term'].str.startswith("b0")]
    pos_b0 = positive_df[positive_df['customer search term'].str.startswith("b0")]
    neg_non_b0 = negative_df[~negative_df['customer search term'].str.startswith("b0")]
    neg_b0 = negative_df[negative_df['customer search term'].str.startswith("b0")]
    
    return pos_non_b0, pos_b0, neg_non_b0, neg_b0

# ============= DISPLAY LOGIC =============
def prepare_data_display(matched_target_file, targeting_file):
    """Process Sponsored Display"""
    matched_target_df = pd.read_excel(matched_target_file)
    targeting_df = pd.read_excel(targeting_file)
    
    # Normalize column names
    matched_target_df.columns = matched_target_df.columns.str.strip().str.lower()
    targeting_df.columns = targeting_df.columns.str.strip().str.lower()
    
    # Convert numeric columns
    for col in ['total advertiser cost', '14 day total sales', '14 day total orders (#)', 'impressions', 'clicks']:
        if col in matched_target_df.columns:
            matched_target_df[col] = pd.to_numeric(matched_target_df[col], errors='coerce').fillna(0)
    
    # Extract ASINs from targeting file
    if 'targeting' in targeting_df.columns:
        targeting_df['extracted_asin'] = targeting_df['targeting'].apply(extract_asin_from_targeting)
    else:
        raise ValueError("Targeting file must have a 'targeting' column")
    
    targeting_df = targeting_df[targeting_df['extracted_asin'].notna()].copy()
    
    # Lookup: Match ASINs
    matched_target_df['matched target'] = matched_target_df['matched target'].astype(str).str.strip().str.lower()
    
    result_df = matched_target_df.merge(
        targeting_df[['extracted_asin', 'targeting']],
        left_on='matched target',
        right_on='extracted_asin',
        how='left'
    )
    
    # After merge, the targeting from targeting_file becomes 'targeting_y'
    result_df = result_df[result_df['targeting_y'].isna()].copy()
    
    # ===== ACOS CALCULATION FOR DISPLAY =====
    result_df['acos'] = result_df.apply(
        lambda r: round((r['total advertiser cost'] / r['14 day total sales']) * 100, 2)
        if r['14 day total sales'] > 0 else None,
        axis=1
    )
    
    # ===== FILTER POSITIVE (orders >= 1, keep all) =====
    positive_df = result_df[result_df['14 day total orders (#)'] >= 1]
    
    # ===== FILTER NEGATIVE (orders = 0, top 20% by spend) =====
    negative_df = result_df[result_df['14 day total orders (#)'] == 0]
    
    # Sort by spend (largest first) and take top 20%
    negative_df = negative_df.sort_values('total advertiser cost', ascending=False)
    top_20_percent_count = max(1, int(len(negative_df) * 0.2))
    negative_df = negative_df.head(top_20_percent_count)
    
    # Split by B0/non-B0 (ASIN starts with B0)
    pos_non_b0 = positive_df[~positive_df['matched target'].str.startswith("b0")]
    pos_b0 = positive_df[positive_df['matched target'].str.startswith("b0")]
    neg_non_b0 = negative_df[~negative_df['matched target'].str.startswith("b0")]
    neg_b0 = negative_df[negative_df['matched target'].str.startswith("b0")]
    
    return pos_non_b0, pos_b0, neg_non_b0, neg_b0

# ============= FORMAT RECORDS =============
def format_records_products_brands(df):
    """Format for output"""
    records = []
    for _, row in df.iterrows():
        term = safe_value(row.get('customer search term'))
        if isinstance(term, str) and term.startswith("b0"):
            term = term.upper()
        
        records.append({
            "customer search term": term,
            "campaign name": safe_value(row.get('campaign name')),
            "ad group name": safe_value(row.get('ad group name')),
            "match type": safe_value(row.get('match type')),
            "14 day total orders (#)": int(row.get('14 day total orders (#)', 0)),
            "14 day total sales": int(round(row.get('14 day total sales', 0))),
            "spend": int(round(row.get('spend', 0))),
            "acos": safe_value(row.get('acos')),
            "impressions": int(row.get('impressions', 0)),
            "clicks": int(row.get('clicks', 0))
        })
    return records

def format_records_display(df):
    """Format display records for output"""
    records = []
    for _, row in df.iterrows():
        matched_target = safe_value(row.get('matched target'))
        if isinstance(matched_target, str) and matched_target.startswith("b0"):
            matched_target = matched_target.upper()
        
        # After merge, 'targeting' from targeting_file becomes 'targeting_y'
        targeting_val = safe_value(row.get('targeting_y')) if 'targeting_y' in row.index else safe_value(row.get('targeting'))
        
        records.append({
            "matched target": matched_target,
            "targeting": targeting_val,
            "campaign name": safe_value(row.get('campaign name')),
            "14 day total orders (#)": int(row.get('14 day total orders (#)', 0)),
            "14 day total sales": int(round(row.get('14 day total sales', 0))),
            "total advertiser cost": int(round(row.get('total advertiser cost', 0))),
            "acos": safe_value(row.get('acos')),
            "impressions": int(row.get('impressions', 0)),
            "clicks": int(row.get('clicks', 0))
        })
    return records

# ============= ROUTES =============
@app.route("/", methods=["GET"])
def health():
    return "Backend running"

@app.route("/process", methods=["POST", "OPTIONS"])
def process_files():
    """Main processing endpoint"""
    if request.method == "OPTIONS":
        return "", 200
    
    try:
        product_type = request.form.get("product_type", "").lower()
        
        # Handle both naming conventions
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
            try:
                test_df = pd.read_excel(search_or_matched_file)
                cols_lower = [col.lower() for col in test_df.columns]
                if 'matched target' in cols_lower:
                    product_type = "display"
                elif 'customer search term' in cols_lower:
                    product_type = "products"
                else:
                    product_type = "products"
            except Exception as e:
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

@app.route("/download", methods=["POST", "OPTIONS"])
def download_excel():
    """Download results as Excel file"""
    if request.method == "OPTIONS":
        return "", 200
    
    try:
        product_type = request.form.get("product_type", "").lower()
        output = BytesIO()
        
        # Handle both naming conventions
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
            try:
                test_df = pd.read_excel(search_or_matched_file)
                cols_lower = [col.lower() for col in test_df.columns]
                if 'matched target' in cols_lower:
                    product_type = "display"
                elif 'customer search term' in cols_lower:
                    product_type = "products"
                else:
                    product_type = "products"
            except Exception as e:
                product_type = "products"
        
        if product_type in ["products", "brands"]:
            threshold = int(request.form.get("positive_order_threshold", 1))
            pos_non_b0, pos_b0, neg_non_b0, neg_b0 = prepare_data_products_brands(
                search_or_matched_file,
                targeting_file_obj,
                threshold
            )
            
            pos_b0_copy = pos_b0.copy()
            neg_b0_copy = neg_b0.copy()
            
            pos_b0_copy['customer search term'] = pos_b0_copy['customer search term'].str.upper()
            neg_b0_copy['customer search term'] = neg_b0_copy['customer search term'].str.upper()
            
            with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
                pos_non_b0.to_excel(writer, sheet_name="Positive Non-B0", index=False)
                pos_b0_copy.to_excel(writer, sheet_name="Positive B0", index=False)
                neg_non_b0.to_excel(writer, sheet_name="Negative Non-B0", index=False)
                neg_b0_copy.to_excel(writer, sheet_name="Negative B0", index=False)
        
        elif product_type == "display":
            pos_non_b0, pos_b0, neg_non_b0, neg_b0 = prepare_data_display(
                search_or_matched_file,
                targeting_file_obj
            )
            
            pos_non_b0_copy = pos_non_b0.copy()
            pos_b0_copy = pos_b0.copy()
            neg_non_b0_copy = neg_non_b0.copy()
            neg_b0_copy = neg_b0.copy()
            
            pos_non_b0_copy['matched target'] = pos_non_b0_copy['matched target'].str.upper()
            pos_b0_copy['matched target'] = pos_b0_copy['matched target'].str.upper()
            neg_non_b0_copy['matched target'] = neg_non_b0_copy['matched target'].str.upper()
            neg_b0_copy['matched target'] = neg_b0_copy['matched target'].str.upper()
            
            with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
                pos_non_b0_copy.to_excel(writer, sheet_name="Positive Non-B0", index=False)
                pos_b0_copy.to_excel(writer, sheet_name="Positive B0", index=False)
                neg_non_b0_copy.to_excel(writer, sheet_name="Negative Non-B0", index=False)
                neg_b0_copy.to_excel(writer, sheet_name="Negative B0", index=False)
        
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
