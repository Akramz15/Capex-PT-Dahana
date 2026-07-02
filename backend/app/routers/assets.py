from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from uuid import UUID

from ..core.database import get_supabase_admin
from ..core.security import get_current_user, require_admin
from ..models.asset import AssetCreate, AssetUpdate, AssetResponse

router = APIRouter(prefix="/assets", tags=["Aset"])

_TABLE = "capex_assets"


@router.get("", response_model=list[AssetResponse])
def list_assets(
    category: Optional[str] = Query(None, description="Filter kategori aset"),
    lokasi: Optional[str] = Query(None, description="Filter lokasi aset"),
    search: Optional[str] = Query(None, description="Cari berdasarkan deskripsi aset"),
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = client.table(_TABLE).select("*").order("tanggal_po", desc=True)

    if category:
        query = query.eq("category", category)
    if lokasi:
        query = query.ilike("lokasi", f"%{lokasi}%")
    if search:
        query = query.ilike("asset_description", f"%{search}%")

    result = query.execute()
    return result.data


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: UUID,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).select("*").eq("id", str(asset_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data aset tidak ditemukan.")
    return result.data


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetCreate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    data = payload.model_dump()
    for date_field in ("tanggal_po", "capitalized_on"):
        if data.get(date_field):
            data[date_field] = str(data[date_field])
    result = client.table(_TABLE).insert(data).execute()
    return result.data[0]


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: UUID,
    payload: AssetUpdate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tidak ada field yang diupdate.")

    for date_field in ("tanggal_po", "capitalized_on"):
        if date_field in update_data:
            update_data[date_field] = str(update_data[date_field])

    result = client.table(_TABLE).update(update_data).eq("id", str(asset_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data aset tidak ditemukan.")
    return result.data[0]


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: UUID,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).delete().eq("id", str(asset_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data aset tidak ditemukan.")
