"""
FastAPI application entrypoint.

NOTE: this is starting scaffolding, written because no backend code existed
yet. When Team 1/2 add their own routers (auth, complaints, assignments),
register them here the same way the dashboard router is registered below.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import connect_db, disconnect_db
from app.routers import dashboard, reports

app = FastAPI(title="Complaint & Service Request Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await connect_db()


@app.on_event("shutdown")
async def on_shutdown():
    await disconnect_db()


app.include_router(dashboard.router)
app.include_router(reports.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
