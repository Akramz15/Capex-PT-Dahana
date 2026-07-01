from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from uuid import UUID

from ..core.database import get_supabase_admin
from ..core.security import get_current_user, require_admin
from ..models.capex import CapexMasterCreate, CapexMasterUpdate, CapexMasterResponse

router = APIRouter(prefix="/capex", tags=["RKAP Master"])

_TABLE = "capex_master"


@router.get("", response_model=list[CapexMasterResponse])
async def list_capex(
    tahun: Optional[int] = Query(None, description="Filter berdasarkan tahun"),
    kategori: Optional[str] = Query(None, description="Filter berdasarkan kategori"),
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = client.table(_TABLE).select("*").order("tahun").order("kode")

    if tahun:
        query = query.eq("tahun", tahun)
    if kategori:
        query = query.eq("kategori", kategori)

    result = query.execute()
    return result.data


@router.get("/{capex_id}", response_model=CapexMasterResponse)
async def get_capex(
    capex_id: UUID,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).select("*").eq("id", str(capex_id)).single().execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data Capex tidak ditemukan.")
    return result.data


@router.post("", response_model=CapexMasterResponse, status_code=status.HTTP_201_CREATED)
async def create_capex(
    payload: CapexMasterCreate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).insert(payload.model_dump()).execute()
    return result.data[0]


@router.put("/{capex_id}", response_model=CapexMasterResponse)
async def update_capex(
    capex_id: UUID,
    payload: CapexMasterUpdate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tidak ada field yang diupdate.")

    result = client.table(_TABLE).update(update_data).eq("id", str(capex_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data Capex tidak ditemukan.")
    return result.data[0]


@router.delete("/{capex_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_capex(
    capex_id: UUID,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).delete().eq("id", str(capex_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data Capex tidak ditemukan.")
