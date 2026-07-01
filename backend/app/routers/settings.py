from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.database import get_supabase
from app.core.security import require_admin

router = APIRouter(prefix="/settings", tags=["Settings"])


class LockStatus(BaseModel):
    is_locked: bool


@router.get("/rkap-lock/{tahun}")
async def get_rkap_lock(tahun: int):
    """Mendapatkan status penguncian RKAP untuk tahun tertentu."""
    sb = get_supabase()
    res = sb.table("rkap_locks").select("is_locked").eq("tahun", tahun).execute()
    if len(res.data) > 0:
        return {"tahun": tahun, "is_locked": res.data[0]["is_locked"]}
    # Default jika belum ada record
    return {"tahun": tahun, "is_locked": False}


@router.post("/rkap-lock/{tahun}")
async def set_rkap_lock(
    tahun: int, 
    lock_data: LockStatus, 
    _admin=Depends(require_admin)
):
    """Mengubah status penguncian RKAP (Hanya Admin)."""
    sb = get_supabase()

    
    # Cek apakah sudah ada
    res = sb.table("rkap_locks").select("is_locked").eq("tahun", tahun).execute()
    
    if len(res.data) > 0:
        # Update
        update_res = sb.table("rkap_locks").update({
            "is_locked": lock_data.is_locked,
            "updated_by": _admin["id"]
        }).eq("tahun", tahun).execute()
        return update_res.data[0]
    else:
        # Insert
        insert_res = sb.table("rkap_locks").insert({
            "tahun": tahun,
            "is_locked": lock_data.is_locked,
            "updated_by": _admin["id"]
        }).execute()
        return insert_res.data[0]
