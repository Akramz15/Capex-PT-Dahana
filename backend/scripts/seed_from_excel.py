import os
import math
import uuid
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not url or not key:
    raise Exception("Supabase credentials not found in environment variables.")

supabase = create_client(url, key)

FILE_PATH = "../Template Monitoring Capex-R2.xlsx"
TAHUN = 2026

def get_int(val):
    if pd.isna(val) or val == '' or val == '-': return 0
    try:
        if isinstance(val, str):
            val = val.replace('.', '')
        return int(float(val))
    except: return 0

def get_str(val):
    if pd.isna(val): return ""
    return str(val).strip()

def clear_data():
    print("Clearing existing data...")
    # Delete assets directly (they are independent)
    # Be careful not to delete ALL years if we want to isolate, but asset has no tahun. We'll delete all assets.
    print("Deleting all assets...")
    supabase.table("capex_assets").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    print("Deleting timeline, lku, status, realization, master...")
    supabase.table("capex_timeline").delete().eq("tahun", TAHUN).execute()
    supabase.table("capex_lku").delete().eq("tahun", TAHUN).execute()
    supabase.table("capex_status_log").delete().eq("tahun", TAHUN).execute()
    supabase.table("capex_realization").delete().eq("tahun", TAHUN).execute()
    supabase.table("capex_master").delete().eq("tahun", TAHUN).execute()
    print("Old data cleared.")

def parse_and_seed():
    print("Parsing Excel...")
    
    # --- 1. Master & Realization from 'Real' sheet ---
    df_real = pd.read_excel(FILE_PATH, sheet_name="Real", header=None)
    
    capex_map = {} # daftar_capex -> id
    
    master_inserts = []
    realization_inserts = []
    
    kode_counter = 1
    current_kategori = "Umum"
    
    for i in range(5, len(df_real)):
        row = df_real.iloc[i]
        no_val = row[1]
        
        if pd.isna(no_val) or (isinstance(no_val, str) and (no_val.strip() == "" or no_val.strip().lower() == "no.")):
            kategori_text = get_str(row[2])
            if kategori_text:
                current_kategori = kategori_text
            continue

        if pd.notna(no_val) and (isinstance(no_val, (int, float)) or (isinstance(no_val, str) and no_val.strip().isdigit())):
            daftar_capex = get_str(row[2])
            anggaran_rkap = get_int(row[3])
            anggaran_perubahan = get_int(row[4])
            status_overall = get_str(row[5]).replace("BA/ADK", "BAADK")
            ket_overall = get_str(row[6])
            pic = get_str(row[33]) if len(row) > 33 else ""
            
            if not daftar_capex: continue
            
            cid = str(uuid.uuid4())
            capex_map[daftar_capex] = cid
            
            master_inserts.append({
                "id": cid,
                "kode": f"CPX-{TAHUN}-{kode_counter:03d}",
                "daftar_capex": daftar_capex,
                "tahun": TAHUN,
                "anggaran_rkap": anggaran_rkap,
                "anggaran_perubahan": anggaran_perubahan,
                "pic": pic if pic else None,
                "kategori": current_kategori[:50] if current_kategori else None
            })
            kode_counter += 1
            
            # Realisasi per bulan (Jan-Des) starts at column 7 (Jan RKAP), 8 (Jan Real)
            col_idx = 7
            for bulan in range(1, 13):
                rkap_val = get_int(row[col_idx])
                real_val = get_int(row[col_idx + 1])
                col_idx += 2
                
                realization_inserts.append({
                    "capex_id": cid,
                    "tahun": TAHUN,
                    "bulan": bulan,
                    "nilai_rkap": rkap_val,
                    "nilai_realisasi": real_val,
                    "status": status_overall if (bulan == 1 and status_overall) else None,
                    "keterangan": ket_overall if (bulan == 1 and ket_overall) else None
                })
    
    print(f"Inserting {len(master_inserts)} Capex Masters...")
    # chunking for Supabase limits
    chunk_size = 50
    for i in range(0, len(master_inserts), chunk_size):
        supabase.table("capex_master").insert(master_inserts[i:i+chunk_size]).execute()
        
    print(f"Inserting {len(realization_inserts)} Realizations...")
    for i in range(0, len(realization_inserts), chunk_size):
        supabase.table("capex_realization").insert(realization_inserts[i:i+chunk_size]).execute()
        
        
    # --- 2. LKU from 'LKU' sheet ---
    df_lku = pd.read_excel(FILE_PATH, sheet_name="LKU", header=None)
    lku_inserts = []
    
    # Assuming data starts row 5
    for i in range(5, len(df_lku)):
        row = df_lku.iloc[i]
        uraian = get_str(row[2])
        if uraian:
            # Find matching CID
            cid = None
            for key, val in capex_map.items():
                if key.lower() in uraian.lower() or uraian.lower() in key.lower():
                    cid = val
                    break
                    
            if not cid: continue
            
            departemen = get_str(row[3])
            rkap_nilai = get_int(row[4])
            rkap_target = get_int(row[5])
            rencana_twi = get_int(row[6])
            
            # Jan - Des (cols 7 to 18)
            rencana_per_bulan = {}
            for bulan in range(1, 13):
                rencana_per_bulan[str(bulan)] = get_int(row[6 + bulan])
                
            real_po = get_int(row[19])
            real_bast = get_int(row[20])
            
            lku_inserts.append({
                "capex_id": cid,
                "tahun": TAHUN,
                "kategori_investasi": "LKU",
                "departemen": departemen,
                "rkap_nilai": rkap_nilai,
                "rkap_target": rkap_target,
                "rencana_twi": rencana_twi,
                "realisasi_po": real_po,
                "realisasi_bast": real_bast,
                "rencana_per_bulan": rencana_per_bulan
            })
            
    print(f"Inserting {len(lku_inserts)} LKU...")
    for i in range(0, len(lku_inserts), chunk_size):
        supabase.table("capex_lku").insert(lku_inserts[i:i+chunk_size]).execute()


    # --- 3. Timeline from 'Timeline' sheet ---
    df_time = pd.read_excel(FILE_PATH, sheet_name="Timeline", header=None)
    time_inserts = []
    
    for i in range(6, len(df_time)):
        row = df_time.iloc[i]
        no_val = row[1]
        if pd.notna(no_val) and isinstance(no_val, (int, float)):
            daftar_capex = get_str(row[2])
            cid = capex_map.get(daftar_capex)
            if not cid: continue
            
            ket = get_str(row[3])
            # cols 6 to 53 are weeks (4 weeks * 12 = 48 cols)
            col_idx = 6
            for bulan in range(1, 13):
                for minggu in range(1, 5):
                    status_kode = get_str(row[col_idx]).strip()
                    if status_kode:
                        time_inserts.append({
                            "capex_id": cid,
                            "tahun": TAHUN,
                            "bulan": bulan,
                            "minggu": minggu,
                            "kode_status": status_kode[0].upper(), # Truncate to 1 char
                            "keterangan": ket if minggu == 1 and bulan == 1 else ""
                        })
                    col_idx += 1
                    
    print(f"Inserting {len(time_inserts)} Timeline blocks...")
    for i in range(0, len(time_inserts), chunk_size):
        supabase.table("capex_timeline").insert(time_inserts[i:i+chunk_size]).execute()


    # --- 4. Status Sheets (PO, Tender, dll) ---
    status_sheets = ["PO", "BAADK", "Tender", "Kajian", "Lainnya"]
    status_inserts = []
    
    for sheet in status_sheets:
        try:
            df_st = pd.read_excel(FILE_PATH, sheet_name=sheet, header=None)
            for i in range(5, len(df_st)):
                row = df_st.iloc[i]
                no_val = row[1]
                if pd.notna(no_val) and isinstance(no_val, (int, float)):
                    daftar_capex = get_str(row[2])
                    cid = capex_map.get(daftar_capex)
                    if not cid:
                        # Try partial match (ignore parentheses)
                        for key, val in capex_map.items():
                            if key.lower().split(' (')[0] == daftar_capex.lower().split(' (')[0] and daftar_capex:
                                cid = val
                                break
                    if not cid: continue
                    
                    rkap = get_int(row[3])
                    perubahan = get_int(row[4])
                    
                    if sheet == "Lainnya":
                        real = 0
                        ket = get_str(row[6])
                        ket_rekap = get_str(row[8])
                        nil_rekap = get_int(row[9])
                    elif sheet == "Tender":
                        real = get_int(row[7])
                        ket = get_str(row[8])
                        ket_rekap = get_str(row[10])
                        nil_rekap = get_int(row[11])
                    else:
                        real = get_int(row[6])
                        ket = get_str(row[7])
                        ket_rekap = get_str(row[9])
                        nil_rekap = get_int(row[10])
                        
                    full_ket = f"{ket}|||{ket_rekap}" if ket_rekap else ket
                    
                    status_inserts.append({
                        "capex_id": cid,
                        "tahun": TAHUN,
                        "status_type": sheet,
                        "anggaran_rkap": rkap,
                        "anggaran_perubahan": perubahan,
                        "total_realisasi": real,
                        "keterangan": full_ket if full_ket else None,
                        "rekap_nilai": nil_rekap
                    })
        except Exception as e:
            print(f"Skipping sheet {sheet} due to error: {e}")

    print(f"Inserting {len(status_inserts)} Status logs...")
    for i in range(0, len(status_inserts), chunk_size):
        supabase.table("capex_status_log").insert(status_inserts[i:i+chunk_size]).execute()


    # --- 5. Data Aset ---
    df_aset = pd.read_excel(FILE_PATH, sheet_name="Data Aset", header=None)
    aset_inserts = []
    
    for i in range(5, len(df_aset)):
        row = df_aset.iloc[i]
        no_val = row[0]
        if pd.notna(no_val) and isinstance(no_val, (int, float)):
            desc = get_str(row[7]) # Asset description is col 7
            
            po_date = row[2]
            if pd.notna(po_date):
                try:
                    po_date = pd.to_datetime(po_date, dayfirst=True).strftime("%Y-%m-%d")
                except:
                    po_date = None
            else:
                po_date = None
                
            cap_date = row[6]
            if pd.notna(cap_date):
                try:
                    cap_date = pd.to_datetime(cap_date, dayfirst=True).strftime("%Y-%m-%d")
                except:
                    cap_date = None
            else:
                cap_date = None

            aset_inserts.append({
                "no_po": get_str(row[1]),
                "tanggal_po": po_date if po_date else None,
                "no_asset": get_str(row[3]),
                "sub_number": get_str(row[4]),
                "category": get_str(row[5]),
                "capitalized_on": cap_date if cap_date else None,
                "asset_description": desc,
                "acquis_val": get_int(row[8]),
                "accum_dep": get_int(row[9]),
                "book_val": get_int(row[10]),
                "currency": get_str(row[11])[:3] if len(row) > 11 and get_str(row[11]) else "IDR",
                "location_code": get_str(row[12]) if len(row) > 12 else "",
                "lokasi": get_str(row[13]) if len(row) > 13 else "",
                "room": get_str(row[14]) if len(row) > 14 else "",
                "keterangan": get_str(row[15]) if len(row) > 15 else ""
            })
            
    print(f"Inserting {len(aset_inserts)} Assets...")
    for i in range(0, len(aset_inserts), chunk_size):
        supabase.table("capex_assets").insert(aset_inserts[i:i+chunk_size]).execute()
        
    print("Seeding Complete!")

if __name__ == "__main__":
    clear_data()
    parse_and_seed()
