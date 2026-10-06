import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

print("[1/4] Uploading updated user_service.py to Thesis backend...")
sftp = client.open_sftp()
sftp.put(r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\app\services\user_service.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/services/user_service.py")
sftp.close()

print("[2/4] Updating Library App change_password & update endpoints to sync to Password_database...")
lib_patch_code = """path = "/home/admin/web/libraryapp.manamatechnologies.com/public_html/backend/main.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Helper sync function
sync_helper = '''
def sync_to_central_password_database(email: str, new_password: str):
    try:
        import urllib.request, json
        sync_data = json.dumps({
            "email": email.strip().lower(),
            "new_password": new_password,
            "client_app": "libraryapp"
        }).encode('utf-8')
        sync_req = urllib.request.Request(
            "http://127.0.0.1:8020/api/v1/auth/sync-password",
            data=sync_data,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": "master-internal-auth-key-2026"
            }
        )
        urllib.request.urlopen(sync_req, timeout=3)
        print(f"[Central SSO Sync] Synced password for {email} to Password_database.")
    except Exception as e:
        print(f"[Central SSO Sync Notice]: {e}")
'''

if "def sync_to_central_password_database" not in content:
    content = sync_helper + "\\n" + content

# Add call in /api/change-password
old_change = '''    cursor.execute("UPDATE lecturers SET password_hash = ? WHERE id = ?", (new_hash, lecturer["id"]))
    conn.commit()
    conn.close()'''

new_change = '''    cursor.execute("UPDATE lecturers SET password_hash = ? WHERE id = ?", (new_hash, lecturer["id"]))
    conn.commit()
    conn.close()
    sync_to_central_password_database(lecturer["email"], new_password)'''

if old_change in content:
    content = content.replace(old_change, new_change)
    print("Patched /api/change-password in libraryapp.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated libraryapp main.py successfully.")
"""

sftp = client.open_sftp()
with sftp.file('/tmp/patch_lib_full.py', 'w') as f:
    f.write(lib_patch_code)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/patch_lib_full.py')
print(stdout.read().decode('utf-8', errors='replace'))

print("[3/4] Restarting services...")
stdin, stdout, stderr = client.exec_command('systemctl restart gimpa-backend && systemctl restart sotss && systemctl restart password-database')
print(stdout.read().decode('utf-8', errors='replace'))

print("[4/4] Executing 2-way cross-app verification test...")
test_cross_sync = """import urllib.request, urllib.parse, json

# 1. Test Lecturer Login with Admin12345 (which is the current admin password)
data = urllib.parse.urlencode({"username": "admin@gimpa.edu.gh", "password": "Admin12345"}).encode("utf-8")

# Check Library App login
req1 = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data)
with urllib.request.urlopen(req1) as r1:
    print("[1] Library App Login status:", r1.status)
    print("    User:", json.loads(r1.read().decode()).get("user"))

# Check Thesis App login
req2 = urllib.request.Request("http://127.0.0.1:8011/api/auth/token", data=data)
with urllib.request.urlopen(req2) as r2:
    print("[2] Thesis App Login status:", r2.status)
    print("    User:", json.loads(r2.read().decode()).get("user"))
"""

sftp = client.open_sftp()
with sftp.file('/tmp/test_cross_sync.py', 'w') as f:
    f.write(test_cross_sync)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/test_cross_sync.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
