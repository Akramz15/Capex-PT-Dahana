from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime


class AssetBase(BaseModel):
    no_po: Optional[str] = Field(None, max_length=50)
    tanggal_po: Optional[date] = None
    no_asset: Optional[str] = Field(None, max_length=50)
    sub_number: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = Field(None, max_length=100)
    capitalized_on: Optional[date] = None
    asset_description: Optional[str] = None
    acquis_val: int = Field(default=0)
    accum_dep: int = Field(default=0)
    book_val: int = Field(default=0)
    currency: str = Field(default="IDR", max_length=3)
    location_code: Optional[str] = Field(None, max_length=20)
    lokasi: Optional[str] = Field(None, max_length=150)
    room: Optional[str] = Field(None, max_length=100)
    keterangan: Optional[str] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    no_po: Optional[str] = Field(None, max_length=50)
    tanggal_po: Optional[date] = None
    no_asset: Optional[str] = Field(None, max_length=50)
    category: Optional[str] = Field(None, max_length=100)
    capitalized_on: Optional[date] = None
    asset_description: Optional[str] = None
    acquis_val: Optional[int] = None
    accum_dep: Optional[int] = None
    book_val: Optional[int] = None
    lokasi: Optional[str] = Field(None, max_length=150)
    room: Optional[str] = Field(None, max_length=100)
    keterangan: Optional[str] = None


class AssetResponse(AssetBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LKUBase(BaseModel):
    capex_id: Optional[UUID] = None
    tahun: int = Field(..., ge=2020, le=2099)
    kategori_investasi: Optional[str] = Field(None, max_length=50)
    departemen: Optional[str] = Field(None, max_length=150)
    rkap_nilai: int = Field(default=0, ge=0)
    rkap_target: int = Field(default=0, ge=0)
    rencana_twi: int = Field(default=0, ge=0)
    realisasi_po: int = Field(default=0, ge=0)
    realisasi_bast: int = Field(default=0, ge=0)
    rencana_per_bulan: dict = Field(default_factory=dict)


class LKUCreate(LKUBase):
    pass


class LKUUpdate(BaseModel):
    rkap_nilai: Optional[int] = Field(None, ge=0)
    rkap_target: Optional[int] = Field(None, ge=0)
    rencana_twi: Optional[int] = Field(None, ge=0)
    realisasi_po: Optional[int] = Field(None, ge=0)
    realisasi_bast: Optional[int] = Field(None, ge=0)
    rencana_per_bulan: Optional[dict] = None


class LKUResponse(LKUBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
