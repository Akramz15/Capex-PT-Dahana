from pydantic import BaseModel, Field
from typing import Literal, Optional
from uuid import UUID
from datetime import datetime


class UserProfile(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    role: Literal["admin", "user"]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class TimelineBase(BaseModel):
    capex_id: UUID
    tahun: int = Field(..., ge=2020, le=2099)
    bulan: int = Field(..., ge=1, le=12)
    minggu: Optional[int] = Field(None, ge=1, le=5)
    kode_status: Optional[str] = Field(None, max_length=1)
    keterangan: Optional[str] = None


class TimelineCreate(TimelineBase):
    pass


class TimelineUpdate(BaseModel):
    kode_status: Optional[str] = Field(None, max_length=1)
    keterangan: Optional[str] = None


class TimelineResponse(TimelineBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
