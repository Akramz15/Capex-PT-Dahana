from pydantic import BaseModel, Field
from typing import Literal, Optional
from uuid import UUID
from datetime import datetime


class UserItem(BaseModel):
    id: UUID
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Literal["admin", "user"]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: str = Field(..., min_length=5, description="Alamat email pengguna")
    password: str = Field(..., min_length=6, description="Minimal 6 karakter")
    full_name: str = Field(..., min_length=1, max_length=150)
    role: Literal["admin", "user"] = "user"


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=150)
    role: Optional[Literal["admin", "user"]] = None
    password: Optional[str] = Field(None, min_length=6)
