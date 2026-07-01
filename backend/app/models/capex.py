from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class CapexMasterBase(BaseModel):
    tahun: int = Field(..., ge=2020, le=2099, description="Tahun anggaran")
    kode: Optional[str] = Field(None, max_length=50)
    daftar_capex: str = Field(..., min_length=1, max_length=500)
    kategori: Optional[str] = Field(None, max_length=50)
    anggaran_rkap: int = Field(default=0, ge=0)
    anggaran_perubahan: int = Field(default=0, ge=0)
    pic: Optional[str] = Field(None, max_length=150)


class CapexMasterCreate(CapexMasterBase):
    pass


class CapexMasterUpdate(BaseModel):
    kode: Optional[str] = Field(None, max_length=50)
    daftar_capex: Optional[str] = Field(None, min_length=1, max_length=500)
    kategori: Optional[str] = Field(None, max_length=50)
    anggaran_rkap: Optional[int] = Field(None, ge=0)
    anggaran_perubahan: Optional[int] = Field(None, ge=0)
    pic: Optional[str] = Field(None, max_length=150)


class CapexMasterResponse(CapexMasterBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
