from fastapi import APIRouter
import logging

from utils.response import success, error

from services.analytics import (
    load_sales,
    dashboard_summary,
    forecast_sales,
    restock_prediction,
)

from services.ml import predict_demand
from services.recommendation import recommendation_engine
from services.insights import generate_business_insights
from services.risk import low_stock_risk
from services.basket import market_basket_analysis
from services.promotion import promotion_recommendation

router = APIRouter(prefix="/ai", tags=["AI"])

logger = logging.getLogger("ai-service")


# =========================================================
# HEALTH CHECK
# =========================================================
@router.get("/health")
def health():
    return success({
        "status": "running",
        "service": "ai-service"
    })


# =========================================================
# SALES DATA
# =========================================================
@router.get("/sales")
def sales(company_id: int):
    try:
        df = load_sales(company_id)

        return success({
            "rows": len(df),
            "columns": list(df.columns),
            "preview": df.head(10).to_dict(orient="records")
        })

    except Exception as e:
        logger.exception("Sales endpoint failed")
        return error("Failed to load sales data", str(e))


# =========================================================
# DASHBOARD
# =========================================================
@router.get("/dashboard")
def dashboard(company_id: int):
    try:
        return success(dashboard_summary(company_id))

    except Exception as e:
        logger.exception("Dashboard failed")
        return error("Dashboard error", str(e))


# =========================================================
# FORECAST
# =========================================================
@router.get("/forecast")
def forecast(company_id: int):
    try:
        return success(forecast_sales(company_id))

    except Exception as e:
        logger.exception("Forecast failed")
        return error("Forecast error", str(e))


# =========================================================
# RESTOCK
# =========================================================
@router.get("/restock")
def restock(company_id: int):
    try:
        return success({
            "products": restock_prediction(company_id)
        })

    except Exception as e:
        logger.exception("Restock failed")
        return error("Restock prediction error", str(e))


# =========================================================
# DEMAND (ML CORE ENDPOINT)
# =========================================================
@router.get("/demand")
def demand(company_id: int):
    try:
        predictions = predict_demand(company_id)

        return success({
            "count": len(predictions),
            "predictions": predictions
        })

    except Exception as e:
        logger.exception("Demand failed")
        return error("Demand prediction error", str(e))


# =========================================================
# RECOMMENDATION ENGINE
# =========================================================
@router.get("/recommendations")
def recommendations(company_id: int):
    try:
        return success(recommendation_engine(company_id))

    except Exception as e:
        logger.exception("Recommendation failed")
        return error("Recommendation engine error", str(e))


# =========================================================
# BUSINESS INSIGHTS
# =========================================================
@router.get("/insights")
def insights(company_id: int):
    try:
        return success(generate_business_insights(company_id))

    except Exception as e:
        logger.exception("Insights failed")
        return error("Insights generation error", str(e))


# =========================================================
# LOW STOCK RISK
# =========================================================
@router.get("/risk")
def risk(company_id: int):
    try:
        return success(low_stock_risk(company_id))

    except Exception as e:
        logger.exception("Risk failed")
        return error("Risk analysis error", str(e))


# =========================================================
# MARKET BASKET ANALYSIS
# =========================================================
@router.get("/basket")
def basket(company_id: int):
    try:
        return success(market_basket_analysis(company_id))

    except Exception as e:
        logger.exception("Basket failed")
        return error("Basket analysis error", str(e))


# =========================================================
# PROMOTION ENGINE (MAIN FEATURE)
# =========================================================
@router.get("/promotion")
def promotion(company_id: int):
    try:
        return success(promotion_recommendation(company_id))

    except Exception as e:
        logger.exception("Promotion failed")
        return error("Promotion engine crashed", str(e))
