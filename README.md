# Telegram Automation Platform

A comprehensive automation platform for Telegram tasks.

## Setup

### Backend (Python)

1. Navigate to `backend/`.
2. Create virtual env: `python -m venv venv`.
3. Activate: `venv/Scripts/activate` (Windows) or `source venv/bin/activate` (Linux/Mac).
4. Install dependencies: `pip install -r requirements.txt`.
5. Copy `.env.example` to `.env` and fill with your credentials (MONGO_URI, TELEGRAM_API_ID, etc.).
6. Run server: `python app/main.py`.

python -m uvicorn app.main:app --reload 

### Frontend (React)

1. Navigate to `frontend/`.
2. Install dependencies: `npm install`.
3. Run dev server: `npm run dev`.

## Key Features
- **Multi-account support**: Connect multiple Telegram accounts.
- **Flexible Scheduler**: Daily, Weekly, Monthly, Custom, Specific Dates.
- **Action Types**: Sticker, Text, Photo, Video, Document, Forward.
- **Templates**: Ready-made automation flows.
- **Admin Dashboard**: Full system control.
