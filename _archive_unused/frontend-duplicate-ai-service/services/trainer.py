import joblib
import pandas as pd
import sklearn

from services.ml import prepare_training_data


def train_and_save_model():

    X, y, product_encoder, size_encoder = prepare_training_data()

    from sklearn.ensemble import RandomForestRegressor

    model = RandomForestRegressor(
        n_estimators=300,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X, y)

    version = sklearn.__version__

    model_path = f"models/demand_model_v{version}.pkl"

    joblib.dump(model, model_path)
    joblib.dump(product_encoder, "models/product_encoder.pkl")
    joblib.dump(size_encoder, "models/size_encoder.pkl")

    print("Training completed and saved:", model_path)

    return model_path