import pandas as pd

from database import engine
from services.ml import predict_demand


def low_stock_risk():

    stock_query = """
    SELECT
        p.name,
        ps.size_name,
        ps.current_stock
    FROM product_sizes ps

    JOIN products p
        ON p.id = ps.product_id;
    """

    stock = pd.read_sql(
        stock_query,
        engine,
    )

    demand = pd.DataFrame(
        predict_demand()
    )

    df = stock.merge(
        demand,
        left_on=["name", "size_name"],
        right_on=["product", "size"],
    )

    result = []

    for _, row in df.iterrows():

        stock_qty = int(row.current_stock)

        daily_sales = max(
            float(row.predicted_quantity),
            0.1,
        )

        days_remaining = round(
            stock_qty / daily_sales,
            1,
        )

        if days_remaining <= 3:

            risk = "HIGH"
            status = "Restock within 3 days"

        elif days_remaining <= 7:

            risk = "MEDIUM"
            status = "Monitor inventory"

        elif days_remaining <= 14:

            risk = "LOW"
            status = "Inventory sufficient"

        else:

            risk = "SAFE"
            status = "No action required"

        result.append({

            "product": row["name"],

            "size": row["size_name"],

            "current_stock": stock_qty,

            "predicted_daily_sales": round(
                daily_sales,
                2,
            ),

            "days_until_empty": days_remaining,

            "risk": risk,

            "status": status,

        })

    priority = {
        "HIGH": 3,
        "MEDIUM": 2,
        "LOW": 1,
        "SAFE": 0,
    }

    result.sort(
        key=lambda x: (
            priority[x["risk"]],
            -x["days_until_empty"],
        ),
        reverse=True,
    )

    return {
        "products": result
    }