import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sqlalchemy import text

from database import engine


# ===========================
# Load Sales Dataset
# ===========================
def load_sales(company_id: int):
    query = text("""
    SELECT
        s.id,
        s.transaction_date,
        s.total_amount,
        s.payment_method,
        s.total_items
    FROM sales s
    WHERE s.company_id = :company_id
      AND s.source = 'upload'
    ORDER BY s.transaction_date;
    """)

    return pd.read_sql(query, engine, params={"company_id": company_id})


# ===========================
# Dashboard Summary
# ===========================
def dashboard_summary(company_id: int):

    params = {"company_id": company_id}

    with engine.connect() as conn:

        today_revenue = conn.execute(
            text("""
                SELECT COALESCE(SUM(total_amount),0)
                FROM sales
                WHERE company_id = :company_id
                  AND source = 'upload'
                  AND DATE(transaction_date)=CURRENT_DATE;
            """),
            params,
        ).scalar()

        weekly_revenue = conn.execute(
            text("""
                SELECT COALESCE(SUM(total_amount),0)
                FROM sales
                WHERE company_id = :company_id
                  AND source = 'upload'
                  AND transaction_date >= CURRENT_DATE - INTERVAL '7 days';
            """),
            params,
        ).scalar()

        monthly_revenue = conn.execute(
            text("""
                SELECT COALESCE(SUM(total_amount),0)
                FROM sales
                WHERE company_id = :company_id
                  AND source = 'upload'
                  AND DATE_TRUNC('month', transaction_date)
                = DATE_TRUNC('month', CURRENT_DATE);
            """),
            params,
        ).scalar()

        total_transactions = conn.execute(
            text("""
                SELECT COUNT(*)
                FROM sales
                WHERE company_id = :company_id
                  AND source = 'upload';
            """),
            params,
        ).scalar()

        average_order = conn.execute(
            text("""
                SELECT COALESCE(AVG(total_amount),0)
                FROM sales
                WHERE company_id = :company_id
                  AND source = 'upload';
            """),
            params,
        ).scalar()

        top_products = conn.execute(
            text("""
                SELECT
                    p.name,
                    SUM(si.quantity) AS quantity
                FROM sale_items si
                JOIN sales s
                    ON s.id = si.sale_id
                JOIN products p
                    ON p.id = si.product_id
                WHERE s.company_id = :company_id
                  AND s.source = 'upload'
                GROUP BY p.name
                ORDER BY quantity DESC
                LIMIT 5;
            """),
            params,
        ).fetchall()

    return {
        "today_revenue": float(today_revenue),
        "weekly_revenue": float(weekly_revenue),
        "monthly_revenue": float(monthly_revenue),
        "total_transactions": int(total_transactions),
        "average_order_value": round(float(average_order), 2),
        "top_products": [
            {
                "product": row.name,
                "quantity": int(row.quantity),
            }
            for row in top_products
        ],
    }


# ===========================
# Holt-Winters Forecast
# ===========================
def forecast_sales(company_id: int, days: int = 30):

    query = text("""
    SELECT
        DATE(transaction_date) AS ds,
        SUM(total_amount) AS y
    FROM sales
    WHERE company_id = :company_id
      AND source = 'upload'
    GROUP BY DATE(transaction_date)
    ORDER BY ds;
    """)

    df = pd.read_sql(query, engine, params={"company_id": company_id})

    df["ds"] = pd.to_datetime(df["ds"])

    if len(df) < 2:
        return {
            "training_days": len(df),
            "forecast_days": days,
            "forecast": [],
        }

    # Fill any missing calendar days in the history with 0 revenue so the
    # series has a fixed daily frequency (required by ExponentialSmoothing).
    full_range = pd.date_range(df["ds"].min(), df["ds"].max(), freq="D")
    series = df.set_index("ds")["y"].reindex(full_range, fill_value=0.0)

    use_seasonal = len(series) >= 14  # need >= 2 full weekly cycles

    try:
        model = ExponentialSmoothing(
            series,
            trend="add",
            seasonal="add" if use_seasonal else None,
            seasonal_periods=7 if use_seasonal else None,
            initialization_method="estimated",
        ).fit()

        fitted_values = model.fittedvalues
        yhat = model.forecast(days)
    except Exception:
        # Sparse/degenerate series (e.g. all zeros, too few points) - fall
        # back to a naive flat forecast off the mean rather than crashing.
        mean_val = float(series.mean())
        fitted_values = pd.Series([mean_val] * len(series), index=series.index)
        yhat = pd.Series([mean_val] * days,
                          index=pd.date_range(series.index[-1] + pd.Timedelta(days=1), periods=days, freq="D"))

    residuals = series.values - fitted_values.values
    resid_std = float(np.std(residuals)) if len(residuals) > 1 else 0.0
    margin = 1.96 * resid_std

    return {
        "training_days": len(df),
        "forecast_days": days,
        "forecast": [
            {
                "date": date.strftime("%Y-%m-%d"),
                "predicted_revenue": round(max(float(value), 0), 2),
                "lower_bound": round(max(float(value) - margin, 0), 2),
                "upper_bound": round(float(value) + margin, 2),
            }
            for date, value in yhat.items()
        ],
    }


# ===========================
# AI Restock Prediction
# ===========================
def restock_prediction(company_id: int):

    query = text("""
        WITH selling_days AS (
            SELECT COUNT(DISTINCT DATE(transaction_date)) AS days
            FROM sales
            WHERE company_id = :company_id
              AND source = 'upload'
        )

        SELECT
            p.name,
            ps.size_name,
            ps.current_stock,

            COALESCE(SUM(si.quantity),0) AS total_sold,

            ROUND(
                COALESCE(SUM(si.quantity),0)::numeric
                /
                NULLIF((SELECT days FROM selling_days),0),
                2
            ) AS average_daily_sales

        FROM product_sizes ps

        JOIN products p
            ON p.id = ps.product_id

        LEFT JOIN sale_items si
            ON si.product_size_id = ps.id

        LEFT JOIN sales s
            ON s.id = si.sale_id
           AND s.source = 'upload'

        WHERE p.company_id = :company_id

        GROUP BY
            p.name,
            ps.size_name,
            ps.current_stock

        ORDER BY
            p.name,
            ps.size_name;
    """)

    with engine.connect() as conn:
        rows = conn.execute(query, {"company_id": company_id}).mappings().all()

    result = []

    for row in rows:

        avg = float(row["average_daily_sales"]) if row["average_daily_sales"] is not None else 0.0
        stock = int(row["current_stock"])

        if avg == 0:

            days_remaining = None
            recommendation = "No Sales Data"

        else:

            days_remaining = round(stock / avg, 1)

            if days_remaining <= 3:
                recommendation = "Restock Immediately"

            elif days_remaining <= 7:
                recommendation = "Restock Soon"

            elif days_remaining <= 14:
                recommendation = "Monitor Stock"

            else:
                recommendation = "Stock Healthy"

        result.append({
            "product": row["name"],
            "size": row["size_name"],
            "current_stock": stock,
            "total_sold": int(row["total_sold"]),
            "average_daily_sales": avg,
            "days_remaining": days_remaining,
            "recommendation": recommendation,
        })

    return result
