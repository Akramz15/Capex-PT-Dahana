from fastapi import APIRouter, Depends, Query

from ..core.security import get_current_user, require_admin
from ..services.dashboard import (
    get_dashboard_summary,
    get_monthly_chart_data,
    get_capex_progress_table,
    get_summary_table_ytd,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def dashboard_summary(
    tahun: int = Query(2026, ge=2020, le=2099),
    _user: dict = Depends(get_current_user),
):
    return get_dashboard_summary(tahun)


@router.get("/monthly-chart")
def monthly_chart(
    tahun: int = Query(2026, ge=2020, le=2099),
    _user: dict = Depends(get_current_user),
):
    return get_monthly_chart_data(tahun)


@router.get("/progress-table")
def progress_table(
    tahun: int = Query(2026, ge=2020, le=2099),
    _user: dict = Depends(get_current_user),
):
    return get_capex_progress_table(tahun)


@router.get("/summary-ytd")
def summary_table_ytd(
    tahun: int = Query(2026, ge=2020, le=2099),
    bulan: int = Query(12, ge=1, le=12),
    _user: dict = Depends(get_current_user),
):
    return get_summary_table_ytd(tahun, bulan)


@router.get("/summary-carryover-ytd")
def summary_carryover_table_ytd(
    tahun: int = Query(2026, ge=2020, le=2099),
    bulan: int = Query(12, ge=1, le=12),
    _user: dict = Depends(get_current_user),
):
    return get_summary_table_ytd(tahun, bulan, is_carryover=True)


@router.get("/export-summary-ytd")
def export_summary_table_ytd(
    tahun: int = Query(2026, ge=2020, le=2099),
    bulan: int = Query(12, ge=1, le=12),
    _admin: dict = Depends(require_admin),
):
    from fastapi.responses import StreamingResponse
    from ..services.export_engine import export_ytd_summary_excel
    
    excel_file = export_ytd_summary_excel(tahun, bulan)
    filename = f"Ringkasan_YTD_{tahun}_{bulan}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export-summary-carryover-ytd")
def export_summary_carryover_table_ytd(
    tahun: int = Query(2026, ge=2020, le=2099),
    bulan: int = Query(12, ge=1, le=12),
    _admin: dict = Depends(require_admin),
):
    from fastapi.responses import StreamingResponse
    from ..services.export_engine import export_ytd_summary_excel
    
    excel_file = export_ytd_summary_excel(tahun, bulan, is_carryover=True)
    filename = f"Ringkasan_CarryOver_YTD_{tahun}_{bulan}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
