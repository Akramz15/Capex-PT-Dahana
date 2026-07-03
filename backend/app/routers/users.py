from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID

from ..core.database import get_supabase_admin
from ..core.security import require_admin
from ..models.user_mgmt import UserItem, UserCreate, UserUpdate

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=List[UserItem])
def list_users(_admin: dict = Depends(require_admin)) -> List[UserItem]:
    admin_client = get_supabase_admin()
    
    # Get all profiles
    profiles_res = admin_client.table("profiles").select("*").order("created_at", desc=True).execute()
    profiles = profiles_res.data or []

    # Map auth users to get email
    email_map = {}
    try:
        auth_users = admin_client.auth.admin.list_users()
        # auth_users may be a list of User objects
        if isinstance(auth_users, list):
            for u in auth_users:
                email_map[str(u.id)] = getattr(u, "email", None)
        elif hasattr(auth_users, "users"):
            for u in auth_users.users:
                email_map[str(u.id)] = getattr(u, "email", None)
    except Exception as e:
        print(f"Error fetching auth users: {e}")

    items = []
    for p in profiles:
        p_id = str(p.get("id"))
        items.append(
            UserItem(
                id=p["id"],
                email=email_map.get(p_id, ""),
                full_name=p.get("full_name"),
                role=p.get("role", "user"),
                created_at=p["created_at"],
                updated_at=p["updated_at"],
            )
        )
    return items


@router.post("", response_model=UserItem, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, _admin: dict = Depends(require_admin)) -> UserItem:
    admin_client = get_supabase_admin()

    try:
        user_res = admin_client.auth.admin.create_user({
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {"full_name": payload.full_name}
        })
        user_id = str(user_res.user.id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal membuat pengguna: {str(exc)}"
        ) from exc

    # Update profiles table (in case trigger created it or needs explicit role/name update)
    try:
        admin_client.table("profiles").upsert({
            "id": user_id,
            "full_name": payload.full_name,
            "role": payload.role
        }).execute()
    except Exception as exc:
        print(f"Profile upsert warning: {exc}")

    # Fetch newly created profile
    prof_res = admin_client.table("profiles").select("*").eq("id", user_id).single().execute()
    p = prof_res.data

    return UserItem(
        id=p["id"],
        email=payload.email,
        full_name=p.get("full_name"),
        role=p.get("role", "user"),
        created_at=p["created_at"],
        updated_at=p["updated_at"],
    )


@router.put("/{user_id}", response_model=UserItem)
def update_user(user_id: UUID, payload: UserUpdate, _admin: dict = Depends(require_admin)) -> UserItem:
    admin_client = get_supabase_admin()
    user_id_str = str(user_id)

    # Check user exists in profiles
    prof_check = admin_client.table("profiles").select("*").eq("id", user_id_str).execute()
    if not prof_check.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengguna tidak ditemukan.")

    # Update password if provided
    if payload.password:
        try:
            admin_client.auth.admin.update_user_by_id(user_id_str, {"password": payload.password})
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gagal mengarahkan ulang password: {str(exc)}"
            ) from exc

    # Update profile fields
    update_data = {}
    if payload.full_name is not None:
        update_data["full_name"] = payload.full_name
    if payload.role is not None:
        update_data["role"] = payload.role

    if update_data:
        admin_client.table("profiles").update(update_data).eq("id", user_id_str).execute()

    # Get updated profile
    prof_res = admin_client.table("profiles").select("*").eq("id", user_id_str).single().execute()
    p = prof_res.data

    # Get email
    email = ""
    try:
        u = admin_client.auth.admin.get_user_by_id(user_id_str)
        if hasattr(u, "user") and u.user:
            email = u.user.email
        elif hasattr(u, "email"):
            email = u.email
    except Exception:
        pass

    return UserItem(
        id=p["id"],
        email=email,
        full_name=p.get("full_name"),
        role=p.get("role", "user"),
        created_at=p["created_at"],
        updated_at=p["updated_at"],
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: UUID, current_admin: dict = Depends(require_admin)) -> None:
    user_id_str = str(user_id)
    if user_id_str == str(current_admin["id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anda tidak dapat menghapus akun Anda sendiri."
        )

    admin_client = get_supabase_admin()
    try:
        admin_client.auth.admin.delete_user(user_id_str)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal menghapus pengguna: {str(exc)}"
        ) from exc
