import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


@pytest.fixture
def mock_settings():
    with patch("app.core.config.get_settings") as mock:
        mock.return_value = MagicMock(
            supabase_url="https://test.supabase.co",
            supabase_anon_key="test-anon",
            supabase_service_role_key="test-service",
            supabase_jwt_secret="test-secret",
            app_env="development",
            cors_origins=["http://localhost:5173"],
            excel_template_path="../Template Monitoring Capex-R2.xlsx",
        )
        yield mock


def test_health_check(mock_settings):
    with patch("app.core.database.get_supabase"), patch("app.core.database.get_supabase_admin"):
        from main import app
        client = TestClient(app)
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_capex_list_requires_auth(mock_settings):
    with patch("app.core.database.get_supabase"), patch("app.core.database.get_supabase_admin"):
        from main import app
        client = TestClient(app)
        response = client.get("/api/capex")
        assert response.status_code == 403


def test_export_requires_admin(mock_settings):
    with patch("app.core.database.get_supabase"), patch("app.core.database.get_supabase_admin"):
        from main import app
        client = TestClient(app)
        response = client.post("/api/export-capex?tahun=2026")
        assert response.status_code == 403
