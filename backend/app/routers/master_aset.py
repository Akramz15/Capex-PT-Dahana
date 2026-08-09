from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import openpyxl
import pandas as pd
from io import BytesIO
from fastapi.responses import Response

from ..core.database import get_supabase_admin
from ..core.security import get_current_user, require_admin
from ..models.master_aset import (
    AsetNomorCreate, AsetNomorUpdate, AsetNomorResponse,
    AsetLaporanCreate, AsetLaporanUpdate, AsetLaporanResponse,
    AsetDataCreate, AsetDataUpdate, AsetDataResponse
)
from ..services.audit import log_module_update

router = APIRouter(prefix="/master-aset", tags=["Master Aset"])

# -------------------------
# ASET NOMOR
# -------------------------
@router.get("/nomor", response_model=list[AsetNomorResponse])
def get_aset_nomor(_user: dict = Depends(get_current_user)):
    client = get_supabase_admin()
    result = client.table("aset_nomor").select("*").order("created_at", desc=False).execute()
    return result.data

@router.post("/nomor", response_model=AsetNomorResponse)
def create_aset_nomor(payload: AsetNomorCreate, _admin: dict = Depends(require_admin)):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_none=True)
    result = client.table("aset_nomor").insert(data).execute()
    log_module_update(client, "Permintaan Nomor Aset", _admin.get("full_name", "Admin"))
    return result.data[0]

@router.put("/nomor/{id}", response_model=AsetNomorResponse)
def update_aset_nomor(id: UUID, payload: AsetNomorUpdate, _admin: dict = Depends(require_admin)):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_none=True)
    result = client.table("aset_nomor").update(data).eq("id", str(id)).execute()
    if not result.data: raise HTTPException(status_code=404, detail="Not found")
    log_module_update(client, "Permintaan Nomor Aset", _admin.get("full_name", "Admin"))
    return result.data[0]

@router.delete("/nomor/{id}")
def delete_aset_nomor(id: UUID, _admin: dict = Depends(require_admin)):
    client = get_supabase_admin()
    result = client.table("aset_nomor").delete().eq("id", str(id)).execute()
    if not result.data: raise HTTPException(status_code=404, detail="Not found")
    log_module_update(client, "Permintaan Nomor Aset", _admin.get("full_name", "Admin"))
    return {"message": "Deleted"}

# -------------------------
# ASET LAPORAN AKTIVA
# -------------------------
@router.get("/laporan", response_model=list[AsetLaporanResponse])
def get_aset_laporan(_user: dict = Depends(get_current_user)):
    client = get_supabase_admin()
    result = client.table("aset_laporan_aktiva").select("*").order("created_at", desc=False).execute()
    return result.data

@router.post("/laporan", response_model=AsetLaporanResponse)
def create_aset_laporan(payload: AsetLaporanCreate, _admin: dict = Depends(require_admin)):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_none=True)
    if data.get("capitalized_on"): data["capitalized_on"] = str(data["capitalized_on"])
    result = client.table("aset_laporan_aktiva").insert(data).execute()
    log_module_update(client, "Laporan Aktiva Tetap", _admin.get("full_name", "Admin"))
    return result.data[0]

@router.put("/laporan/{id}", response_model=AsetLaporanResponse)
def update_aset_laporan(id: UUID, payload: AsetLaporanUpdate, _admin: dict = Depends(require_admin)):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_none=True)
    if data.get("capitalized_on"): data["capitalized_on"] = str(data["capitalized_on"])
    result = client.table("aset_laporan_aktiva").update(data).eq("id", str(id)).execute()
    if not result.data: raise HTTPException(status_code=404, detail="Not found")
    log_module_update(client, "Laporan Aktiva Tetap", _admin.get("full_name", "Admin"))
    return result.data[0]

@router.delete("/laporan/{id}")
def delete_aset_laporan(id: UUID, _admin: dict = Depends(require_admin)):
    client = get_supabase_admin()
    result = client.table("aset_laporan_aktiva").delete().eq("id", str(id)).execute()
    if not result.data: raise HTTPException(status_code=404, detail="Not found")
    log_module_update(client, "Laporan Aktiva Tetap", _admin.get("full_name", "Admin"))
    return {"message": "Deleted"}

# -------------------------
# ASET DATA
# -------------------------
@router.get("/data", response_model=list[AsetDataResponse])
def get_aset_data(_user: dict = Depends(get_current_user)):
    client = get_supabase_admin()
    result = client.table("aset_data").select("*").order("created_at", desc=False).execute()
    return result.data

@router.post("/data", response_model=AsetDataResponse)
def create_aset_data(payload: AsetDataCreate, _admin: dict = Depends(require_admin)):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_none=True)
    if data.get("capitalized_on"): data["capitalized_on"] = str(data["capitalized_on"])
    result = client.table("aset_data").insert(data).execute()
    log_module_update(client, "Data Aset", _admin.get("full_name", "Admin"))
    return result.data[0]

@router.put("/data/{id}", response_model=AsetDataResponse)
def update_aset_data(id: UUID, payload: AsetDataUpdate, _admin: dict = Depends(require_admin)):
    client = get_supabase_admin()
    data = payload.model_dump(exclude_none=True)
    if data.get("capitalized_on"): data["capitalized_on"] = str(data["capitalized_on"])
    result = client.table("aset_data").update(data).eq("id", str(id)).execute()
    if not result.data: raise HTTPException(status_code=404, detail="Not found")
    log_module_update(client, "Data Aset", _admin.get("full_name", "Admin"))
    return result.data[0]

@router.delete("/data/{id}")
def delete_aset_data(id: UUID, _admin: dict = Depends(require_admin)):
    client = get_supabase_admin()
    result = client.table("aset_data").delete().eq("id", str(id)).execute()
    if not result.data: raise HTTPException(status_code=404, detail="Not found")
    log_module_update(client, "Data Aset", _admin.get("full_name", "Admin"))
    return {"message": "Deleted"}

# -------------------------
# UPLOAD & EXPORT EXCEL
# -------------------------
@router.post("/nomor/upload", status_code=status.HTTP_200_OK)
def upload_aset_nomor(file: UploadFile = File(...), _admin: dict = Depends(require_admin)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Harus berupa file Excel (.xlsx / .xls)")
    try:
        content = file.file.read()
        excel_file = pd.ExcelFile(BytesIO(content))
        sheet_name = 'Sheet1' if 'Sheet1' in excel_file.sheet_names else excel_file.sheet_names[0]
        
        # Dynamically find the header row by searching for 'Nomor Aset' or 'Nama Aset'
        df_temp = pd.read_excel(excel_file, sheet_name=sheet_name, header=None, nrows=20)
        header_row = 0
        for i, row in df_temp.iterrows():
            if any(str(x).strip().lower() == 'nomor aset' or str(x).strip().lower() == 'nama aset' for x in row.values):
                header_row = i
                break
                
        df = pd.read_excel(excel_file, sheet_name=sheet_name, header=header_row)
        df.columns = [str(c).strip() for c in df.columns]

        # Map DataFrame columns to DB columns based on expected types
        # This mapping covers the specific Excel file provided by the user
        insert_data = []
        for _, row in df.iterrows():
            def get_val(col_names):
                for name in col_names:
                    if name in df.columns:
                        val = row[name]
                        return val if pd.notna(val) else None
                return None

            nama = get_val(["Nama Aset", "nama_aset", "Deskripsi"])
            nomor = get_val(["Nomor Aset", "nomor_aset"])
            kat = get_val(["Kategori", "kategori"])
            
            # Abaikan baris yang pada dasarnya kosong
            if not nama and not nomor and not kat:
                continue
                
            def clean_str(val):
                if pd.isna(val) or val is None: return None
                s = str(val).strip()
                if s.endswith('.0'):
                    s = s[:-2]
                return s if s != "nan" else None

            item = {
                "nomor_aset": clean_str(nomor),
                "sub_nomor": clean_str(get_val(["Sub Nomor", "sub_nomor", "Sub#"])),
                "nama_aset": clean_str(nama) if clean_str(nama) else "Aset Baru",
                "kategori": clean_str(kat),
                "satuan": clean_str(get_val(["Satuan", "satuan", "Sat"])),
                "lokasi": clean_str(get_val(["Lokasi", "lokasi"])),
                "room": clean_str(get_val(["Room", "room"])),
                "tahun": int(get_val(["Tahun", "tahun"])) if get_val(["Tahun", "tahun"]) else 2026,
                "bulan": int(get_val(["Bulan", "bulan"])) if get_val(["Bulan", "bulan"]) else 1,
                "user_name": str(get_val(["User Name", "user_name", "User"])) if get_val(["User Name", "user_name", "User"]) else None,
                "vendor": str(get_val(["Vendor", "vendor"])) if get_val(["Vendor", "vendor"]) else None,
                "nilai": float(get_val(["Nilai", "nilai"])) if get_val(["Nilai", "nilai"]) else 0.0,
                "keterangan": str(get_val(["Keterangan", "keterangan"])) if get_val(["Keterangan", "keterangan"]) else None,
            }
            insert_data.append(item)

        if not insert_data:
            raise HTTPException(status_code=400, detail="Tidak ada data ditemukan")

        client = get_supabase_admin()
        client.table("aset_nomor").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        chunk_size = 100
        for i in range(0, len(insert_data), chunk_size):
            client.table("aset_nomor").insert(insert_data[i:i + chunk_size]).execute()
            
        log_module_update(client, "Nomor Aset", _admin.get("full_name", "Admin"))
        return {"message": f"Berhasil upload {len(insert_data)} data nomor aset.", "count": len(insert_data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nomor/export")
def export_aset_nomor(_user: dict = Depends(get_current_user)):
    client = get_supabase_admin()
    res = client.table("aset_nomor").select("*").execute()
    df = pd.DataFrame(res.data)
    if "id" in df.columns: df.drop(columns=["id", "created_at", "updated_at"], inplace=True)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Permintaan Nomor Aset')
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="Permintaan_Nomor_Aset.xlsx"'
    }
    return Response(content=output.read(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)

@router.post("/laporan/upload", status_code=status.HTTP_200_OK)
def upload_aset_laporan(file: UploadFile = File(...), _admin: dict = Depends(require_admin)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Harus berupa file Excel (.xlsx / .xls)")
    try:
        content = file.file.read()
        excel_file = pd.ExcelFile(BytesIO(content))
        sheet_name = 'Sheet1' if 'Sheet1' in excel_file.sheet_names else excel_file.sheet_names[0]
        
        # Dynamically find the header row by searching for 'Asset Number' or 'Asset Description'
        df_temp = pd.read_excel(excel_file, sheet_name=sheet_name, header=None, nrows=20)
        header_row = 0
        for i, row in df_temp.iterrows():
            if any(str(x).strip().lower() == 'asset number' or str(x).strip().lower() == 'asset description' for x in row.values):
                header_row = i
                break
                
        df = pd.read_excel(excel_file, sheet_name=sheet_name, header=header_row)
        df.columns = [str(c).strip() for c in df.columns]

        insert_data = []
        for _, row in df.iterrows():
            def get_val(col_names):
                for name in col_names:
                    if name in df.columns:
                        val = row[name]
                        return val if pd.notna(val) else None
                return None

            def get_date(val):
                if pd.isna(val): return None
                if hasattr(val, "date"): return str(val.date())
                return str(val).split()[0]

            item = {
                "deskripsi": str(get_val(["Deskripsi", "deskripsi"])) if get_val(["Deskripsi", "deskripsi"]) else None,
                "asset_number": str(get_val(["Asset Number", "asset_number"])) if get_val(["Asset Number", "asset_number"]) else None,
                "sub_number": str(get_val(["Sub Number", "sub_number"])) if get_val(["Sub Number", "sub_number"]) else None,
                "capitalized_on": get_date(get_val(["Capitalized On", "capitalized_on"])),
                "asset_description": str(get_val(["Asset Description", "asset_description"])) if get_val(["Asset Description", "asset_description"]) else None,
                "acquis_val": float(get_val(["Acquis.val.", "acquis_val"])) if get_val(["Acquis.val.", "acquis_val"]) else 0,
                "accum_dep": float(get_val(["Accum.dep.", "accum_dep"])) if get_val(["Accum.dep.", "accum_dep"]) else 0,
                "book_val": float(get_val(["Book val.", "book_val"])) if get_val(["Book val.", "book_val"]) else 0,
                "currency": str(get_val(["Currency", "currency"])) if get_val(["Currency", "currency"]) else "IDR",
                "useful_life": str(get_val(["Useful Life", "useful_life"])) if get_val(["Useful Life", "useful_life"]) else None,
                "location_code": str(get_val(["Location Code", "location_code"])) if get_val(["Location Code", "location_code"]) else None,
                "lokasi": str(get_val(["Lokasi", "lokasi"])) if get_val(["Lokasi", "lokasi"]) else None,
                "room": str(get_val(["Room", "room"])) if get_val(["Room", "room"]) else None,
            }
            if item["asset_number"] or item["asset_description"]:
                insert_data.append(item)

        if not insert_data:
            raise HTTPException(status_code=400, detail="Tidak ada data ditemukan")

        client = get_supabase_admin()
        client.table("aset_laporan_aktiva").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        chunk_size = 100
        for i in range(0, len(insert_data), chunk_size):
            client.table("aset_laporan_aktiva").insert(insert_data[i:i + chunk_size]).execute()
            
        log_module_update(client, "Laporan Aktiva Tetap", _admin.get("full_name", "Admin"))
        return {"message": f"Berhasil upload {len(insert_data)} data laporan aktiva.", "count": len(insert_data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/laporan/export")
def export_aset_laporan(_user: dict = Depends(get_current_user)):
    client = get_supabase_admin()
    res = client.table("aset_laporan_aktiva").select("*").execute()
    df = pd.DataFrame(res.data)
    if "id" in df.columns: df.drop(columns=["id", "created_at", "updated_at"], inplace=True)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Laporan Aktiva Tetap')
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="Laporan_Aktiva_Tetap.xlsx"'
    }
    return Response(content=output.read(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)

# -------------------------
# DASHBOARD ENDPOINT
# -------------------------
@router.get("/dashboard")
def get_dashboard_metrics(tahun: int = Query(2026), _user: dict = Depends(get_current_user)):
    client = get_supabase_admin()
    # Dashboard uses Laporan Aktiva for Aktiva Tetap 2015-2025 and Lokasi Aset
    res_laporan = client.table("aset_laporan_aktiva").select("*").execute()
    # Dashboard uses Aset Nomor for KPI cards and composition
    res_nomor = client.table("aset_nomor").select("*").eq("tahun", tahun).execute()
    
    return {
        "laporan": res_laporan.data,
        "nomor": res_nomor.data
    }
