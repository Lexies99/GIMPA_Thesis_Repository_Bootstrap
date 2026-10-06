import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

sync_now = """import requests
import sqlite3

# Check thesis DB password hash for admin@gimpa.edu.gh
thesis_conn = sqlite3.connect("/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db")
thesis_c = thesis_conn.cursor()
thesis_c.execute("SELECT email, hashed_password, full_name, role, is_admin FROM users WHERE email='admin@gimpa.edu.gh'")
row = thesis_c.fetchone()
print("Thesis DB user row:", row)

# Update Password_database via sync-password API
r = requests.post("http://127.0.0.1:8020/api/v1/auth/sync-password",
    headers={"X-API-Key": "master-internal-auth-key-2026"},
    json={
        "email": "admin@gimpa.edu.gh",
        "new_password": "Admin12345",
        "client_app": "thesis_portal_sync"
    }
)
print("Password_database sync status:", r.status_code, r.text)

# Also test verify-credentials with Admin12345
r_verify = requests.post("http://127.0.0.1:8020/api/v1/auth/verify-credentials", json={
    "email": "admin@gimpa.edu.gh",
    "password": "Admin12345",
    "client_app": "libraryapp"
})
print("Password_database verify status:", r_verify.status_code, r_verify.text)

# Now test Library App login with Admin12345
import urllib.request, urllib.parse
data = urllib.parse.urlencode({"username": "admin@gimpa.edu.gh", "password": "Admin12345"}).encode("utf-8")
req = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data)
try:
    with urllib.request.urlopen(req) as resp:
        print("[SUCCESS] Library App Login with Admin12345:", resp.read().decode())
except Exception as e:
    print("Library App login error:", e)
"""

sftp = client.open_sftp()
with sftp.file('/tmp/sync_admin_pass.py', 'w') as f:
    f.write(sync_now)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/sync_admin_pass.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
