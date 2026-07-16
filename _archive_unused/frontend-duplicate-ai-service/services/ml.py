import joblib
import pandas as pd
import sklearn
import warnings
import hashlib
import os

from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.exceptions import InconsistentVersionWarning

from database import engine
from services.cache import get_cache, set_cache


# =========================================================
# WARNING FILTER (DEV ONLY)
# =========================================================
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)


# =========================================================
# MEMORY CACHE
# =========================================================
MODEL_CACHE = {}

MODEL_PATH = "models/demand_model.pkl"
PRODUCT_ENCODER_PATH = "models/product_encoder.pkl"
SIZE_ENCODER_PATH = "models/size_encoder.pkl"


# =========================================================
# LOAD TRAINING DATA
# =========================================================
def load_training_data():

    query = """
    SELECT
        DATE(s.transaction_date) AS date,
        p.name AS product,
        ps.size_name,
        SUM(si.quantity) AS quantity
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    JOIN product_sizes ps ON ps.id = si.product_size_id
    JOIN products p ON p.id = ps.product_id
    GROUP BY DATE(s.transaction_date), p.name, ps.size_name
    ORDER BY date;
    """

    return pd.read_sql(query, engine)


# =========================================================
# PREPARE DATASET
# =========================================================
def prepare_training_data():

    df = load_training_data().dropna()

    df["date"] = pd.to_datetime(df["date"])

    df["day"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["weekday"] = df["date"].dt.weekday

    product_encoder = LabelEncoder()
    size_encoder = LabelEncoder()

    df["product_id"] = product_encoder.fit_transform(df["product"])
    df["size_id"] = size_encoder.fit_transform(df["size_name"])

    X = df[[
        "day",
        "month",
        "weekday",
        "product_id",
        "size_id"
    ]]

    y = df["quantity"]

    return X, y, product_encoder, size_encoder


# =========================================================
# TRAIN MODEL
# =========================================================
def train_model():

    X, y, product_encoder, size_encoder = prepare_training_data()

    model = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X, y)

    os.makedirs("models", exist_ok=True)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(product_encoder, PRODUCT_ENCODER_PATH)
    joblib.dump(size_encoder, SIZE_ENCODER_PATH)

    print(f"Model trained successfully with sklearn {sklearn.__version__}")

    return model


# =========================================================
# LOAD MODEL (LAZY + CACHE)
# =========================================================
def load_model_assets():

    global MODEL_CACHE

    if "model" in MODEL_CACHE:
        return (
            MODEL_CACHE["model"],
            MODEL_CACHE["product_encoder"],
            MODEL_CACHE["size_encoder"],
        )

    if not os.path.exists(MODEL_PATH):
        raise Exception("Model not found. Please run train_model() first.")

    model = joblib.load(MODEL_PATH)
    product_encoder = joblib.load(PRODUCT_ENCODER_PATH)
    size_encoder = joblib.load(SIZE_ENCODER_PATH)

    MODEL_CACHE["model"] = model
    MODEL_CACHE["product_encoder"] = product_encoder
    MODEL_CACHE["size_encoder"] = size_encoder

    return model, product_encoder, size_encoder


# =========================================================
# PREDICT DEMAND (CACHE + OPTIMIZED)
# =========================================================
def predict_demand():

    today = pd.Timestamp.today()

    cache_key = hashlib.md5(
        f"demand:{today.date()}".encode()
    ).hexdigest()

    cached = get_cache(cache_key)
    if cached:
        return cached

    model, product_encoder, size_encoder = load_model_assets()

    day = today.day
    month = today.month
    weekday = today.weekday()

    query = """
    SELECT
        p.name,
        ps.size_name
    FROM product_sizes ps
    JOIN products p ON p.id = ps.product_id
    ORDER BY p.name, ps.size_name;
    """

    products = pd.read_sql(query, engine)

    predictions = []

    valid_products = set(product_encoder.classes_)
    valid_sizes = set(size_encoder.classes_)

    for row in products.itertuples(index=False):

        product = row.name
        size = row.size_name

        if product not in valid_products or size not in valid_sizes:
            continue

        try:
            product_id = product_encoder.transform([product])[0]
            size_id = size_encoder.transform([size])[0]
        except:
            continue

        X = pd.DataFrame([{
            "day": day,
            "month": month,
            "weekday": weekday,
            "product_id": product_id,
            "size_id": size_id,
        }])

        quantity = model.predict(X)[0]

        predictions.append({
            "product": product,
            "size": size,
            "predicted_quantity": round(max(float(quantity), 0), 2),
        })

    predictions.sort(
        key=lambda x: x["predicted_quantity"],
        reverse=True
    )

    set_cache(cache_key, predictions)

    return predictions