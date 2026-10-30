# AIBISPRO Backend + AI Microservice

See the [project root README](../README.md) for full system documentation (architecture, features, ML details, troubleshooting).

## Quick Start

**Backend Gateway (NestJS)** — runs on port `3000`:
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

**AI Microservice (FastAPI)** — runs on port `8000`:
```bash
cd ai-service
python -m venv venv
venv\Scripts\activate      # Windows; `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
python scripts/train.py
uvicorn app:app --host 0.0.0.0 --port 8000
```

Requires PostgreSQL running via Compose (see root README) and `AIBISPRO-Backend-Made/.env` copied from `.env.example`. The backend also loads the legacy `backend/.env` as a local fallback. Do not commit credentials.
