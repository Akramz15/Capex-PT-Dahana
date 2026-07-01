from fastapi import APIRouter, Depends, Query

from ..core.security import get_current_user
from ..services.dashboard import (
    get_dashboard_summary,
    get_monthly_chart_data,
    get_capex_progress_table,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def dashboard_summary(
    tahun: int = Query(2026, ge=2020, le=2099),
    _user: dict = Depends(get_current_user),
):
    return get_dashboard_summary(tahun)


@router.get("/monthly-chart")
async def monthly_chart(
    tahun: int = Query(2026, ge=2020, le=2099),
    _user: dict = Depends(get_current_user),
):
    return get_monthly_chart_data(tahun)


@router.get("/progress-table")
async def progress_table(
    tahun: int = Query(2026, ge=2020, le=2099),
    _user: dict = Depends(get_current_user),
):
    return get_capex_progress_table(tahun)
