from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class TimelineBulkItem(BaseModel):
    bulan: int = Field(..., ge=1, le=12)
    minggu: int = Field(..., ge=1, le=5)
    kode_status: Optional[str] = Field(None, max_length=1)
    keterangan: Optional[str] = None

class TimelineBulkRequest(BaseModel):
    capex_id: UUID
    tahun: int = Field(..., ge=2020, le=2099)
    items: list[TimelineBulkItem]
