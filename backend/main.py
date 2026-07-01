from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, capex, realization, status, timeline, lku, assets, export, dashboard

settings = get_settings()

app = FastAPI(
    title="Sistem Monitoring Investasi (Capex) PT Dahana",
    version="1.0.0",
    description="API untuk monitoring investasi Capex PT Dahana — dikembangkan dengan FastAPI & Supabase.",
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url="/redoc" if settings.app_env == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api"

app.include_router(auth.router,         prefix=API_PREFIX)
app.include_router(dashboard.router,    prefix=API_PREFIX)
app.include_router(capex.router,        prefix=API_PREFIX)
app.include_router(realization.router,  prefix=API_PREFIX)
app.include_router(status.router,       prefix=API_PREFIX)
app.include_router(timeline.router,     prefix=API_PREFIX)
app.include_router(lku.router,          prefix=API_PREFIX)
app.include_router(assets.router,       prefix=API_PREFIX)
app.include_router(export.router,       prefix=API_PREFIX)


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "Capex Monitoring API", "version": "1.0.0"}
