"""
Dev server entry point.

app/core/database.py and app/core/security.py read DB_HOST/DB_USER/
DB_PASSWORD/DB_NAME/JWT_SECRET_KEY straight from os.environ at import time,
but nothing actually loads backend/.env into the environment - you'd
otherwise have to export those vars by hand before running uvicorn. This
script loads .env first and then starts the server, so `python run.py` is
enough on its own.

Equivalent to:  uvicorn app.main:app --reload
"""
import os

from dotenv import load_dotenv

load_dotenv()  # must run before "app.main" (and its app.core imports) load

# Supabase URL is loaded from backend/.env (e.g. SUPABASE_URL=https://your-project.supabase.co)
SUPABASE_URL = os.environ.get("DATABASE_URL")

# Fail fast with a clear message instead of a KeyError deep in app.core.*
_REQUIRED_ENV_VARS = ("DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET_KEY", "SUPABASE_URL")
_missing = [name for name in _REQUIRED_ENV_VARS if not os.environ.get(name)]
if _missing:
    raise SystemExit(
        f"Missing required environment variable(s): {', '.join(_missing)}.\n"
        f"Copy .env.example to .env and fill these in first."
    )

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=True,
    )
