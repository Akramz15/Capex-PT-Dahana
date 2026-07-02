from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from uuid import UUID

from ..core.database import get_supabase_admin
from ..core.security import get_current_user, require_admin
from ..models.realization import (
    RealizationCreate, RealizationUpdate, RealizationResponse,
)

router = APIRouter(prefix="/realization", tags=["Realisasi"])

_TABLE = "capex_realization"


@router.get("", response_model=list[RealizationResponse])
def list_realization(
    capex_id: Optional[UUID] = None,
    tahun: Optional[int] = None,
    bulan: Optional[int] = None,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = (
        client.table(_TABLE)
        .select("*, capex_master(daftar_capex, kode)")
        .order("tahun")
        .order("bulan")
    )
    if capex_id is not None and isinstance(capex_id, (str, UUID)):
        query = query.eq("capex_id", str(capex_id))
    if tahun is not None and isinstance(tahun, int):
        query = query.eq("tahun", tahun)
    if bulan is not None and isinstance(bulan, int):
        query = query.eq("bulan", bulan)

    result = query.execute()
    return result.data


@router.get("/{realization_id}", response_model=RealizationResponse)
def get_realization(
    realization_id: UUID,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).select("*").eq("id", str(realization_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data realisasi tidak ditemukan.")
    return result.data


@router.post("", response_model=RealizationResponse, status_code=status.HTTP_201_CREATED)
def create_realization(
    payload: RealizationCreate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    data = payload.model_dump()
    data["capex_id"] = str(data["capex_id"])
    result = client.table(_TABLE).insert(data).execute()
    return result.data[0]


from ..models.realization_bulk import RealizationBulkRequest

@router.post("/bulk", status_code=status.HTTP_200_OK)
def upsert_realization_bulk(
    payload: RealizationBulkRequest,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    data_list = []
    
    # We use Supabase upsert which requires the unique constraint (capex_id, tahun, bulan)
    # However, upsert via REST needs all columns or relies on ON CONFLICT.
    # Supabase handles upsert automatically if we provide the conflict columns.
    
    for item in payload.items:
        data_list.append({
            "capex_id": str(payload.capex_id),
            "tahun": payload.tahun,
            "bulan": item.bulan,
            "nilai_rkap": item.nilai_rkap,
            "nilai_realisasi": item.nilai_realisasi,
            "status": payload.status,
            "keterangan": payload.keterangan,
            "pic": payload.pic
        })
        
    result = client.table(_TABLE).upsert(data_list, on_conflict="capex_id,tahun,bulan").execute()
    return result.data


@router.put("/{realization_id}", response_model=RealizationResponse)
def update_realization(
    realization_id: UUID,
    payload: RealizationUpdate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tidak ada field yang diupdate.")

    result = client.table(_TABLE).update(update_data).eq("id", str(realization_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data realisasi tidak ditemukan.")
    return result.data[0]


@router.delete("/{realization_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_realization(
    realization_id: UUID,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).delete().eq("id", str(realization_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data realisasi tidak ditemukan.")
