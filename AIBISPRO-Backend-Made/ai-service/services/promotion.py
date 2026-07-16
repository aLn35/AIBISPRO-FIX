from services.ml import predict_demand
from services.risk import low_stock_risk
from services.basket import market_basket_analysis
from services.scoring import calculate_scores


def promotion_recommendation():

    demand = predict_demand()
    risk = low_stock_risk()["products"]
    basket = market_basket_analysis()["rules"]

    risk_lookup = {
        (r["product"], r["size"]): r
        for r in risk
    }

    basket_lookup = {}

    for rule in basket:
        for item in rule["buy"]:
            basket_lookup[item] = {
                "recommend": rule["recommend"][0],
                "confidence": rule["confidence"]
            }

    promotions = []

    for item in demand:

        product = item["product"]
        size = item["size"]
        predicted = item["predicted_quantity"]

        stock = risk_lookup.get((product, size))
        if not stock:
            continue

        days_remaining = stock["days_until_empty"]

        bundle_data = basket_lookup.get(product)
        bundle = None
        confidence = 0

        if bundle_data:
            bundle = bundle_data["recommend"]
            confidence = bundle_data["confidence"]

        score = calculate_scores(
            predicted,
            days_remaining,
            confidence
        )

        # FIXED THRESHOLD
        if score < 4:
            continue

        discount = min(25, int(score * 2))

        if score >= 8:
            priority = "HIGH"
        elif score >= 6:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        promotions.append({
            "product": product,
            "size": size,
            "bundle_with": bundle,
            "suggested_discount": f"{discount}%",
            "priority": priority,
            "score": score,
            "reason": [
                f"Predicted demand: {predicted:.1f}",
                f"Inventory: {days_remaining} days remaining",
                f"Inventory status: {stock['risk']}",
                f"Bundle confidence: {confidence:.2f}" if bundle else "No bundle",
                f"Final score: {score}"
            ]
        })

    promotions.sort(key=lambda x: x["score"], reverse=True)

    return {
        "total_promotions": len(promotions),
        "promotions": promotions
    }