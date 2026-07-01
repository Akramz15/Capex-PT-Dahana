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
                    "p_source_capex_id": str(payload.source_capex_id)
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
async def update_capex(
    capex_id: UUID,
    payload: CapexMasterUpdate,
    _admin: dict = Depends(require_admin),
):
    client = get_supabase_admin()

    # 1. Cek apakah ada perubahan pada anggaran_rkap
    if payload.anggaran_rkap is not None:
        # Cek tahun capex ini
        existing = client.table(_TABLE).select("tahun").eq("id", str(capex_id)).single().execute()
        if existing.data:
            tahun = existing.data["tahun"]
            lock_res = client.table("rkap_locks").select("is_locked").eq("tahun", tahun).execute()
            if lock_res.data and lock_res.data[0]["is_locked"]:
                raise HTTPException(
                    status_code=400, 
                    detail="Tahun RKAP ini sudah dikunci! Anda tidak bisa mengubah Anggaran RKAP awal. Silakan Buka Kunci (Unlock) terlebih dahulu jika memang ada salah ketik."
                )

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
