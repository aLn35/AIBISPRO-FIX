# AIBISPRO - Setup Guide

## REQUIREMENTS
- Node.js 18+
- Python 3.9–3.11

---

## 1. BACKEND (Node.js)

cd backend
npm install

# run
npm run dev
# OR if missing script:
node index.js

If missing dev script add to package.json:
"scripts": {
  "dev": "nodemon index.js",
  "start": "node index.js"
}

npm install nodemon --save-dev

---

## 2. AI SERVICE (FastAPI)

cd ai-service

# create venv (first time only)
python3 -m venv .venv
source .venv/bin/activate

# install deps
pip install -r requirements.txt
pip install uvicorn

# RUN (IMPORTANT)
uvicorn app:app --reload --port 8001

❌ WRONG:
uvicorn main:app

---

## 3. ENV FILES

backend/.env
PORT=3000
AI_SERVICE_URL=http://localhost:8001

---

## 4. RUN FULL SYSTEM (3 TERMINALS)

Terminal 1:
cd ai-service
source .venv/bin/activate
uvicorn app:app --reload --port 8001

Terminal 2:
cd backend
npm run dev

Terminal 3:
cd frontend
npm run dev

---

## 6. COMMON FIXES

Blank UI:
- check backend (3000)
- check ai-service (8001)
- open browser console (F12)

uvicorn not found:
pip install uvicorn

venv missing:
python3 -m venv .venv

---

## FINAL RESULT
Frontend: http://localhost:5173  
Backend: http://localhost:3000  