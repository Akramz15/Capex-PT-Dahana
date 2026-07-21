from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from typing import Optional
from uuid import UUID
import openpyxl

from ..core.database import get_supabase_admin
from ..core.security import get_current_user, require_admin
from ..models.capex import CapexMasterCreate, CapexMasterUpdate, CapexMasterResponse
from ..services.audit import log_module_update

router = APIRouter(prefix="/capex", tags=["RKAP Master"])

_TABLE = "capex_master"


@router.get("", response_model=list[CapexMasterResponse])
def list_capex(
    tahun: Optional[int] = None,
    kategori: Optional[str] = None,
    is_carryover: bool = False,
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    query = client.table(_TABLE).select("*").order("tahun").order("kode")

    if tahun is not None and isinstance(tahun, int):
        query = query.eq("tahun", tahun)
    if kategori is not None and isinstance(kategori, str):
        query = query.eq("kategori", kategori)
        
    query = query.eq("is_carryover", is_carryover)

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
        if not payload.nd_persetujuan:
            raise HTTPException(status_code=400, detail="RKAP sudah dikunci. ND Persetujuan wajib diisi sebagai bukti persetujuan.")
            
        try:
            # 1. Cek & ambil data sumber
            source_res = client.table(_TABLE).select("*").eq("id", str(payload.source_capex_id)).execute()
            if not source_res.data:
                raise HTTPException(status_code=400, detail="Capex sumber tidak ditemukan.")
            
            source_capex = source_res.data[0]
            source_anggaran_awal = source_capex.get("anggaran_perubahan", 0)
            
            if source_anggaran_awal < payload.anggaran_perubahan:
                raise HTTPException(status_code=400, detail="Sisa anggaran sumber tidak mencukupi.")
            
            source_anggaran_akhir = source_anggaran_awal - payload.anggaran_perubahan
            
            # 2. Kurangi anggaran sumber di capex_master
            client.table(_TABLE).update({"anggaran_perubahan": source_anggaran_akhir}).eq("id", str(payload.source_capex_id)).execute()
            
            # 2b. Kurangi anggaran sumber di realisasi bulanan (dari bulan 12 mundur)
            try:
                real_res = client.table("capex_realization").select("*").eq("capex_id", str(payload.source_capex_id)).order("bulan", desc=True).execute()
                amount_to_deduct = payload.anggaran_perubahan
                original_reals = real_res.data
                
                for r in original_reals:
                    if amount_to_deduct <= 0:
                        break
                    rkap_val = r.get("nilai_rkap") or 0
                    if rkap_val > 0:
                        deduction = min(rkap_val, amount_to_deduct)
                        new_val = rkap_val - deduction
                        client.table("capex_realization").update({"nilai_rkap": new_val}).eq("id", r["id"]).execute()
                        amount_to_deduct -= deduction
            except Exception as e:
                # Gagal potong bulanan, biarkan lanjut tapi idealnya di-log
                pass
            
            try:
                # 3. Insert capex baru (tujuan)
                new_data = payload.model_dump(mode='json', exclude_unset=True)
                nd_val = new_data.pop("nd_persetujuan", None)
                new_res = client.table(_TABLE).insert(new_data).execute()
                new_capex = new_res.data[0]
                
                # 4. Insert Audit Log Lengkap
                audit_data = {
                    "capex_id": new_capex["id"],
                    "tahun": payload.tahun,
                    "action_type": "CREATE_REALLOCATION",
                    "keterangan": f"Pengalihan dana dari {source_capex['daftar_capex']} ke {payload.daftar_capex}",
                    "user_id": _admin["id"],
                    "anggaran": payload.anggaran_perubahan,
                    "nd_persetujuan": nd_val,
                    "source_capex_name": source_capex["daftar_capex"],
                    "source_nilai_awal": source_anggaran_awal,
                    "source_nilai_akhir": source_anggaran_akhir,
                    "target_capex_name": payload.daftar_capex,
                    "target_nilai_awal": 0,
                    "target_nilai_akhir": payload.anggaran_perubahan
                }
                client.table("capex_audit_logs").insert(audit_data).execute()
                
                log_module_update(client, "RKAP Master", _admin.get("full_name", "Admin"))
                return new_capex
            except Exception as inner_e:
                # Rollback anggaran sumber jika insert gagal
                client.table(_TABLE).update({"anggaran_perubahan": source_anggaran_awal}).eq("id", str(payload.source_capex_id)).execute()
                # Rollback realisasi bulanan
                if 'original_reals' in locals():
                    for r in original_reals:
                        client.table("capex_realization").update({"nilai_rkap": r.get("nilai_rkap")}).eq("id", r["id"]).execute()
                raise inner_e
                
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Gagal melakukan pergeseran anggaran: {str(e)}")
            
    else:
        # Jika belum dikunci, insert normal
        new_data = payload.model_dump(mode='json', exclude_unset=True)
        new_data.pop("nd_persetujuan", None) # Buang jika dikirim
        result = client.table(_TABLE).insert(new_data).execute()
        log_module_update(client, "RKAP Master", _admin.get("full_name", "Admin"))
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

    # 2. Penyesuaian anggaran sumber jika anggaran_perubahan diubah (Reallocation on Edit)
    if payload.anggaran_perubahan is not None:
        existing_full = client.table(_TABLE).select("tahun, daftar_capex, source_capex_id, anggaran_perubahan").eq("id", str(capex_id)).execute()
        if existing_full.data:
            item_data = existing_full.data[0]
            tahun = item_data.get("tahun")
            old_amount = item_data.get("anggaran_perubahan") or 0
            new_amount = payload.anggaran_perubahan
            delta = new_amount - old_amount
            
            if delta > 0:
                # Kenaikan Anggaran
                lock_res = client.table("rkap_locks").select("is_locked").eq("tahun", tahun).execute()
                is_locked = lock_res.data and lock_res.data[0]["is_locked"]
                
                if is_locked:
                    source_id = payload.reallocation_source_id or item_data.get("source_capex_id")
                    if not source_id:
                        raise HTTPException(status_code=400, detail="Tahun RKAP dikunci. Anda harus memilih Sumber Dana untuk penambahan anggaran.")
                    
                    source_res = client.table(_TABLE).select("daftar_capex, anggaran_perubahan, anggaran_rkap").eq("id", str(source_id)).execute()
                    if source_res.data:
                        source_capex = source_res.data[0]
                        current_source = source_capex.get("anggaran_perubahan") or source_capex.get("anggaran_rkap") or 0
                        if current_source < delta:
                            raise HTTPException(status_code=400, detail="Sisa anggaran sumber tidak mencukupi untuk penambahan pergeseran ini.")
                        
                        new_source_budget = current_source - delta
                        client.table(_TABLE).update({"anggaran_perubahan": new_source_budget}).eq("id", str(source_id)).execute()
                        
                        audit_data = {
                            "capex_id": str(capex_id),
                            "tahun": tahun,
                            "action_type": "UPDATE_REALLOCATION",
                            "keterangan": f"Penambahan anggaran dari {source_capex['daftar_capex']} ke {item_data['daftar_capex']}",
                            "user_id": _admin["id"],
                            "anggaran": delta,
                            "nd_persetujuan": payload.nd_persetujuan,
                            "source_capex_name": source_capex["daftar_capex"],
                            "source_nilai_awal": current_source,
                            "source_nilai_akhir": new_source_budget,
                            "target_capex_name": item_data["daftar_capex"],
                            "target_nilai_awal": old_amount,
                            "target_nilai_akhir": new_amount
                        }
                        client.table("capex_audit_logs").insert(audit_data).execute()
            
            elif delta < 0:
                # Penurunan Anggaran, kembalikan ke source_capex_id bawaan jika ada
                source_id = item_data.get("source_capex_id")
                if source_id:
                    source_res = client.table(_TABLE).select("anggaran_perubahan, anggaran_rkap").eq("id", str(source_id)).execute()
                    if source_res.data:
                        source_capex = source_res.data[0]
                        current_source = source_capex.get("anggaran_perubahan") or source_capex.get("anggaran_rkap") or 0
                        client.table(_TABLE).update({"anggaran_perubahan": current_source - delta}).eq("id", str(source_id)).execute()

    update_data = payload.model_dump(exclude_none=True)
    update_data.pop("reallocation_source_id", None)
    update_data.pop("nd_persetujuan", None)
    
    if not update_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tidak ada field yang diupdate.")

    result = client.table(_TABLE).update(update_data).eq("id", str(capex_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data Capex tidak ditemukan.")
        
    log_module_update(client, "RKAP Master", _admin.get("full_name", "Admin"))
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
            
            # Tambahkan juga ke realisasi bulanan agar sinkron (cari bulan dengan rkap terbesar, atau bulan 1)
            try:
                real_res = client.table("capex_realization").select("*").eq("capex_id", str(source_id)).execute()
                if real_res.data:
                    # Cari bulan dengan nilai_rkap terbesar
                    target_month = max(real_res.data, key=lambda x: x.get("nilai_rkap") or 0)
                    old_rkap = target_month.get("nilai_rkap") or 0
                    client.table("capex_realization").update({"nilai_rkap": old_rkap + refund_amount}).eq("id", target_month["id"]).execute()
            except Exception:
                pass
            
    # 3. Hapus data capex
    client.table(_TABLE).delete().eq("id", str(capex_id)).execute()
    log_module_update(client, "RKAP Master", _admin.get("full_name", "Admin"))


@router.get("/audit-logs/all")
def get_audit_logs(
    tahun: int = Query(..., description="Tahun anggaran"),
    _user: dict = Depends(get_current_user),
):
    client = get_supabase_admin()
    # Fetch audit logs with capex_master join
    query = (
        client.table("capex_audit_logs")
        .select("*, capex_master!capex_audit_logs_capex_id_fkey(kode, daftar_capex)")
        .eq("tahun", tahun)
        .order("created_at", desc=True)
    )
    result = query.execute()
    
    # Collect unique user_ids
    user_ids = list(set([r["user_id"] for r in result.data if r.get("user_id")]))
    
    # Fetch profile names manually
    prof_map = {}
    if user_ids:
        prof_res = client.table("profiles").select("id, full_name").in_("id", user_ids).execute()
        for p in prof_res.data:
            prof_map[p["id"]] = p.get("full_name") or "User"
            
    logs = []
    for r in result.data:
        capex_info = r.get("capex_master") or {}
        user_id = r.get("user_id")
        user_name = prof_map.get(user_id) if user_id else "System"
        
        logs.append({
            "id": r["id"],
            "tahun": r["tahun"],
            "action_type": r["action_type"],
            "capex_id": r["capex_id"],
            "source_capex_id": r["source_capex_id"],
            "anggaran": r["anggaran"],
            "keterangan": r["keterangan"],
            "created_at": r["created_at"],
            "user_name": user_name,
            "nd_persetujuan": r.get("nd_persetujuan") or "",
            "source_capex_name": r.get("source_capex_name") or "-",
            "source_nilai_awal": r.get("source_nilai_awal") or 0,
            "source_nilai_akhir": r.get("source_nilai_akhir") or 0,
            "target_capex_name": r.get("target_capex_name") or "-",
            "target_nilai_awal": r.get("target_nilai_awal") or 0,
            "target_nilai_akhir": r.get("target_nilai_akhir") or 0,
            "capex_nama": capex_info.get("daftar_capex") or "-",
            "capex_kode": capex_info.get("kode") or "-"
        })
        
    return logs


@router.post("/upload")
def upload_capex_excel(
    tahun: int = Query(...),
    is_carryover: bool = Query(False),
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
        carryover_realizations = []
        main_kategori = "INVESTASI RUTIN"
        current_kategori = "Investasi Rutin"
        
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if not row or not row[1]: # Jika daftar capex kosong, skip
                continue
                
            if is_carryover:
                uraian = str(row[1]).strip()
                
                if uraian.upper() == "URAIAN":
                    continue
                
                pic = str(row[3]).strip() if len(row) > 3 and row[3] else ""
                
                if not pic:
                    upper_uraian = uraian.upper()
                    if "TOTAL" in upper_uraian or "JUMLAH" in upper_uraian:
                        continue
                    if upper_uraian == "INVESTASI RUTIN" or upper_uraian == "INVESTASI PENGEMBANGAN":
                        # This is a Main Kategori
                        main_kategori = uraian
                        continue
                    
                    # This is a sub-category header (e.g. "Tanah & Bangunan")
                    current_kategori = uraian
                    continue
                    
                kode = main_kategori
                daftar_capex = uraian
                kategori = current_kategori
                
                try:
                    anggaran_str = str(row[2]).replace(',', '').replace('.', '') if row[2] else "0"
                    if '.' in anggaran_str:
                        anggaran_str = anggaran_str.split('.')[0]
                    anggaran = int(anggaran_str)
                except ValueError:
                    anggaran = 0
                
                # Parse monthly realizations
                realizations = []
                for i in range(12):
                    col_ba = 4 + (i * 2)
                    col_po = 5 + (i * 2)
                    
                    try:
                        ba_val_str = str(row[col_ba]).replace(',', '').replace('.', '') if len(row) > col_ba and row[col_ba] else "0"
                        if '.' in ba_val_str: ba_val_str = ba_val_str.split('.')[0]
                        ba_val = int(ba_val_str)
                    except ValueError:
                        ba_val = 0
                        
                    try:
                        po_val_str = str(row[col_po]).replace(',', '').replace('.', '') if len(row) > col_po and row[col_po] else "0"
                        if '.' in po_val_str: po_val_str = po_val_str.split('.')[0]
                        po_val = int(po_val_str)
                    except ValueError:
                        po_val = 0
                        
                    realizations.append({
                        "bulan": i + 1,
                        "nilai_bast": ba_val,
                        "nilai_realisasi": po_val
                    })
                    
                carryover_realizations.append(realizations)
                
            else:
                kode = str(row[0]) if row[0] else ""
                daftar_capex = str(row[1])
                kategori = str(row[2]) if row[2] else ""
                
                try:
                    anggaran_str = str(row[3]).replace(',', '').replace('.', '') if row[3] else "0"
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
                "anggaran_perubahan": anggaran,
                "pic": pic,
                "is_carryover": is_carryover
            })
            
        if data_to_insert:
            res = client.table(_TABLE).insert(data_to_insert).execute()
            inserted = len(data_to_insert)
            
            # Insert carryover realizations if present
            if is_carryover and carryover_realizations and res.data:
                real_inserts = []
                for idx, capex_row in enumerate(res.data):
                    if idx < len(carryover_realizations):
                        capex_id = capex_row['id']
                        for r in carryover_realizations[idx]:
                            if r["nilai_bast"] > 0 or r["nilai_realisasi"] > 0:
                                real_inserts.append({
                                    "capex_id": capex_id,
                                    "bulan": r["bulan"],
                                    "nilai_bast": r["nilai_bast"],
                                    "nilai_realisasi": r["nilai_realisasi"],
                                    "tahun": tahun
                                })
                if real_inserts:
                    client.table("capex_realization").insert(real_inserts).execute()
            
        module_name = "Carry Over" if is_carryover else "RKAP Master"
        log_module_update(client, module_name, _admin.get("full_name", "Admin"))
        return {"message": f"Berhasil upload {inserted} data capex untuk tahun {tahun}."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        pass
