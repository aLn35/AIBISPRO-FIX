from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routes.ai import router as ai_router
from services.model_loader import load_assets


# =====================================================
# LIFESPAN EVENT (MODERN FASTAPI STARTUP)
# =====================================================
@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Starting AI Service...")

    try:
        load_assets()
        print("ML Model loaded into memory successfully")
    except Exception as e:
        print(f"Failed to load ML model: {e}")

    yield

    # optional cleanup on shutdown
    print("Shutting down AI Service...")


# =====================================================
# APP INIT
# =====================================================
app = FastAPI(
    title="AIBISPRO AI Service",
    description="AI Microservice for Demand, Promotion, Forecasting, and Analytics",
    version="1.0.0",
    lifespan=lifespan
)


# =====================================================
# CORS (IMPORTANT FOR FRONTEND CONNECTION)
# =====================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# ROUTES
# =====================================================
app.include_router(ai_router)