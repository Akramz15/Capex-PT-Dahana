from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from uuid import UUID

from ..core.database import get_supabase_admin
from ..core.security import get_current_user, require_admin
from ..models.user import TimelineCreate, TimelineUpdate, TimelineResponse

router = APIRouter(prefix="/timeline", tags=["Timeline"])

_TABLE = "capex_timeline"


@router.get("", response_model=list[TimelineResponse])
def list_timeline(
    tahun: Optional[int] = None,
    capex_id: Optional[UUID] = None,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = (
        client.table(_TABLE)
        .select("*, capex_master(daftar_capex, kode)")
        .order("tahun")
        .order("bulan")
        .order("minggu")
    )
    if tahun is not None and isinstance(tahun, int):
        query = query.eq("tahun", tahun)
    if capex_id is not None and isinstance(capex_id, (str, UUID)):
        query = query.eq("capex_id", str(capex_id))

    result = query.execute()
    return result.data


@router.post("", response_model=TimelineResponse, status_code=status.HTTP_201_CREATED)
def create_timeline(
    payload: TimelineCreate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    data = payload.model_dump()
    data["capex_id"] = str(data["capex_id"])
    result = client.table(_TABLE).insert(data).execute()
    return result.data[0]

from ..models.timeline_bulk import TimelineBulkRequest

@router.post("/bulk", status_code=status.HTTP_200_OK)
def upsert_timeline_bulk(
    payload: TimelineBulkRequest,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    data_list = []
    
    for item in payload.items:
        data_list.append({
            "capex_id": str(payload.capex_id),
            "tahun": payload.tahun,
            "bulan": item.bulan,
            "minggu": item.minggu,
            "kode_status": item.kode_status,
            "keterangan": item.keterangan
        })
        
    result = client.table(_TABLE).upsert(data_list, on_conflict="capex_id,tahun,bulan,minggu").execute()
    return result.data


@router.put("/{timeline_id}", response_model=TimelineResponse)
def update_timeline(
    timeline_id: UUID,
    payload: TimelineUpdate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tidak ada field yang diupdate.")

    result = client.table(_TABLE).update(update_data).eq("id", str(timeline_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data timeline tidak ditemukan.")
    return result.data[0]


@router.delete("/{timeline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timeline(
    timeline_id: UUID,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).delete().eq("id", str(timeline_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data timeline tidak ditemukan.")
