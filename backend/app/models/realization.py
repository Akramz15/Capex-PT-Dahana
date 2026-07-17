from pydantic import BaseModel, Field
from typing import Literal, Optional
from uuid import UUID
from datetime import datetime

StatusType = Literal["PO", "Tender", "Kajian", "BAADK", "Lainnya", "Rencana"]


class RealizationBase(BaseModel):
    capex_id: UUID
    tahun: int = Field(..., ge=2020, le=2099)
    bulan: int = Field(..., ge=1, le=12, description="1=Jan, 12=Des")
    nilai_rkap: int = Field(default=0, ge=0)
    nilai_realisasi: int = Field(default=0, ge=0)
    nilai_bast: int = Field(default=0, ge=0)
    status: Optional[str] = None
    keterangan: Optional[str] = None
    pic: Optional[str] = Field(None, max_length=150)


class RealizationCreate(RealizationBase):
    pass


class RealizationUpdate(BaseModel):
    nilai_rkap: Optional[int] = Field(None, ge=0)
    nilai_realisasi: Optional[int] = Field(None, ge=0)
    nilai_bast: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    keterangan: Optional[str] = None
    pic: Optional[str] = Field(None, max_length=150)


class RealizationResponse(RealizationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StatusLogBase(BaseModel):
    capex_id: UUID
    tahun: int = Field(..., ge=2020, le=2099)
    status_type: Optional[str] = None
    anggaran_rkap: Optional[int] = Field(default=0, ge=0)
    anggaran_perubahan: Optional[int] = Field(default=0, ge=0)
    total_realisasi: Optional[int] = Field(default=0, ge=0)
    keterangan: Optional[str] = None
    rekap_nilai: Optional[int] = Field(default=0, ge=0)
    keterangan_rekap: Optional[str] = None


class StatusLogCreate(StatusLogBase):
    pass


class StatusLogUpdate(BaseModel):
    anggaran_rkap: Optional[int] = Field(None, ge=0)
    anggaran_perubahan: Optional[int] = Field(None, ge=0)
    total_realisasi: Optional[int] = Field(None, ge=0)
    keterangan: Optional[str] = None
    rekap_nilai: Optional[int] = Field(None, ge=0)
    keterangan_rekap: Optional[str] = None


class StatusLogResponse(StatusLogBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
