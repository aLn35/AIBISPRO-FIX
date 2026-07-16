import pandas as pd

from database import engine
from services.ml import predict_demand


def recommendation_engine():

    stock_query = """
    SELECT
        p.name,
        ps.size_name,
        ps.current_stock
    FROM product_sizes ps

    JOIN products p
        ON p.id = ps.product_id;
    """

    stock = pd.read_sql(stock_query, engine)

    demand = pd.DataFrame(
        predict_demand()
    )

    df = stock.merge(
        demand,
        left_on=["name", "size_name"],
        right_on=["product", "size"],
    )

    recommendations = []

    for _, row in df.iterrows():

        stock_qty = int(row.current_stock)
        demand_qty = float(row.predicted_quantity)

        # Risk Score
        if stock_qty <= demand_qty * 2:

            action = "Restock Immediately"
            priority = "HIGH"

        elif stock_qty <= demand_qty * 5:

            action = "Prepare Additional Stock"
            priority = "MEDIUM"

        elif demand_qty <= 1:

            action = "Consider Promotion"
            priority = "LOW"

        else:

            action = "No Action"
            priority = "NORMAL"

        recommendations.append({

            "product": row["name"],
            "size": row["size_name"],

            "current_stock": stock_qty,

            "predicted_demand": round(
                demand_qty,
                2,
            ),

            "action": action,

            "priority": priority,

        })

    priority_order = {
        "HIGH": 3,
        "MEDIUM": 2,
        "LOW": 1,
        "NORMAL": 0,
    }

    recommendations.sort(
        key=lambda x: (
            priority_order[x["priority"]],
            x["predicted_demand"],
        ),
        reverse=True,
    )

    return recommendations