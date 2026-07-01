from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client

from .database import get_supabase, get_supabase_admin

_bearer = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    token = credentials.credentials
    client: Client = get_supabase()
    
    try:
        # Validate token and get user via Supabase Auth API
        # This automatically handles key rotations, ECC vs HS256, etc.
        user_res = client.auth.get_user(token)
        if not user_res or not user_res.user:
            raise Exception("User tidak valid")
        user_id = user_res.user.id
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token tidak valid: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin_client = get_supabase_admin()
    result = admin_client.table("profiles").select("id, full_name, role").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Profil pengguna tidak ditemukan.")

    return result.data


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya Admin yang diizinkan.",
        )
    return user
