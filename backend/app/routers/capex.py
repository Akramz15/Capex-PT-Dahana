from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from typing import Optional
from uuid import UUID
import openpyxl

from ..core.database import get_supabase_admin
from ..core.security import get_current_user, require_admin
from ..models.capex import CapexMasterCreate, CapexMasterUpdate, CapexMasterResponse

router = APIRouter(prefix="/capex", tags=["RKAP Master"])

_TABLE = "capex_master"


@router.get("", response_model=list[CapexMasterResponse])
def list_capex(
    tahun: Optional[int] = None,
    kategori: Optional[str] = None,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = client.table(_TABLE).select("*").order("tahun").order("kode")

    if tahun is not None and isinstance(tahun, int):
        query = query.eq("tahun", tahun)
    if kategori is not None and isinstance(kategori, str):
        query = query.eq("kategori", kategori)

    result = query.execute()
    return result.data


@router.get("/{capex_id}", response_model=CapexMasterResponse)
def get_capex(
    capex_id: UUID,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    result = client.table(_TABLE).select("*").eq("id", str(capex_id)).single().execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data Capex tidak ditemukan.")
    return result.data


@router.post("", response_model=CapexMasterResponse, status_code=status.HTTP_201_CREATED)
def create_capex(
    payload: CapexMasterCreate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    
    # 1. Cek apakah RKAP tahun tersebut dikunci
    lock_res = client.table("rkap_locks").select("is_locked").eq("tahun", payload.tahun).execute()
    is_locked = False
    if lock_res.data and lock_res.data[0]["is_locked"]:
        is_locked = True
        
    if is_locked:
        # Jika dikunci, pastikan RKAP 0 dan wajib ada sumber dana
        if payload.anggaran_rkap > 0:
            raise HTTPException(status_code=400, detail="RKAP sudah dikunci. Anggaran RKAP awal harus 0.")
        if not payload.source_capex_id:
            raise HTTPException(status_code=400, detail="RKAP sudah dikunci. Anda wajib memilih Sumber Dana (Capex Lama) untuk digeser anggarannya.")
            
        # Panggil RPC untuk memastikan transaksi aman (potong sumber, tambah baru)
        try:
            rpc_res = client.rpc(
                "rpc_create_capex_reallocation", 
                {
                    "p_tahun": payload.tahun,
                    "p_kode": payload.kode,
                    "p_daftar_capex": payload.daftar_capex,
                    "p_kategori": payload.kategori,
                    "p_anggaran_perubahan": payload.anggaran_perubahan,
                    "p_pic": payload.pic,
                    "p_source_capex_id": str(payload.source_capex_id),
                    "p_user_id": _admin["id"]
                }
            ).execute()
            new_id = rpc_res.data
            
            # Fetch data baru untuk response
            new_capex = client.table(_TABLE).select("*").eq("id", new_id).single().execute()
            return new_capex.data
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Gagal melakukan pergeseran anggaran: {str(e)}")
            
    else:
        # Jika belum dikunci, insert normal
        result = client.table(_TABLE).insert(payload.model_dump(exclude_unset=True)).execute()
        return result.data[0]

@router.put("/{capex_id}", response_model=CapexMasterResponse)
def update_capex(
    capex_id: UUID,
    payload: CapexMasterUpdate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()

    # 1. Cek apakah ada perubahan pada anggaran_rkap saat RKAP dikunci
    if payload.anggaran_rkap is not None:
        existing = client.table(_TABLE).select("tahun").eq("id", str(capex_id)).single().execute()
        if existing.data:
            tahun = existing.data["tahun"]
            lock_res = client.table("rkap_locks").select("is_locked").eq("tahun", tahun).execute()
            if lock_res.data and lock_res.data[0]["is_locked"]:
                raise HTTPException(
                    status_code=400, 
                    detail="Tahun RKAP ini sudah dikunci! Anda tidak bisa mengubah Anggaran RKAP awal. Silakan Buka Kunci (Unlock) terlebih dahulu jika memang ada salah ketik."
                )

    # 2. Penyesuaian anggaran sumber jika anggaran_perubahan diubah pada item pergeseran
    if payload.anggaran_perubahan is not None:
        existing_full = client.table(_TABLE).select("source_capex_id, anggaran_perubahan").eq("id", str(capex_id)).execute()
        if existing_full.data:
            item_data = existing_full.data[0]
            source_id = item_data.get("source_capex_id")
            old_amount = item_data.get("anggaran_perubahan") or 0
            new_amount = payload.anggaran_perubahan
            delta = new_amount - old_amount
            
            if source_id and delta != 0:
                source_res = client.table(_TABLE).select("anggaran_perubahan").eq("id", str(source_id)).execute()
                if source_res.data:
                    current_source = source_res.data[0].get("anggaran_perubahan") or 0
                    if delta > 0 and current_source < delta:
                        raise HTTPException(status_code=400, detail="Sisa anggaran sumber tidak mencukupi untuk penambahan pergeseran ini.")
                    
                    client.table(_TABLE).update({"anggaran_perubahan": current_source - delta}).eq("id", str(source_id)).execute()

    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tidak ada field yang diupdate.")

    result = client.table(_TABLE).update(update_data).eq("id", str(capex_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data Capex tidak ditemukan.")
    return result.data[0]


@router.delete("/{capex_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_capex(
    capex_id: UUID,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    
    # 1. Ambil data item yang akan dihapus
    existing = client.table(_TABLE).select("source_capex_id, anggaran_perubahan").eq("id", str(capex_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data Capex tidak ditemukan.")
    
    item = existing.data[0]
    source_id = item.get("source_capex_id")
    refund_amount = item.get("anggaran_perubahan") or 0
    
    # 2. Jika item berasal dari pergeseran dana, kembalikan saldonya ke sumber
    if source_id and refund_amount > 0:
        source_res = client.table(_TABLE).select("anggaran_perubahan").eq("id", str(source_id)).execute()
        if source_res.data:
            current_source_budget = source_res.data[0].get("anggaran_perubahan") or 0
            new_source_budget = current_source_budget + refund_amount
            client.table(_TABLE).update({"anggaran_perubahan": new_source_budget}).eq("id", str(source_id)).execute()
            
    # 3. Hapus data capex
    client.table(_TABLE).delete().eq("id", str(capex_id)).execute()


@router.get("/audit-logs/all")
def get_audit_logs(
    tahun: int = Query(..., description="Tahun anggaran"),
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    # Join capex_audit_logs with capex_master and profiles
    query = (
        client.table("capex_audit_logs")
        .select("*, capex_master!capex_audit_logs_capex_id_fkey(kode, daftar_capex), profiles(full_name)")
        .eq("tahun", tahun)
        .order("created_at", desc=True)
    )
    result = query.execute()
    
    logs = []
    for r in result.data:
        capex_info = r.get("capex_master") or {}
        prof_info = r.get("profiles") or {}
        logs.append({
            "id": r["id"],
            "tahun": r["tahun"],
            "action_type": r["action_type"],
            "capex_id": r["capex_id"],
            "source_capex_id": r["source_capex_id"],
            "anggaran": r["anggaran"],
            "keterangan": r["keterangan"],
            "created_at": r["created_at"],
            "user_name": prof_info.get("full_name") or "System",
            "capex_nama": capex_info.get("daftar_capex") or "-",
            "capex_kode": capex_info.get("kode") or "-"
        })
    return logs


@router.post("/upload")
def upload_capex_excel(
    tahun: int = Query(...),
    file: UploadFile = File(...),
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()
    
    # Cek apakah RKAP tahun tersebut dikunci
    lock_res = client.table("rkap_locks").select("is_locked").eq("tahun", tahun).execute()
    if lock_res.data and lock_res.data[0]["is_locked"]:
        raise HTTPException(status_code=400, detail="Gagal Upload: RKAP tahun ini sudah dikunci.")

    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Format file tidak didukung. Harap upload file Excel (.xlsx)")

    try:
        wb = openpyxl.load_workbook(file.file, data_only=True)
        sheet = wb.active
        
        inserted = 0
        data_to_insert = []
        
        # Asumsi baris 1 adalah header: Kode | Daftar Capex | Kategori | Anggaran RKAP | PIC
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if not row or not row[1]: # Jika daftar capex kosong, skip
                continue
                
            kode = str(row[0]) if row[0] else ""
            daftar_capex = str(row[1])
            kategori = str(row[2]) if row[2] else ""
            
            # Parsing anggaran (bisa int, float, atau string berformat)
            try:
                anggaran_str = str(row[3]).replace(',', '').replace('.', '') if row[3] else "0"
                # If there are trailing zeros from float conversion, handle it
                if '.' in anggaran_str:
                    anggaran_str = anggaran_str.split('.')[0]
                anggaran = int(anggaran_str)
            except ValueError:
                anggaran = 0
                
            pic = str(row[4]) if len(row) > 4 and row[4] else ""
            
            data_to_insert.append({
                "tahun": tahun,
                "kode": kode,
                "daftar_capex": daftar_capex,
                "kategori": kategori,
                "anggaran_rkap": anggaran,
                "anggaran_perubahan": anggaran, # Set default anggaran_perubahan sama dengan RKAP
                "pic": pic
            })
            
        if data_to_insert:
            client.table(_TABLE).insert(data_to_insert).execute()
            inserted = len(data_to_insert)
            
        return {"message": f"Berhasil upload {inserted} data capex untuk tahun {tahun}."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan saat memproses file Excel: {str(e)}")
