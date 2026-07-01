import sys
import os
from supabase import create_client

def main():
    # Mengambil environment variable (yang sudah diisi di .env oleh user)
    from dotenv import load_dotenv
    load_dotenv()
    
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_key or "supabase-service-role-key" in supabase_key:
        print("Error: SUPABASE_SERVICE_ROLE_KEY belum diset dengan benar di .env")
        sys.exit(1)
        
    client = create_client(supabase_url, supabase_key)

    users_to_create = [
        {"email": "admininventasidahana@gmail.com", "password": "12345678", "role": "admin"},
        {"email": "contohuser@gmail.com", "password": "12345678", "role": "user"}
    ]

    for u in users_to_create:
        try:
            # 1. Buat User di sistem Autentikasi
            res = client.auth.admin.create_user({
                "email": u["email"],
                "password": u["password"],
                "email_confirm": True
            })
            user_id = res.user.id
            print(f"✅ User Auth dibuat: {u['email']} (ID: {user_id})")
            
            # 2. Update role di tabel profiles
            client.table("profiles").update({"role": u["role"]}).eq("id", user_id).execute()
            print(f"✅ Role {u['role']} berhasil diset untuk {u['email']}\\n")
            
        except Exception as e:
            print(f"❌ Gagal memproses {u['email']}: {e}\\n")

if __name__ == "__main__":
    main()
