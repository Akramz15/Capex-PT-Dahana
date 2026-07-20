from datetime import datetime, timezone
from supabase import Client

def log_module_update(client: Client, module_name: str, user_name: str):
    """
    Mencatat waktu update terakhir untuk suatu modul dan oleh siapa.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        client.table("app_module_updates").upsert({
            "module_name": module_name,
            "updated_at": now_iso,
            "updated_by": user_name
        }).execute()
    except Exception as e:
        # Ignore errors for logging so it doesn't break main flow
        print(f"Failed to log module update for {module_name}: {e}")
