import joblib
import pandas as pd
from database import engine


def build_rules():

    print("Building rules...")

    query = """
    SELECT
        p.name AS product
    FROM sale_items si
    JOIN product_sizes ps ON ps.id = si.product_size_id
    JOIN products p ON p.id = ps.product_id
    """

    df = pd.read_sql(query, engine)

    # simple grouping (replace with mlxtend later if needed)
    rules = df.groupby("product").size().reset_index(name="count")

    joblib.dump(rules, "models/rules.pkl")

    print("Rules saved successfully")


if __name__ == "__main__":
    build_rules()