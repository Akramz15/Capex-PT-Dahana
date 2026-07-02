from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Literal, Optional
from uuid import UUID

from ..core.database import get_supabase_admin
from ..core.security import get_current_user, require_admin
from ..models.realization import StatusLogCreate, StatusLogUpdate, StatusLogResponse

router = APIRouter(prefix="/status", tags=["Status Log"])

_TABLE = "capex_status_log"
StatusTypeFilter = Literal["PO", "Tender", "Kajian", "BAADK", "Lainnya"]


@router.get("", response_model=list[StatusLogResponse])
def list_status_log(
    tahun: Optional[int] = Query(None),
    status_type: Optional[StatusTypeFilter] = Query(None),
    capex_id: Optional[UUID] = Query(None),
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = (
        client.table(_TABLE)
        .select("*, capex_master(daftar_capex, kode)")
        .order("tahun")
        .order("status_type")
    )
    if tahun:
        query = query.eq("tahun", tahun)
    if status_type:
        query = query.eq("status_type", status_type)
    if capex_id:
        query = query.eq("capex_id", str(capex_id))

    result = query.execute()
    return result.data


@router.get("/{log_id}", response_model=StatusLogResponse)
def get_status_log(
    log_id: UUID,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).select("*").eq("id", str(log_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status log tidak ditemukan.")
    return result.data


@router.post("", response_model=StatusLogResponse, status_code=status.HTTP_201_CREATED)
def create_status_log(
    payload: StatusLogCreate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    data = payload.model_dump()
    data["capex_id"] = str(data["capex_id"])
    result = client.table(_TABLE).insert(data).execute()
    return result.data[0]


@router.put("/{log_id}", response_model=StatusLogResponse)
def update_status_log(
    log_id: UUID,
    payload: StatusLogUpdate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tidak ada field yang diupdate.")

    result = client.table(_TABLE).update(update_data).eq("id", str(log_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status log tidak ditemukan.")
    return result.data[0]


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_status_log(
    log_id: UUID,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).delete().eq("id", str(log_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status log tidak ditemukan.")
