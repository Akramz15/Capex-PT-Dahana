from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class RealizationBulkItem(BaseModel):
    bulan: int = Field(..., ge=1, le=12)
    nilai_rkap: int = 0
    nilai_realisasi: int = 0

class RealizationBulkRequest(BaseModel):
    capex_id: UUID
    tahun: int = Field(..., ge=2020, le=2099)
    status: Optional[str] = None
    keterangan: Optional[str] = None
    pic: Optional[str] = None
    items: list[RealizationBulkItem]
