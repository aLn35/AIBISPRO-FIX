from services.analytics import dashboard_summary
from services.analytics import forecast_sales
from services.ml import predict_demand
from services.recommendation import recommendation_engine


def generate_business_insights():

    dashboard = dashboard_summary()
    forecast = forecast_sales(days=7)
    demand = predict_demand()
    recommendations = recommendation_engine()

    insights = []

    # -------------------------
    # Revenue
    # -------------------------
    insights.append(
        f"Today's revenue is Rp {dashboard['today_revenue']:,.0f}."
    )

    insights.append(
        f"This month's revenue is Rp {dashboard['monthly_revenue']:,.0f}."
    )

    insights.append(
        f"Average order value is Rp {dashboard['average_order_value']:,.0f}."
    )

    # -------------------------
    # Forecast
    # -------------------------
    tomorrow = forecast["forecast"][0]

    insights.append(
        f"Tomorrow's predicted revenue is Rp {tomorrow['predicted_revenue']:,.0f}."
    )

    # -------------------------
    # Demand
    # -------------------------
    top_product = max(
        demand,
        key=lambda x: x["predicted_quantity"]
    )

    insights.append(
        f"{top_product['product']} ({top_product['size']}) is expected to have the highest demand with approximately {top_product['predicted_quantity']:.1f} sales."
    )

    # -------------------------
    # Recommendations
    # -------------------------
    high_priority = [
        r for r in recommendations
        if r["priority"] == "HIGH"
    ]

    if high_priority:

        for item in high_priority:

            insights.append(
                f"Restock {item['product']} ({item['size']}) immediately because demand is expected to exceed the available stock."
            )

    else:

        insights.append(
            "No products require immediate restocking."
        )

    # -------------------------
    # Top Products
    # -------------------------
    for product in dashboard["top_products"][:3]:

        insights.append(
            f"{product['product']} remains one of the best-selling products with {product['quantity']} units sold."
        )

    return {
        "generated_insights": len(insights),
        "insights": insights,
    }