from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
import openpyxl
from io import BytesIO
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

@router.post("/upload")
def upload_timeline_excel(
    tahun: int = Query(...),
    file: UploadFile = File(...),
    _admin: dict = Depends(require_admin),
):
    try:
        contents = file.file.read()
        wb = openpyxl.load_workbook(BytesIO(contents), data_only=True)
        ws = wb.active
        
        client = get_supabase_admin()
        
        # Get mapping of Kode to Capex ID for this year
        capex_res = client.table("capex_master").select("id, kode").eq("tahun", tahun).execute()
        capex_map = {}
        for c in capex_res.data:
            if c.get("kode"):
                capex_map[str(c["kode"]).strip().upper()] = c["id"]
        
        insert_data = []
        for row in ws.iter_rows(min_row=5, values_only=True):
            if not row[0] or not row[2]:
                continue
            
            kode = str(row[2]).strip().upper()
            capex_id = capex_map.get(kode)
            if not capex_id:
                continue
                
            c_idx = 5 # 0-indexed, col F is index 5
            for month_idx in range(1, 13):
                for week_idx in range(1, 6):
                    try:
                        status_val = row[c_idx]
                        if status_val and str(status_val).strip() in ['A', 'B', 'C', 'D']:
                            insert_data.append({
                                "capex_id": str(capex_id),
                                "tahun": tahun,
                                "bulan": month_idx,
                                "minggu": week_idx,
                                "kode_status": str(status_val).strip().upper()
                            })
                    except Exception:
                        pass
                    c_idx += 1
                    
        if not insert_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada data timeline valid ditemukan.")
            
        chunk_size = 100
        total = 0
        for i in range(0, len(insert_data), chunk_size):
            chunk = insert_data[i:i+chunk_size]
            res = client.table(_TABLE).upsert(chunk, on_conflict="capex_id,tahun,bulan,minggu").execute()
            if getattr(res, 'data', None):
                total += len(res.data)
            
        return {"message": f"Berhasil mengupload jadwal timeline untuk {total} record."}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Gagal memproses file: {str(e)}")
