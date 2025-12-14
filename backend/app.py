from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import math

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

# ---------------- ROUTES ---------------- #

@app.route("/", methods=["GET"])
def health():
    return "Backend running"

@app.route("/process", methods=["POST"])
def process_files():
    try:
        # ---------- FILE VALIDATION ----------
        if "search_file" not in request.files or "targeting_file" not in request.files:
            return jsonify({"error": "Both files are required"}), 400

        search_file = request.files["search_file"]
        targeting_file = request.files["targeting_file"]

        threshold = int(request.form.get("positive_order_threshold", 1))

        # ---------- READ FILES ----------
        search_df = pd.read_excel(search_file)
        targeting_df = pd.read_excel(targeting_file)

        # ---------- NORMALIZE COLUMN NAMES ----------
        search_df.columns = search_df.columns.str.strip().str.lower()
        targeting_df.columns = targeting_df.columns.str.strip().str.lower()

        # ---------- RENAME COLUMNS ----------
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

        targeting_df.rename(columns={
            "targeting": TARGETING_COL
        }, inplace=True)

        # ---------- CLEAN & TYPE CAST ----------
        numeric_cols = [
            ORDERS_COL, SALES_COL, SPEND_COL,
            IMPRESSIONS_COL, CLICKS_COL
        ]

        for col in numeric_cols:
            search_df[col] = pd.to_numeric(search_df[col], errors="coerce").fillna(0)

        search_df[SEARCH_TERM_COL] = (
            search_df[SEARCH_TERM_COL].astype(str).str.strip().str.lower()
        )
        targeting_df[TARGETING_COL] = (
            targeting_df[TARGETING_COL].astype(str).str.strip().str.lower()
        )

        existing_targets = set(targeting_df[TARGETING_COL].unique())

        # =====================================================
        # 🟢 POSITIVE SEARCH TERMS (TOP 40%)
        # =====================================================
        positive_df = search_df[
            (search_df[ORDERS_COL] >= threshold) &
            (~search_df[SEARCH_TERM_COL].isin(existing_targets))
        ].sort_values(by=SALES_COL, ascending=False)

        pos_count = max(1, math.ceil(len(positive_df) * 0.4))
        positive_df = positive_df.head(pos_count)

        positive_no_b0 = positive_df[
            ~positive_df[SEARCH_TERM_COL].str.startswith("b0")
        ]

        positive_only_b0 = positive_df[
            positive_df[SEARCH_TERM_COL].str.startswith("b0")
        ]

        # =====================================================
        # 🔴 NEGATIVE SEARCH TERMS (TOP 20%)
        # =====================================================
        negative_df = search_df[
            (search_df[ORDERS_COL] == 0) &
            (~search_df[SEARCH_TERM_COL].isin(existing_targets))
        ].sort_values(by=SPEND_COL, ascending=False)

        neg_count = max(1, math.ceil(len(negative_df) * 0.2))
        negative_df = negative_df.head(neg_count)

        negative_no_b0 = negative_df[
            ~negative_df[SEARCH_TERM_COL].str.startswith("b0")
        ]

        negative_only_b0 = negative_df[
            negative_df[SEARCH_TERM_COL].str.startswith("b0")
        ]

        # ---------- RESPONSE FORMATTER (JSON SAFE + B0 CAPITAL) ----------
        def format_records(df):
            df = df.fillna({
                SEARCH_TERM_COL: "",
                CAMPAIGN_COL: "",
                ADGROUP_COL: "",
                MATCHTYPE_COL: "",
                ORDERS_COL: 0,
                SALES_COL: 0,
                SPEND_COL: 0,
                IMPRESSIONS_COL: 0,
                CLICKS_COL: 0
            })

            records = []
            for _, row in df.iterrows():
                search_term = str(row[SEARCH_TERM_COL])

                # 🔠 Capitalize ONLY b0 terms
                if search_term.startswith("b0"):
                    search_term = search_term.upper()

                records.append({
                    "customer search term": search_term,
                    "campaign name": row[CAMPAIGN_COL],
                    "ad group name": row[ADGROUP_COL],
                    "match type": row[MATCHTYPE_COL],
                    "14 day total orders (#)": int(row[ORDERS_COL]),
                    "14 day total sales": int(round(row[SALES_COL])),
                    "spend": int(round(row[SPEND_COL])),
                    "impressions": int(row[IMPRESSIONS_COL]),
                    "clicks": int(row[CLICKS_COL]),
                })

            return records

        return jsonify({
            "positive": {
                "no_b0": format_records(positive_no_b0),
                "only_b0": format_records(positive_only_b0)
            },
            "negative": {
                "no_b0": format_records(negative_no_b0),
                "only_b0": format_records(negative_only_b0)
            }
        })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
