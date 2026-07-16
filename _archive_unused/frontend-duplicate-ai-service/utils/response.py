import numpy as np
import pandas as pd


# -------------------------
# RESPONSE WRAPPERS
# -------------------------
def success(data, message="success"):
    return {
        "status": "success",
        "message": message,
        "data": make_json_safe(data)
    }


def error(message="error", detail=None):
    return {
        "status": "error",
        "message": message,
        "detail": str(detail) if detail else None
    }


# -------------------------
# JSON SAFE CONVERTER
# -------------------------
def make_json_safe(obj):

    if isinstance(obj, np.generic):
        return obj.item()

    if isinstance(obj, np.ndarray):
        return obj.tolist()

    if isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient="records")

    if isinstance(obj, pd.Series):
        return obj.to_dict()

    if isinstance(obj, dict):
        return {str(k): make_json_safe(v) for k, v in obj.items()}

    if isinstance(obj, (list, tuple, set, frozenset)):
        return [make_json_safe(i) for i in obj]

    return obj