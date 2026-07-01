import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("backend/.env")
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
client = create_client(url, key)

master = client.table("capex_master").select("id, daftar_capex").eq("kategori", "Blasting Equipment").execute()
for m in master.data:
    real = client.table("capex_realization").select("bulan, nilai_realisasi, status").eq("capex_id", m["id"]).execute()
    total_real = sum(r["nilai_realisasi"] for r in real.data)
    statuses = [r["status"] for r in real.data if r["status"] is not None]
    if total_real > 0:
        print(f"{m['daftar_capex']}: total={total_real}, statuses={statuses}")

