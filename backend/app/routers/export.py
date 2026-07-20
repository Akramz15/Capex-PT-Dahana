from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from datetime import datetime
from typing import Optional

from ..core.security import require_admin, get_current_user
from .capex import list_capex, get_audit_logs
from .realization import list_realization
from .assets import list_assets
from .timeline import list_timeline
from ..services.export_dynamic import (
    generate_rkap_excel, generate_realization_excel, generate_gabungan_excel,
    generate_audit_logs_excel, generate_assets_excel, generate_timeline_excel,
    generate_carryover_excel
)

router = APIRouter(prefix="/export-capex", tags=["Export"])

@router.get("/rkap")
def export_rkap_excel(
    tahun: int = Query(...),
    kategori: Optional[str] = None,
    lokasi: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    pic: Optional[str] = None,
    _user: dict = Depends(get_current_user),
):
    # Fetch data directly by invoking the router functions
    capex_data = list_capex(tahun=tahun, kategori=kategori, _user=_user)
    # The capex_data is a list of CapexMasterResponse objects
    # We also need realization data for those capex to fill b1_rkap etc
    real_data = list_realization(tahun=tahun, capex_id=None, _user=_user)
    
    # Filter by search, status, pic just like frontend does if provided
    formatted_data = []
    for c in capex_data:
        c_dict = c.copy()
        c_reals = [r for r in real_data if str(r.get("capex_id")) == str(c.get("id"))]
        
        # Populate months
        for r in c_reals:
            c_dict[f"b{r.get('bulan')}_rkap"] = r.get("nilai_rkap", 0)
            c_dict[f"b{r.get('bulan')}_real"] = r.get("nilai_realisasi", 0)
            if r.get("status"):
                c_dict["status"] = r.get("status")
                
        # Calculate totals
        c_dict["total_real"] = sum(r.get("nilai_realisasi", 0) for r in c_reals)
        
        # Apply Frontend Filters
        if search and search.lower() not in (c_dict.get("daftar_capex") or "").lower() and search.lower() not in (c_dict.get("kode") or "").lower():
            continue
        if status and c_dict.get("status") != status:
            continue
        if pic and c_dict.get("pic") != pic:
            continue
            
        formatted_data.append(c_dict)

    output = generate_rkap_excel(formatted_data, tahun)

    filename = f"RKAP_Master_{tahun}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )

@router.get("/realisasi")
def export_realisasi_excel(
    tahun: int = Query(...),
    kategori: Optional[str] = None,
    status: Optional[str] = None,
    pic: Optional[str] = None,
    search: Optional[str] = None,
    is_carryover: bool = False,
    _user: dict = Depends(get_current_user),
):
    capex_data = list_capex(tahun=tahun, kategori=kategori, is_carryover=is_carryover, _user=_user)
    real_data = list_realization(tahun=tahun, is_carryover=is_carryover, _user=_user)
    
    formatted_data = []
    for c in capex_data:
        c_dict = c.copy()
        c_reals = [r for r in real_data if str(r.get("capex_id")) == str(c.get("id"))]
        
        # In realisasi frontend, status and keterangan are taken from the first available real item, or fallback
        status_val = ""
        ket_val = ""
        for r in c_reals:
            if r.get("status"): status_val = r.get("status")
            if r.get("keterangan"): ket_val = r.get("keterangan")
            
        c_dict["status"] = status_val
        c_dict["keterangan"] = ket_val
        
        for r in c_reals:
            c_dict[f"b{r.get('bulan')}_rkap"] = r.get("nilai_rkap", 0)
            c_dict[f"b{r.get('bulan')}_real"] = r.get("nilai_realisasi", 0)
            c_dict[f"b{r.get('bulan')}_bast"] = r.get("nilai_bast", 0)
            
        # Apply Filters
        if search and search.lower() not in (c_dict.get("daftar_capex") or "").lower():
            continue
        if status and c_dict.get("status") != status:
            continue
        if pic and c_dict.get("pic") != pic:
            continue
            
        formatted_data.append(c_dict)

    if is_carryover:
        output = generate_carryover_excel(formatted_data, tahun)
    else:
        output = generate_realization_excel(formatted_data, tahun)

    prefix = "CarryOver" if is_carryover else "Realisasi"
    filename = f"{prefix}_{tahun}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )

@router.get("/gabungan")
def export_gabungan_excel(
    tahun: int = Query(...),
    kategori: Optional[str] = None,
    status: Optional[str] = None,
    pic: Optional[str] = None,
    search: Optional[str] = None,
    _user: dict = Depends(get_current_user),
):
    capex_data = list_capex(tahun=tahun, kategori=kategori, _user=_user)
    real_data = list_realization(tahun=tahun, _user=_user)
    
    formatted_data = []
    for c in capex_data:
        c_dict = c.copy()
        c_reals = [r for r in real_data if str(r.get("capex_id")) == str(c.get("id"))]
        
        status_val = ""
        ket_val = ""
        for r in c_reals:
            if r.get("status"): status_val = r.get("status")
            if r.get("keterangan"): ket_val = r.get("keterangan")
            
        c_dict["status"] = status_val
        c_dict["keterangan"] = ket_val
        
        for r in c_reals:
            c_dict[f"b{r.get('bulan')}_rkap"] = r.get("nilai_rkap", 0)
            c_dict[f"b{r.get('bulan')}_real"] = r.get("nilai_realisasi", 0)
            c_dict[f"b{r.get('bulan')}_bast"] = r.get("nilai_bast", 0)
            
        if search and search.lower() not in (c_dict.get("daftar_capex") or "").lower():
            continue
        if status and c_dict.get("status") != status:
            continue
        if pic and c_dict.get("pic") != pic:
            continue
            
        formatted_data.append(c_dict)

    output = generate_gabungan_excel(formatted_data, tahun)

    filename = f"Laporan_Gabungan_{tahun}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )

@router.get("/audit-logs")
def export_audit_logs_excel(
    tahun: int = Query(...),
    _user: dict = Depends(get_current_user),
):
    audit_data = get_audit_logs(tahun=tahun, _user=_user)
    formatted_data = [a.copy() for a in audit_data]
    output = generate_audit_logs_excel(formatted_data, tahun)
    
    filename = f"Riwayat_Pengalihan_{tahun}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )

@router.get("/assets")
def export_assets_excel(
    category: Optional[str] = None,
    lokasi: Optional[str] = None,
    search: Optional[str] = None,
    _user: dict = Depends(get_current_user),
):
    assets_data = list_assets(category=category, lokasi=lokasi, search=search, _user=_user)
    formatted_data = [a.copy() for a in assets_data]
    output = generate_assets_excel(formatted_data)
    filename = f"Data_Aset_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )

@router.get("/timeline")
def export_timeline_excel(
    tahun: int = Query(...),
    capex_id: Optional[str] = None,
    kategori: Optional[str] = None,
    departemen: Optional[str] = None,
    search: Optional[str] = None,
    _user: dict = Depends(get_current_user),
):
    capex_data = list_capex(tahun=tahun, kategori=kategori, _user=_user)
    timeline_data = list_timeline(tahun=tahun, capex_id=capex_id, _user=_user)
    
    formatted_data = []
    for c in capex_data:
        if capex_id and str(c.get("id")) != capex_id:
            continue
            
        if search and search.lower() not in (c.get("daftar_capex") or "").lower() and search.lower() not in (c.get("pic") or "").lower() and search.lower() not in (c.get("keterangan") or "").lower():
            continue
            
        if departemen and c.get("pic") != departemen:
            continue
            
        c_dict = c.copy()
        c_timelines = [t for t in timeline_data if str(t.get("capex_id")) == str(c.get("id"))]
        
        timeline_dict = {}
        for t in c_timelines:
            m = t.get("bulan")
            w = t.get("minggu")
            if m not in timeline_dict:
                timeline_dict[m] = {}
            timeline_dict[m][w] = t.get("kode_status", "")
            
        c_dict["timeline_dict"] = timeline_dict
        formatted_data.append(c_dict)
        
    output = generate_timeline_excel(formatted_data, tahun)
    filename = f"Timeline_{tahun}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
