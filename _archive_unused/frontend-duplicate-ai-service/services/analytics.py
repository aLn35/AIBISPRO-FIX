import pandas as pd
from prophet import Prophet
from sqlalchemy import text

from database import engine


# ===========================
# Load Sales Dataset
# ===========================
def load_sales():
    query = """
    SELECT
        s.id,
        s.transaction_date,
        s.total_amount,
        s.payment_method,
        s.total_items
    FROM sales s
    ORDER BY s.transaction_date;
    """

    return pd.read_sql(query, engine)


# ===========================
# Dashboard Summary
# ===========================
def dashboard_summary():

    with engine.connect() as conn:

        today_revenue = conn.execute(
            text("""
                SELECT COALESCE(SUM(total_amount),0)
                FROM sales
                WHERE DATE(transaction_date)=CURRENT_DATE;
            """)
        ).scalar()

        weekly_revenue = conn.execute(
            text("""
                SELECT COALESCE(SUM(total_amount),0)
                FROM sales
                WHERE transaction_date >= CURRENT_DATE - INTERVAL '7 days';
            """)
        ).scalar()

        monthly_revenue = conn.execute(
            text("""
                SELECT COALESCE(SUM(total_amount),0)
                FROM sales
                WHERE DATE_TRUNC('month', transaction_date)
                = DATE_TRUNC('month', CURRENT_DATE);
            """)
        ).scalar()

        total_transactions = conn.execute(
            text("""
                SELECT COUNT(*)
                FROM sales;
            """)
        ).scalar()

        average_order = conn.execute(
            text("""
                SELECT COALESCE(AVG(total_amount),0)
                FROM sales;
            """)
        ).scalar()

        top_products = conn.execute(
            text("""
                SELECT
                    p.name,
                    SUM(si.quantity) AS quantity
                FROM sale_items si
                JOIN products p
                    ON p.id = si.product_id
                GROUP BY p.name
                ORDER BY quantity DESC
                LIMIT 5;
            """)
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
# Prophet Forecast
# ===========================
def forecast_sales(days: int = 30):

    query = """
    SELECT
        DATE(transaction_date) AS ds,
        SUM(total_amount) AS y
    FROM sales
    GROUP BY DATE(transaction_date)
    ORDER BY ds;
    """

    df = pd.read_sql(query, engine)

    df["ds"] = pd.to_datetime(df["ds"])

    model = Prophet()

    model.fit(df)

    future = model.make_future_dataframe(periods=days)

    forecast = model.predict(future)

    future_data = forecast.tail(days)

    return {
        "training_days": len(df),
        "forecast_days": days,
        "forecast": [
            {
                "date": row.ds.strftime("%Y-%m-%d"),
                "predicted_revenue": round(float(row.yhat), 2),
                "lower_bound": round(float(row.yhat_lower), 2),
                "upper_bound": round(float(row.yhat_upper), 2),
            }
            for _, row in future_data.iterrows()
        ],
    }


# ===========================
# AI Restock Prediction
# ===========================
def restock_prediction():

    query = text("""
        WITH selling_days AS (
            SELECT COUNT(DISTINCT DATE(transaction_date)) AS days
            FROM sales
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

        GROUP BY
            p.name,
            ps.size_name,
            ps.current_stock

        ORDER BY
            p.name,
            ps.size_name;
    """)

    with engine.connect() as conn:
        rows = conn.execute(query).mappings().all()

    result = []

    for row in rows:

        avg = float(row["average_daily_sales"])
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