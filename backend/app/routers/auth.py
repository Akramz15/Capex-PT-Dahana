from fastapi import APIRouter, HTTPException, status

from ..core.database import get_supabase, get_supabase_admin
from ..models.user import LoginRequest, LoginResponse, UserProfile

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    client = get_supabase()
    try:
        response = client.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah.",
        ) from exc

    if not response.session or not response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login gagal.",
        )

    admin = get_supabase_admin()
    profile_result = (
        admin.table("profiles")
        .select("*")
        .eq("id", str(response.user.id))
        .single()
        .execute()
    )

    if not profile_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil pengguna tidak ditemukan.",
        )

    profile = UserProfile.model_validate(profile_result.data)
    return LoginResponse(access_token=response.session.access_token, user=profile)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> None:
    client = get_supabase()
    client.auth.sign_out()
