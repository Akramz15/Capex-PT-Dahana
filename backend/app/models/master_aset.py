from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# --- ASET NOMOR ---
class AsetNomorBase(BaseModel):
    nomor_aset: Optional[str] = None
    sub_nomor: Optional[str] = None
    kategori: Optional[str] = None
    nama_aset: Optional[str] = None
    satuan: Optional[str] = None
    lokasi: Optional[str] = None
    nilai: Optional[float] = 0
    room: Optional[str] = None
    tahun: Optional[int] = None
    bulan: Optional[int] = None
    user_name: Optional[str] = None
    vendor: Optional[str] = None
    keterangan: Optional[str] = None

class AsetNomorCreate(AsetNomorBase):
    pass

class AsetNomorUpdate(AsetNomorBase):
    pass

class AsetNomorResponse(AsetNomorBase):
    id: str
    created_at: datetime
    updated_at: datetime

# --- ASET LAPORAN AKTIVA ---
class AsetLaporanBase(BaseModel):
    deskripsi: Optional[str] = None
    asset_number: Optional[str] = None
    sub_number: Optional[str] = None
    capitalized_on: Optional[datetime] = None
    asset_description: Optional[str] = None
    acquis_val: Optional[float] = 0
    accum_dep: Optional[float] = 0
    book_val: Optional[float] = 0
    currency: Optional[str] = None
    useful_life: Optional[str] = None
    location_code: Optional[str] = None
    lokasi: Optional[str] = None
    room: Optional[str] = None

class AsetLaporanCreate(AsetLaporanBase):
    pass

class AsetLaporanUpdate(AsetLaporanBase):
    pass

class AsetLaporanResponse(AsetLaporanBase):
    id: str
    created_at: datetime
    updated_at: datetime

# --- ASET DATA ---
class AsetDataBase(BaseModel):
    asset_number: Optional[str] = None
    sub_number: Optional[str] = None
    capitalized_on: Optional[datetime] = None
    asset_description: Optional[str] = None
    acquis_val: Optional[float] = 0
    accum_dep: Optional[float] = 0
    book_val: Optional[float] = 0
    currency: Optional[str] = None
    useful_life: Optional[str] = None
    location_code: Optional[str] = None
    room: Optional[str] = None

class AsetDataCreate(AsetDataBase):
    pass

class AsetDataUpdate(AsetDataBase):
    pass

class AsetDataResponse(AsetDataBase):
    id: str
    created_at: datetime
    updated_at: datetime
