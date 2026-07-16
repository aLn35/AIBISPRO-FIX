import joblib
import os

# =====================================================
# GLOBAL CACHE (PREVENT RELOADING)
# =====================================================
MODEL_CACHE = {}


# =====================================================
# LOAD ALL MODELS
# =====================================================
def load_assets():

    global MODEL_CACHE

    if MODEL_CACHE.get("loaded"):
        return MODEL_CACHE

    base_path = "models"

    try:
        model = joblib.load(os.path.join(base_path, "demand_model.pkl"))
        product_encoder = joblib.load(os.path.join(base_path, "product_encoder.pkl"))
        size_encoder = joblib.load(os.path.join(base_path, "size_encoder.pkl"))

        MODEL_CACHE["model"] = model
        MODEL_CACHE["product_encoder"] = product_encoder
        MODEL_CACHE["size_encoder"] = size_encoder
        MODEL_CACHE["loaded"] = True

        print("Models loaded successfully")

        return MODEL_CACHE

    except Exception as e:
        print("Model loading failed:", str(e))
        raise e


# =====================================================
# GETTERS (SAFE ACCESS)
# =====================================================
def get_model():
    return MODEL_CACHE.get("model")


def get_product_encoder():
    return MODEL_CACHE.get("product_encoder")


def get_size_encoder():
    return MODEL_CACHE.get("size_encoder")