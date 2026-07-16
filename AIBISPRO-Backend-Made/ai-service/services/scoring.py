def calculate_scores(predicted, days_remaining, bundle_conf):

    # Demand score (0–10)
    if predicted >= 8:
        demand_score = 10
    elif predicted >= 6:
        demand_score = 8
    elif predicted >= 4:
        demand_score = 6
    else:
        demand_score = 3

    # Inventory score (0–10)
    if days_remaining > 30:
        inventory_score = 10
    elif days_remaining > 20:
        inventory_score = 8
    elif days_remaining > 14:
        inventory_score = 6
    elif days_remaining > 7:
        inventory_score = 4
    else:
        inventory_score = 1

    # Bundle score (0–10)
    bundle_score = bundle_conf * 10 if bundle_conf else 0

    final_score = (
        demand_score * 0.5 +
        inventory_score * 0.3 +
        bundle_score * 0.2
    )

    return round(final_score, 2)