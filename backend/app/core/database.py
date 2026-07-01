from supabase import create_client, Client
from functools import lru_cache
from .config import get_settings


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache
def get_supabase_admin() -> Client:
    """Service-role client: bypasses RLS. Use only for server-side admin operations."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
