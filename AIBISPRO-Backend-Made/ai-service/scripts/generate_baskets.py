import random

from sqlalchemy import text

from database import engine
from services.menu_rules import MENU_RULES

random.seed(42)


def generate_baskets():

    with engine.begin() as conn:

        # ---------------------------------
        # Get all sales
        # ---------------------------------
        sales = conn.execute(text("""
            SELECT id
            FROM sales
            ORDER BY id;
        """)).fetchall()

        # ---------------------------------
        # Product lookup
        # ---------------------------------
        product_lookup = {
            row.id: row.name
            for row in conn.execute(text("""
                SELECT id, name
                FROM products;
            """)).fetchall()
        }

        # ---------------------------------
        # Product size lookup
        # ---------------------------------
        products = conn.execute(text("""
            SELECT
                ps.id AS product_size_id,
                ps.product_id,
                ps.selling_price
            FROM product_sizes ps;
        """)).fetchall()

        products = list(products)

        added = 0

        # ==========================================
        # Generate additional basket items
        # ==========================================

        for sale in sales:

            sale_id = sale.id

            # Only modify about 35% of transactions
            if random.random() > 0.35:
                continue

            # Existing products
            existing_rows = conn.execute(text("""
                SELECT product_id
                FROM sale_items
                WHERE sale_id = :sale;
            """), {
                "sale": sale_id
            }).fetchall()

            existing_products = {
                row.product_id
                for row in existing_rows
            }

            # First product purchased
            first_product = conn.execute(text("""
                SELECT
                    p.name
                FROM sale_items si
                JOIN products p
                    ON p.id = si.product_id
                WHERE si.sale_id = :sale
                LIMIT 1;
            """), {
                "sale": sale_id
            }).scalar()

            recommended_products = MENU_RULES.get(
                first_product,
                []
            )

            available = []

            # ---------------------------------
            # Prioritize recommended products
            # ---------------------------------

            for product in products:

                if product.product_id in existing_products:
                    continue

                product_name = product_lookup[
                    product.product_id
                ]

                if product_name in recommended_products:
                    available.append(product)

            # ---------------------------------
            # Fallback to random products
            # ---------------------------------

            if not available:

                available = [
                    p
                    for p in products
                    if p.product_id not in existing_products
                ]

            if not available:
                continue

            random.shuffle(available)

            extra_items = random.randint(
                1,
                min(2, len(available))
            )

            # ---------------------------------
            # Insert new sale items
            # ---------------------------------

            for product in available[:extra_items]:

                qty = random.randint(1, 2)

                unit_price = float(
                    product.selling_price
                )

                subtotal = qty * unit_price

                conn.execute(text("""
                    INSERT INTO sale_items
                    (
                        sale_id,
                        product_id,
                        product_size_id,
                        quantity,
                        unit_price,
                        subtotal,
                        bundle_id
                    )
                    VALUES
                    (
                        :sale_id,
                        :product_id,
                        :product_size_id,
                        :quantity,
                        :unit_price,
                        :subtotal,
                        NULL
                    );
                """), {

                    "sale_id": sale_id,
                    "product_id": product.product_id,
                    "product_size_id": product.product_size_id,
                    "quantity": qty,
                    "unit_price": unit_price,
                    "subtotal": subtotal,

                })

                added += 1

            # ---------------------------------
            # Update sales totals
            # ---------------------------------

            conn.execute(text("""
                UPDATE sales
                SET
                    total_items = (
                        SELECT COALESCE(SUM(quantity),0)
                        FROM sale_items
                        WHERE sale_id = :sale
                    ),
                    total_amount = (
                        SELECT COALESCE(SUM(subtotal),0)
                        FROM sale_items
                        WHERE sale_id = :sale
                    )
                WHERE id = :sale;
            """), {
                "sale": sale_id
            })

    print("=" * 50)
    print(f"Added {added} smart basket items")
    print("=" * 50)


if __name__ == "__main__":
    generate_baskets()