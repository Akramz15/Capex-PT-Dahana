# Sistem Monitoring Investasi (Capex) — PT Dahana

## Stack
- **Frontend**: React.js (Vite) — `frontend/`
- **Backend**: Python FastAPI — `backend/`
- **Database**: Supabase (PostgreSQL + Auth + RLS) — `supabase/`

---

## Cara Menjalankan Backend

### 1. Setup environment
```bash
cd backend
cp .env.example .env
# Edit .env dengan kredensial Supabase Anda
```

### 2. Buat virtual environment & install dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Jalankan server development
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API akan tersedia di: `http://localhost:8000`  
Swagger Docs: `http://localhost:8000/docs`

---

## Setup Database (Supabase)

Jalankan migrasi secara berurutan di Supabase SQL Editor:

```sql
-- 1. Schema
\i supabase/migrations/001_schema.sql

-- 2. RLS Policies
\i supabase/migrations/002_rls_policies.sql

-- 3. Seed Data (opsional untuk testing)
\i supabase/migrations/003_seed.sql
```

### Setup Admin User
1. Buat user baru via Supabase Dashboard → **Authentication → Users → Add user**
2. Update role menjadi admin:
```sql
UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
```

---

## Endpoint API

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | Public | Health check |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Any | Logout |
| GET | `/api/dashboard/summary` | Auth | Summary cards |
| GET | `/api/dashboard/monthly-chart` | Auth | Data grafik bulanan |
| GET | `/api/dashboard/progress-table` | Auth | Tabel progress Capex |
| GET | `/api/capex` | Auth | List Capex |
| POST | `/api/capex` | **Admin** | Tambah Capex |
| PUT | `/api/capex/{id}` | **Admin** | Edit Capex |
| DELETE | `/api/capex/{id}` | **Admin** | Hapus Capex |
| GET | `/api/realization` | Auth | List realisasi |
| POST | `/api/realization` | **Admin** | Tambah realisasi |
| GET | `/api/status` | Auth | List status log |
| POST | `/api/status` | **Admin** | Tambah status log |
| GET | `/api/timeline` | Auth | List timeline |
| POST | `/api/timeline` | **Admin** | Tambah timeline |
| GET | `/api/lku` | Auth | List LKU |
| POST | `/api/lku` | **Admin** | Tambah LKU |
| GET | `/api/assets` | Auth | List aset |
| POST | `/api/assets` | **Admin** | Tambah aset |
| POST | `/api/export-capex?tahun=2026` | **Admin** | Export Excel |

---

## Struktur Proyek
```
Project_Monitoring/
├── Template Monitoring Capex-R2.xlsx   ← Master template Excel
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_seed.sql
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── core/       ← config, database, security
│       ├── models/     ← Pydantic schemas
│       ├── routers/    ← FastAPI routes
│       └── services/   ← Business logic
└── frontend/           ← (Module 4 — React.js)
```
