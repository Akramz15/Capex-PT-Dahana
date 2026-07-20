from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from uuid import UUID

from ..core.database import get_supabase_admin
from ..core.security import get_current_user, require_admin
from ..models.asset import LKUCreate, LKUUpdate, LKUResponse
from ..services.audit import log_module_update

router = APIRouter(prefix="/lku", tags=["LKU"])

_TABLE = "capex_lku"


@router.get("", response_model=list[LKUResponse])
def list_lku(
    tahun: Optional[int] = None,
    departemen: Optional[str] = None,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = client.table(_TABLE).select("*").order("tahun").order("departemen")

    if tahun is not None and isinstance(tahun, int):
        query = query.eq("tahun", tahun)
    if departemen is not None and isinstance(departemen, str):
        query = query.ilike("departemen", f"%{departemen}%")

    result = query.execute()
    return result.data


@router.post("", response_model=LKUResponse, status_code=status.HTTP_201_CREATED)
def create_lku(
    payload: LKUCreate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    data = payload.model_dump()
    if data.get("capex_id"):
        data["capex_id"] = str(data["capex_id"])
    result = client.table(_TABLE).insert(data).execute()
    log_module_update(client, "LKU", _admin.get("full_name", "Admin"))
    return result.data[0]


@router.put("/{lku_id}", response_model=LKUResponse)
def update_lku(
    lku_id: UUID,
    payload: LKUUpdate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tidak ada field yang diupdate.")

    result = client.table(_TABLE).update(update_data).eq("id", str(lku_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data LKU tidak ditemukan.")
    log_module_update(client, "LKU", _admin.get("full_name", "Admin"))
    return result.data[0]


@router.delete("/{lku_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lku(
    lku_id: UUID,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).delete().eq("id", str(lku_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data LKU tidak ditemukan.")
    log_module_update(client, "LKU", _admin.get("full_name", "Admin"))
