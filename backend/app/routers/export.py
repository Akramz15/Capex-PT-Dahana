from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from datetime import datetime

from ..core.security import require_admin
from ..services.export_engine import generate_export

router = APIRouter(prefix="/export-capex", tags=["Export"])


@router.post("")
async def export_capex_excel(
    tahun: int = Query(..., ge=2020, le=2099, description="Tahun anggaran yang akan diekspor"),
    _admin: dict = Depends(require_admin),
):
    output = generate_export(tahun)

    filename = f"Monitoring_Capex_PT_Dahana_{tahun}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
