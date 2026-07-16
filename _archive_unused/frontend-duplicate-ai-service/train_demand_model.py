import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import os

# =========================
# LOAD DATA
# =========================
df = pd.read_csv("data/sales.csv")  # adjust path if needed

print("Data loaded:", df.shape)

# =========================
# BASIC CLEANING
# =========================
df = df.dropna()

# Example expected columns:
# product_name, quantity, price, day_of_week, demand

# =========================
# ENCODING
# =========================
product_encoder = LabelEncoder()
df["product_encoded"] = product_encoder.fit_transform(df["product_name"])

# Example feature engineering
features = ["product_encoded", "price"]
X = df[features]
y = df["demand"]

# =========================
# SPLIT DATA
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# =========================
# MODEL
# =========================
model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X_train, y_train)

# =========================
# SAVE MODEL + ENCODER
# =========================
os.makedirs("models", exist_ok=True)

joblib.dump(model, "models/demand_model.pkl")
joblib.dump(product_encoder, "models/product_encoder.pkl")

print("Model training complete and saved!")