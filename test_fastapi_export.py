from fastapi.testclient import TestClient
from backend.main import app
from backend.app.routers.export import router
from unittest.mock import patch

# We will override the require_admin dependency
from backend.app.core.security import require_admin

app.dependency_overrides[require_admin] = lambda: {"role": "admin"}

client = TestClient(app)
with patch("backend.app.core.database.get_supabase"), patch("backend.app.core.database.get_supabase_admin"):
    res = client.get("/api/export-capex?tahun=2026")
    print("STATUS:", res.status_code)
    if res.status_code != 200:
        print("ERROR:", res.text)
    else:
        print("SUCCESS! Bytes received:", len(res.content))
