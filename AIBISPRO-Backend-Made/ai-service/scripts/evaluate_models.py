"""
Real, reproducible accuracy comparison between two models on the SAME task
(daily revenue forecasting) and the SAME held-out data, so the numbers this
script prints are honest and can be pasted directly into a report:

  Model A: Holt-Winters exponential smoothing (statsmodels) - one univariate
           model fit per company on that company's own daily revenue series.
  Model B: Random Forest regressor (scikit-learn) - one pooled model trained
           across all qualifying companies, using date-part + company_id
           features, matching how the production model is trained.

Only real, uploaded sales data is used (source = 'upload'; seeded demo rows
are excluded). Companies without enough daily history for a meaningful
train/test split are skipped and reported as skipped, not silently dropped.

Usage:  PYTHONPATH=. venv/Scripts/python.exe scripts/evaluate_models.py
"""

import numpy as np
import pandas as pd
from sqlalchemy import text
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from database import engine

MIN_DAYS_REQUIRED = 21   # need enough history for a meaningful holdout
HOLDOUT_DAYS = 14        # matches the app's default forecast horizon


def load_daily_revenue_by_company():
    query = text("""
        SELECT
            company_id,
            DATE(transaction_date) AS ds,
            SUM(total_amount) AS revenue
        FROM sales
        WHERE source = 'upload'
        GROUP BY company_id, DATE(transaction_date)
        ORDER BY company_id, ds;
    """)
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)
    df["ds"] = pd.to_datetime(df["ds"])
    return df


def build_full_series(company_df):
    """Reindex to a continuous daily range, filling gaps with 0 revenue."""
    full_range = pd.date_range(company_df["ds"].min(), company_df["ds"].max(), freq="D")
    series = company_df.set_index("ds")["revenue"].reindex(full_range, fill_value=0.0)
    return series


def fit_holt_winters(train_series, horizon):
    use_seasonal = len(train_series) >= 14
    try:
        model = ExponentialSmoothing(
            train_series,
            trend="add",
            seasonal="add" if use_seasonal else None,
            seasonal_periods=7 if use_seasonal else None,
            initialization_method="estimated",
        ).fit()
        return model.forecast(horizon).values
    except Exception:
        mean_val = float(train_series.mean())
        return np.full(horizon, mean_val)


def main():
    raw = load_daily_revenue_by_company()

    rf_train_frames = []
    rf_test_frames = []
    hw_predictions = []
    hw_actuals = []
    included_companies = []
    skipped_companies = []

    for company_id, group in raw.groupby("company_id"):
        series = build_full_series(group)

        if len(series) < MIN_DAYS_REQUIRED:
            skipped_companies.append((int(company_id), len(series)))
            continue

        holdout = min(HOLDOUT_DAYS, len(series) // 3)  # never hold out more than 1/3
        train_series = series.iloc[:-holdout]
        test_series = series.iloc[-holdout:]

        included_companies.append((int(company_id), len(series), holdout))

        # ---- Holt-Winters: fit on this company's train slice, forecast holdout ----
        hw_forecast = fit_holt_winters(train_series, holdout)
        hw_predictions.extend(hw_forecast.tolist())
        hw_actuals.extend(test_series.values.tolist())

        # ---- Random Forest: accumulate pooled train/test rows across companies ----
        def to_feature_frame(s, cid):
            d = s.index
            return pd.DataFrame({
                "day": d.day,
                "month": d.month,
                "weekday": d.weekday,
                "company_id": cid,
                "revenue": s.values,
            })

        rf_train_frames.append(to_feature_frame(train_series, company_id))
        rf_test_frames.append(to_feature_frame(test_series, company_id))

    if not included_companies:
        print("No company had enough real (source='upload') daily history "
              f"(need >= {MIN_DAYS_REQUIRED} days) to run a fair comparison.")
        return

    # ---- Train ONE pooled Random Forest across all qualifying companies ----
    rf_train = pd.concat(rf_train_frames, ignore_index=True)
    rf_test = pd.concat(rf_test_frames, ignore_index=True)

    feature_cols = ["day", "month", "weekday", "company_id"]
    rf_model = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    rf_model.fit(rf_train[feature_cols], rf_train["revenue"])
    rf_predictions = rf_model.predict(rf_test[feature_cols])
    rf_actuals = rf_test["revenue"].values

    # ---- Metrics ----
    def metrics(actuals, predictions):
        actuals = np.array(actuals)
        predictions = np.array(predictions)
        mae = mean_absolute_error(actuals, predictions)
        rmse = np.sqrt(mean_squared_error(actuals, predictions))
        r2 = r2_score(actuals, predictions) if len(actuals) > 1 else float("nan")
        return mae, rmse, r2

    hw_mae, hw_rmse, hw_r2 = metrics(hw_actuals, hw_predictions)
    rf_mae, rf_rmse, rf_r2 = metrics(rf_actuals, rf_predictions)

    winner = "Random Forest" if rf_mae < hw_mae else "Holt-Winters"

    lines = []
    lines.append("# Model Accuracy Comparison — Daily Revenue Forecasting\n")
    lines.append(
        "Real, reproducible evaluation on actual uploaded sales data "
        "(`source = 'upload'`, seeded demo rows excluded). Both models "
        "were evaluated on the exact same held-out days per company, "
        "predicting the same target (daily total revenue).\n"
    )
    lines.append(f"**Companies included** (>= {MIN_DAYS_REQUIRED} days of real history): "
                  + ", ".join(f"company {cid} ({days} days, {holdout}-day holdout)"
                              for cid, days, holdout in included_companies) + "\n")
    if skipped_companies:
        lines.append(f"**Companies skipped** (insufficient real history, need >= {MIN_DAYS_REQUIRED} days): "
                      + ", ".join(f"company {cid} ({days} days)" for cid, days in skipped_companies) + "\n")
    lines.append(f"**Total held-out data points evaluated**: {len(rf_actuals)}\n")

    lines.append("\n| Model | MAE (Rp) | RMSE (Rp) | R² | Notes |")
    lines.append("|---|---|---|---|---|")
    lines.append(f"| Holt-Winters (statsmodels) | {hw_mae:,.0f} | {hw_rmse:,.0f} | {hw_r2:.3f} | "
                  "One univariate model per company, weekly seasonality when enough history |")
    lines.append(f"| Random Forest (scikit-learn) | {rf_mae:,.0f} | {rf_rmse:,.0f} | {rf_r2:.3f} | "
                  "One pooled model across companies, date-part + company_id features |")
    lines.append(f"\n**Result**: {winner} produced lower error (MAE) on this real held-out data.\n")
    lines.append(
        "\n_Note: Prophet was originally planned as Model A per the project's tech-stack write-up, "
        "but its `cmdstanpy` backend requires a C++ build toolchain (`mingw32-make`) that is not "
        "available on this machine, so Holt-Winters (statsmodels) was substituted — same class of "
        "classical statistical time-series model, no compiled backend required._\n"
    )

    report = "\n".join(lines)
    print(report)

    with open("MODEL_COMPARISON.md", "w", encoding="utf-8") as f:
        f.write(report)

    print("\nWritten to ai-service/MODEL_COMPARISON.md")


if __name__ == "__main__":
    main()
