# How to Run the Backend (Local Development)

## Prerequisites

- **Python 3.12+** installed
- **MongoDB Atlas** connection string (or local MongoDB)
- **Telegram API credentials** from [my.telegram.org](https://my.telegram.org)

---

## 1. Navigate to the Backend Directory

```cmd
cd "d:\Projects FINAL\Python Program\Telegram\tg-scheduler-user-automation\backend"
```

## 2. Create & Activate Virtual Environment (First Time Only)

```cmd
python -m venv venv
venv\Scripts\activate
```

> To activate in future sessions, just run `venv\Scripts\activate`.

## 3. Install Dependencies

```cmd
pip install -r requirements.txt
```

## 4. Set Up Environment Variables

Copy the example file and fill in your values:

```cmd
copy .env.example .env
```

Then edit `.env` with your actual credentials:

```env
# App
PORT=8000
DEBUG=True

# Database
MONGO_URI=mongodb+srv://your_user:your_pass@cluster.mongodb.net
DB_NAME=telegram_automation

# Security
JWT_SECRET=your_super_secret_jwt_key_change_this
ENCRYPTION_KEY=your_fernet_key_here

# Telegram API
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=abcdef1234567890

# CORS (frontend dev server)
CORS_ORIGINS=["http://localhost:5173","http://localhost:5174"]

# Admin
ADMIN_EMAIL=admin@example.com
```

### Generating the Encryption Key

Run this in your terminal to generate a valid Fernet key:

```cmd
venv\Scripts\python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Copy the output into `ENCRYPTION_KEY` in your `.env`.

## 5. Run the Development Server

```cmd
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The server starts at **http://localhost:8000** with auto-reload on code changes.

### Alternative: Run via Python

```cmd
venv\Scripts\python -m app.main
```

## 6. Verify It's Running

Open your browser or use curl:

```
http://localhost:8000/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "mode": "debug"
}
```

## 7. API Documentation (Debug Mode Only)

When `DEBUG=True`, interactive API docs are available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

> These are automatically disabled in production (`DEBUG=False`).

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `venv\Scripts\activate` | Activate virtual environment |
| `pip install -r requirements.txt` | Install/update dependencies |
| `uvicorn app.main:app --reload` | Start dev server with auto-reload |
| `deactivate` | Exit virtual environment |
