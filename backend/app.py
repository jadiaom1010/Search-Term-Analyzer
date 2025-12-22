from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
from io import BytesIO

app = Flask(__name__)
CORS(app)

# ---------------- CONFIG ---------------- #

SEARCH_TERM_COL = "customer search term"
ORDERS_COL = "14 day total orders (#)"
SALES_COL = "14 day total sales"
SPEND_COL = "spend"

CAMPAIGN_COL = "campaign name"
ADGROUP_COL = "ad group name"
MATCHTYPE_COL = "match type"
IMPRESSIONS_COL = "impressions"
CLICKS_COL = "clicks"

TARGETING_COL = "targeting"

# ---------------- HELPERS ---------------- #

def safe_value(val):
    """Convert NaN to None for JSON safety"""
    if pd.isna(val):
        return None
    return val

# ---------------- COMMON LOGIC ---------------- #

def prepare_data(search_file, targeting_file, threshold):
    search_df = pd.read_excel(search_file)
    targeting_df = pd.read_excel(targeting_file)

    search_df.columns = search_df.columns.str.strip().str.lower()
    targeting_df.columns = targeting_df.columns.str.strip().str.lower()

    search_df.rename(columns={
        "customer search term": SEARCH_TERM_COL,
        "campaign name": CAMPAIGN_COL,
        "ad group name": ADGROUP_COL,
        "match type": MATCHTYPE_COL,
        "14 day total orders (#)": ORDERS_COL,
        "14 day total sales": SALES_COL,
        "spend": SPEND_COL,
        "impressions": IMPRESSIONS_COL,
        "clicks": CLICKS_COL
    }, inplace=True)

    targeting_df.rename(columns={"targeting": TARGETING_COL}, inplace=True)

    numeric_cols = [
        ORDERS_COL, SALES_COL, SPEND_COL,
        IMPRESSIONS_COL, CLICKS_COL
    ]
    for col in numeric_cols:
        search_df[col] = pd.to_numeric(search_df[col], errors="coerce").fillna(0)

    search_df[SEARCH_TERM_COL] = (
        search_df[SEARCH_TERM_COL]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    targeting_df[TARGETING_COL] = (
        targeting_df[TARGETING_COL]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    existing_targets = set(targeting_df[TARGETING_COL].unique())

    # ---------- ACOS (no filters, just calculation) ----------
    search_df["acos"] = search_df.apply(
        lambda r: round((r[SPEND_COL] / r[SALES_COL]) * 100, 2)
        if r[SALES_COL] > 0 else None,
        axis=1
    )

    # ---------- POSITIVE ----------
    positive_df = search_df[
        (search_df[ORDERS_COL] >= threshold) &
        (~search_df[SEARCH_TERM_COL].isin(existing_targets))
    ]

    pos_non_b0 = positive_df[~positive_df[SEARCH_TERM_COL].str.startswith("b0")]
    pos_b0 = positive_df[positive_df[SEARCH_TERM_COL].str.startswith("b0")]

    # ---------- NEGATIVE ----------
    negative_df = search_df[
        (search_df[ORDERS_COL] == 0) &
        (~search_df[SEARCH_TERM_COL].isin(existing_targets))
    ]

    neg_non_b0 = negative_df[~negative_df[SEARCH_TERM_COL].str.startswith("b0")]
    neg_b0 = negative_df[negative_df[SEARCH_TERM_COL].str.startswith("b0")]

    return pos_non_b0, pos_b0, neg_non_b0, neg_b0


def format_records(df):
    records = []

    for _, row in df.iterrows():
        term = safe_value(row[SEARCH_TERM_COL])
        if isinstance(term, str) and term.startswith("b0"):
            term = term.upper()

        records.append({
            "customer search term": term,
            "campaign name": safe_value(row[CAMPAIGN_COL]),
            "ad group name": safe_value(row[ADGROUP_COL]),
            "match type": safe_value(row[MATCHTYPE_COL]),
            "14 day total orders (#)": int(row[ORDERS_COL]),
            "14 day total sales": int(round(row[SALES_COL])),
            "spend": int(round(row[SPEND_COL])),
            "acos": safe_value(row["acos"]),
            "impressions": int(row[IMPRESSIONS_COL]),
            "clicks": int(row[CLICKS_COL])
        })

    return records

# ---------------- ROUTES ---------------- #

@app.route("/", methods=["GET"])
def health():
    return "Backend running"

@app.route("/process", methods=["POST"])
def process_files():
    try:
        if "search_file" not in request.files or "targeting_file" not in request.files:
            return jsonify({"error": "Both files are required"}), 400

        threshold = int(request.form.get("positive_order_threshold", 1))

        pos_non_b0, pos_b0, neg_non_b0, neg_b0 = prepare_data(
            request.files["search_file"],
            request.files["targeting_file"],
            threshold
        )

        return jsonify({
            "positive": {
                "no_b0": format_records(pos_non_b0),
                "only_b0": format_records(pos_b0)
            },
            "negative": {
                "no_b0": format_records(neg_non_b0),
                "only_b0": format_records(neg_b0)
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/download", methods=["POST"])
def download_excel():
    try:
        if "search_file" not in request.files or "targeting_file" not in request.files:
            return jsonify({"error": "Both files are required"}), 400

        threshold = int(request.form.get("positive_order_threshold", 1))

        pos_non_b0, pos_b0, neg_non_b0, neg_b0 = prepare_data(
            request.files["search_file"],
            request.files["targeting_file"],
            threshold
        )

        pos_b0[SEARCH_TERM_COL] = pos_b0[SEARCH_TERM_COL].str.upper()
        neg_b0[SEARCH_TERM_COL] = neg_b0[SEARCH_TERM_COL].str.upper()

        output = BytesIO()
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
