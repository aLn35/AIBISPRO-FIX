import numpy as np
import pandas as pd

def make_json_safe(obj):
    """
    Recursively convert ML outputs into JSON-safe Python types.
    """

    # numpy types → native Python
    if isinstance(obj, np.generic):
        return obj.item()

    # pandas DataFrame
    if isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient="records")

    # pandas Series
    if isinstance(obj, pd.Series):
        return obj.to_dict()

    # dict
    if isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}

    # list / tuple / set
    if isinstance(obj, (list, tuple, set)):
        return [make_json_safe(i) for i in obj]

    return obj