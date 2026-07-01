from ..core.database import get_supabase_admin

BULAN_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def get_dashboard_summary(tahun: int) -> dict:
    client = get_supabase_admin()

    master_result = client.table("capex_master").select("id, anggaran_rkap, anggaran_perubahan").eq("tahun", tahun).execute()
    total_rkap = sum(r["anggaran_rkap"] for r in master_result.data)
    total_perubahan = sum(r["anggaran_perubahan"] for r in master_result.data)
    total_capex_items = len(master_result.data)

    status_result = client.table("capex_status_log").select("status_type, rekap_nilai").eq("tahun", tahun).execute()
    
    total_realisasi = 0
    status_amounts: dict[str, int] = {}
    
    for r in status_result.data:
        st = r["status_type"]
        if st == "Lainnya": 
            continue
            
        val = r.get("rekap_nilai") or 0
        status_amounts[st] = status_amounts.get(st, 0) + val
        total_realisasi += val

    persen_realisasi = round((total_realisasi / total_rkap * 100), 2) if total_rkap > 0 else 0

    return {
        "total_capex_items": total_capex_items,
        "total_anggaran_rkap": total_rkap,
        "total_anggaran_perubahan": total_perubahan,
        "total_realisasi": total_realisasi,
        "persen_realisasi": persen_realisasi,
        "sisa_anggaran": total_rkap - total_realisasi,
        "status_distribution": status_amounts,
    }


def get_monthly_chart_data(tahun: int) -> list[dict]:
    client = get_supabase_admin()
    result = client.table("capex_realization").select("bulan, nilai_rkap, nilai_realisasi").eq("tahun", tahun).execute()

    monthly: dict[int, dict] = {
        m: {"bulan": BULAN_NAMES[m - 1], "rkap": 0, "realisasi": 0}
        for m in range(1, 13)
    }
    for r in result.data:
        b = r["bulan"]
        monthly[b]["rkap"] += r["nilai_rkap"]
        monthly[b]["realisasi"] += r["nilai_realisasi"]

    return list(monthly.values())


def get_capex_progress_table(tahun: int) -> list[dict]:
    client = get_supabase_admin()

    master = client.table("capex_master").select("id, kode, daftar_capex, kategori, anggaran_rkap, pic").eq("tahun", tahun).execute()
    real = client.table("capex_realization").select("capex_id, nilai_realisasi, status").eq("tahun", tahun).execute()

    real_by_capex: dict[str, dict] = {}
    for r in real.data:
        cid = r["capex_id"]
        if cid not in real_by_capex:
            real_by_capex[cid] = {"total_realisasi": 0, "statuses": set()}
        real_by_capex[cid]["total_realisasi"] += r["nilai_realisasi"]
        if r.get("status"):
            real_by_capex[cid]["statuses"].add(r["status"])

    rows = []
    for m in master.data:
        cid = str(m["id"])
        realisasi = real_by_capex.get(cid, {}).get("total_realisasi", 0)
        statuses = list(real_by_capex.get(cid, {}).get("statuses", set()))
        anggaran = m["anggaran_rkap"]
        persen = round(realisasi / anggaran * 100, 2) if anggaran > 0 else 0
        rows.append({
            **m,
            "total_realisasi": realisasi,
            "persen_realisasi": persen,
            "statuses": statuses,
        })

    return rows
