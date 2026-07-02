from backend.app.services.export_engine import generate_export
from backend.app.core.database import get_supabase_admin
try:
    generate_export(2026)
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
