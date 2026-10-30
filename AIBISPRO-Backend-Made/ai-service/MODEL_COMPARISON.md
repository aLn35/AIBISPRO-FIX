# Model Accuracy Comparison — Daily Revenue Forecasting

Real, reproducible evaluation on actual uploaded sales data (`source = 'upload'`, seeded demo rows excluded). Both models were evaluated on the exact same held-out days per company, predicting the same target (daily total revenue).

**Companies included** (>= 21 days of real history): company 1 (86 days, 14-day holdout), company 2 (86 days, 14-day holdout), company 3 (86 days, 14-day holdout)

**Total held-out data points evaluated**: 42


| Model | MAE (Rp) | RMSE (Rp) | R² | Notes |
|---|---|---|---|---|
| Holt-Winters (statsmodels) | 4,548,059 | 5,812,182 | -0.154 | One univariate model per company, weekly seasonality when enough history |
| Random Forest (scikit-learn) | 5,858,967 | 8,443,853 | -1.437 | One pooled model across companies, date-part + company_id features |

**Result**: Holt-Winters produced lower error (MAE) on this real held-out data.


_Note: Prophet was originally planned as Model A per the project's tech-stack write-up, but its `cmdstanpy` backend requires a C++ build toolchain (`mingw32-make`) that is not available on this machine, so Holt-Winters (statsmodels) was substituted — same class of classical statistical time-series model, no compiled backend required._
