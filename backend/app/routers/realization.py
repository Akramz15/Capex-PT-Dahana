from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
import openpyxl
from io import BytesIO
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
    is_carryover: bool = False,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = (
        client.table(_TABLE)
        .select("*, capex_master!inner(daftar_capex, kode, is_carryover)")
        .order("tahun")
        .order("bulan")
    )
    if capex_id is not None and isinstance(capex_id, (str, UUID)):
        query = query.eq("capex_id", str(capex_id))
    if tahun is not None and isinstance(tahun, int):
        query = query.eq("tahun", tahun)
    if bulan is not None and isinstance(bulan, int):
        query = query.eq("bulan", bulan)
        
    query = query.eq("capex_master.is_carryover", is_carryover)

    all_data = []
    offset = 0
    limit_size = 1000
    while True:
        res = query.range(offset, offset + limit_size - 1).execute()
        all_data.extend(res.data)
        if len(res.data) < limit_size:
            break
        offset += limit_size

    return all_data


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
            "nilai_bast": item.nilai_bast,
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

@router.post("/upload", status_code=status.HTTP_200_OK)
def upload_realization(
    tahun: int = Query(...),
    file: UploadFile = File(...),
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    
    # Cek kunci RKAP jika perlu (walaupun ini realisasi, biasanya ada lock realisasi juga. 
    # Tapi untuk simpel, kita asumsikan jika RKAP dikunci, realisasi tetap bisa diisi kecuali ditentukan lain)
    
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Format file tidak didukung. Harap upload .xlsx")
        
    try:
        content_file = file.file.read()
        wb = openpyxl.load_workbook(BytesIO(content_file), data_only=True)
        ws = wb.active
        
        # Ambil semua capex master untuk mapping id berdasarkan daftar_capex
        capex_res = client.table("capex_master").select("id, daftar_capex").eq("tahun", tahun).execute()
        capex_map = {c["daftar_capex"].lower().strip(): c["id"] for c in capex_res.data if c.get("daftar_capex")}
        
        inserted = 0
        data_to_upsert = []
        
        # Mulai dari baris 5 berdasarkan export_dynamic.py
        for row in ws.iter_rows(min_row=5, values_only=True):
            if not row or not row[1] or str(row[1]).lower().strip() == 'total':
                continue
                
            daftar_capex = str(row[1]).lower().strip()
            capex_id = capex_map.get(daftar_capex)
            
            if not capex_id:
                continue
                
            status_val = str(row[4]) if row[4] else None
            ket_val = str(row[5]) if row[5] else None
            
            col_idx = 6 # idx 6 is column 7 (JANUARI RKAP) -> Wait, 0-indexed: row[6] is column G.
            
            for bulan in range(1, 13):
                rkap_val = row[col_idx]
                real_val = row[col_idx+1]
                
                def parse_int(v):
                    try:
                        if not v: return 0
                        return int(float(v))
                    except:
                        return 0
                        
                rkap_int = parse_int(rkap_val)
                real_int = parse_int(real_val)
                
                # Kita upsert jika ada nilainya
                # Supaya tidak menumpuk database dengan 0,0 jika tidak ada realisasi
                # Tapi kalau dari upload, bisa jadi mengubah jadi 0. Jadi kita insert aja
                data_to_upsert.append({
                    "capex_id": capex_id,
                    "tahun": tahun,
                    "bulan": bulan,
                    "nilai_rkap": rkap_int,
                    "nilai_realisasi": real_int,
                    "status": status_val,
                    "keterangan": ket_val
                })
                col_idx += 2
                inserted += 1
                
        if data_to_upsert:
            # Upsert
            client.table("capex_realization").upsert(data_to_upsert, on_conflict="capex_id,tahun,bulan").execute()
            
        return {"message": f"Berhasil memproses upload untuk {len(data_to_upsert)//12} item capex."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
