from ..core.database import get_supabase_admin

BULAN_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def get_dashboard_summary(tahun: int, is_carryover: bool = False) -> dict:
    client = get_supabase_admin()

    master_result = client.table("capex_master").select("id, daftar_capex, kategori, anggaran_rkap, anggaran_perubahan").eq("tahun", tahun).eq("is_carryover", is_carryover).execute()
    total_rkap = sum(r["anggaran_rkap"] for r in master_result.data)
    total_perubahan = sum(r["anggaran_perubahan"] for r in master_result.data)
    total_capex_items = len(master_result.data)

    realization_data = []
    offset = 0
    limit = 1000
    while True:
        res = client.table("capex_realization").select("capex_id, nilai_realisasi, status, bulan").eq("tahun", tahun).range(offset, offset + limit - 1).execute()
        realization_data.extend(res.data)
        if len(res.data) < limit:
            break
        offset += limit
    
    total_realisasi = sum((r.get("nilai_realisasi") or 0) for r in realization_data)
    
    latest_status_map = {}
    real_by_capex = {}
    for r in realization_data:
        cid = r["capex_id"]
        
        # Accumulate actual realization per project
        real_by_capex[cid] = real_by_capex.get(cid, 0) + (r.get("nilai_realisasi") or 0)
        
        st = r.get("status")
        mth = r.get("bulan") or 0
        if st is not None and st != "":
            if cid not in latest_status_map or mth > latest_status_map[cid]["bulan"]:
                latest_status_map[cid] = {"status": st, "bulan": mth}
                
    budget_map = {}
    for r in master_result.data:
        b = r.get("anggaran_perubahan")
        budget_map[str(r["id"])] = b if b else (r.get("anggaran_rkap") or 0)
        
    status_amounts: dict[str, int] = {}
    for cid, s_info in latest_status_map.items():
        st = s_info["status"]
        if st == "Lainnya":
            continue
        
        # In case status is 'BA/ADK', normalize to match frontend logic or just use whatever is stored
        if st == 'BA/ADK':
            st = 'BAADK'
            
        # Use actual realization instead of budget
        val = real_by_capex.get(cid, 0)
        status_amounts[st] = status_amounts.get(st, 0) + val

    # Category Distribution & Top 5 Capex
    category_amounts = {}
    top_capex_list = []
    
    for r in master_result.data:
        kat = r.get("kategori") or "Lainnya"
        budget = r.get("anggaran_perubahan") if r.get("anggaran_perubahan") else r.get("anggaran_rkap")
        budget = budget or 0
        category_amounts[kat] = category_amounts.get(kat, 0) + budget
        top_capex_list.append({"nama": r.get("daftar_capex") or "Unknown", "anggaran": budget})
        
    top5_capex = sorted(top_capex_list, key=lambda x: x["anggaran"], reverse=True)[:5]

    # Use total_perubahan as the active budget to be super realtime with reallocations
    active_budget = total_perubahan if total_perubahan > 0 else total_rkap
    persen_realisasi = round((total_realisasi / active_budget * 100), 2) if active_budget > 0 else 0

    return {
        "total_capex_items": total_capex_items,
        "total_anggaran_rkap": total_rkap,
        "total_anggaran_perubahan": total_perubahan,
        "total_realisasi": total_realisasi,
        "persen_realisasi": persen_realisasi,
        "sisa_anggaran": active_budget - total_realisasi,
        "status_distribution": status_amounts,
        "kategori_distribution": category_amounts,
        "top5_capex": top5_capex,
    }


def get_monthly_chart_data(tahun: int, is_carryover: bool = False) -> list[dict]:
    client = get_supabase_admin()
    
    # 1. Get all RKAP items (is_carryover filtered)
    master_result = client.table("capex_master").select("id").eq("tahun", tahun).eq("is_carryover", is_carryover).execute()
    master_ids = {str(m["id"]) for m in master_result.data}
    
    result = client.table("capex_realization").select("capex_id, bulan, nilai_rkap, nilai_realisasi").eq("tahun", tahun).execute()

    monthly: dict[int, dict] = {
        m: {"bulan": BULAN_NAMES[m - 1], "rkap": 0, "realisasi": 0}
        for m in range(1, 13)
    }
    for r in result.data:
        if str(r["capex_id"]) in master_ids:
            b = r["bulan"]
            monthly[b]["rkap"] += r["nilai_rkap"]
            monthly[b]["realisasi"] += r["nilai_realisasi"]

    return list(monthly.values())


def get_capex_progress_table(tahun: int, is_carryover: bool = False) -> list[dict]:
    client = get_supabase_admin()

    master = client.table("capex_master").select("id, kode, daftar_capex, kategori, anggaran_rkap, anggaran_perubahan, pic").eq("tahun", tahun).eq("is_carryover", is_carryover).execute()
    real_data = []
    offset = 0
    limit = 1000
    while True:
        res = client.table("capex_realization").select("capex_id, nilai_realisasi, status").eq("tahun", tahun).range(offset, offset + limit - 1).execute()
        real_data.extend(res.data)
        if len(res.data) < limit:
            break
        offset += limit

    real_by_capex: dict[str, dict] = {}
    for r in real_data:
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
        anggaran = m.get("anggaran_perubahan") or m.get("anggaran_rkap") or 0
        persen = round(realisasi / anggaran * 100, 2) if anggaran > 0 else 0
        rows.append({
            **m,
            "total_realisasi": realisasi,
            "persen_realisasi": persen,
            "statuses": statuses,
        })

    return rows

def get_summary_table_ytd(tahun: int, bulan: int, is_carryover: bool = False) -> list[dict]:
    client = get_supabase_admin()
    
    # 1. Ambil data master
    master = client.table("capex_master").select("id, kode, daftar_capex, kategori, anggaran_rkap, anggaran_perubahan").eq("tahun", tahun).eq("is_carryover", is_carryover).execute()
    master_ids = [str(r["id"]) for r in master.data]
    
    # 2. Ambil data realisasi HANYA untuk bulan <= bulan yang dipilih
    real = client.table("capex_realization").select("capex_id, nilai_rkap, nilai_realisasi, nilai_bast, status, bulan").eq("tahun", tahun).lte("bulan", bulan).execute()

    
    # Agregasi data YTD per capex_id
    ytd_data = {}
    for r in real.data:
        cid = r["capex_id"]
        if cid not in ytd_data:
            ytd_data[cid] = {
                "rkap_ytd": 0,
                "total_realisasi": 0,
                "total_bast": 0,
                "latest_status": None,
                "latest_status_month": -1
            }
        
        ytd_data[cid]["rkap_ytd"] += r.get("nilai_rkap") or 0
        ytd_data[cid]["total_realisasi"] += r.get("nilai_realisasi") or 0
        ytd_data[cid]["total_bast"] += r.get("nilai_bast") or 0
        
        st = r.get("status")
        mth = r.get("bulan") or 0
        if st is not None and st != "":
            # Update latest status if this month is >= the one we recorded
            if mth > ytd_data[cid]["latest_status_month"]:
                ytd_data[cid]["latest_status"] = st
                ytd_data[cid]["latest_status_month"] = mth
            
    # Susun per Kategori
    kategori_map = {}
    for m in master.data:
        kat = m.get("kategori") or "Lainnya"
        main_kat = m.get("kode") or "INVESTASI RUTIN"
        cid = str(m["id"])
        
        if kat not in kategori_map:
            kategori_map[kat] = {
                "kategori": kat,
                "main_kategori": main_kat,
                "items": [],
                "subtotal_budget": 0,
                "subtotal_rkap_ytd": 0,
                "subtotal_real_po": 0,
                "subtotal_real_bast": 0,
            }
            
        # Use anggaran_perubahan as primary active budget
        budget = m.get("anggaran_perubahan") or m.get("anggaran_rkap") or 0
        ytd = ytd_data.get(cid, {})
        rkap_ytd = ytd.get("rkap_ytd", 0)
        total_real = ytd.get("total_realisasi", 0)
        total_bast = ytd.get("total_bast", 0)
        
        real_bast = total_bast
        real_po = total_real - total_bast
        if real_po < 0: 
            real_po = 0
        
        pct_po = round((real_po / rkap_ytd * 100), 2) if rkap_ytd > 0 else 0
        pct_bast = round((real_bast / rkap_ytd * 100), 2) if rkap_ytd > 0 else 0
        
        item_data = {
            "id": cid,
            "uraian": m.get("daftar_capex") or "-",
            "budget": budget,
            "rkap_ytd": rkap_ytd,
            "real_po": real_po,
            "real_bast": real_bast,
            "pct_po": pct_po,
            "pct_bast": pct_bast
        }
        
        kategori_map[kat]["items"].append(item_data)
        kategori_map[kat]["subtotal_budget"] += budget
        kategori_map[kat]["subtotal_rkap_ytd"] += rkap_ytd
        kategori_map[kat]["subtotal_real_po"] += real_po
        kategori_map[kat]["subtotal_real_bast"] += real_bast
        
    # Hitung persentase subtotal
    result = []
    for kat, data in kategori_map.items():
        rytd = data["subtotal_rkap_ytd"]
        data["subtotal_pct_po"] = round((data["subtotal_real_po"] / rytd * 100), 2) if rytd > 0 else 0
        data["subtotal_pct_bast"] = round((data["subtotal_real_bast"] / rytd * 100), 2) if rytd > 0 else 0
        result.append(data)
        
    # Urutkan secara alfabetis atau sesuai urutan tertentu (biasanya Investasi Rutin di atas)
    result.sort(key=lambda x: x["kategori"])
    return result
