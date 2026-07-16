import pandas as pd

from mlxtend.frequent_patterns import apriori
from mlxtend.frequent_patterns import association_rules

from database import engine


def market_basket_analysis():

    query = """
    SELECT
        si.sale_id,
        p.name
    FROM sale_items si
    JOIN products p
        ON p.id = si.product_id
    ORDER BY
        si.sale_id;
    """

    df = pd.read_sql(query, engine)

    print("=" * 60)
    print("Sales rows:", len(df))
    print(df.head())
    print("=" * 60)

    basket = (
        df
        .groupby(["sale_id", "name"])
        .size()
        .unstack(fill_value=0)
    )

    basket = basket.astype(bool)

    print("Transactions:", basket.shape[0])
    print("Products:", basket.shape[1])
    print("=" * 60)

    frequent_itemsets = apriori(
        basket,
        min_support=0.005,
        use_colnames=True,
    )

    print("Frequent itemsets found:", len(frequent_itemsets))

    if not frequent_itemsets.empty:
        print(frequent_itemsets.head(20))

    if frequent_itemsets.empty:
        return {
            "rules_found": 0,
            "rules": [],
        }

    rules = association_rules(
        frequent_itemsets,
        metric="confidence",
        min_threshold=0.05,
    )

    print("Rules found:", len(rules))

    if not rules.empty:
        print(rules.head(20))

    if rules.empty:
        return {
            "rules_found": 0,
            "rules": [],
        }

    result = []

    for _, row in rules.iterrows():

        result.append({
            "buy": list(row["antecedents"]),
            "recommend": list(row["consequents"]),
            "support": round(float(row["support"]), 3),
            "confidence": round(float(row["confidence"]), 3),
            "lift": round(float(row["lift"]), 3),
        })

    result.sort(
        key=lambda x: (
            x["lift"],
            x["confidence"],
        ),
        reverse=True,
    )

    return {
        "rules_found": len(result),
        "rules": result,
    }