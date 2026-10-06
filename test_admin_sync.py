import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

test_admin = """import requests

# Test admin password sync via Password_database API
r = requests.post("http://127.0.0.1:8020/api/v1/auth/sync-password", 
    headers={"X-API-Key": "master-internal-auth-key-2026"},
    json={
        "email": "admin@gimpa.edu.gh",
        "new_password": "Password123!",
        "client_app": "system_init"
    }
)
print("Admin password sync status:", r.status_code, r.text)

# Test verification
r2 = requests.post("http://127.0.0.1:8020/api/v1/auth/verify-credentials", json={
    "email": "admin@gimpa.edu.gh",
    "password": "Password123!",
    "client_app": "libraryapp"
})
print("Admin verification status:", r2.status_code, r2.text)

# Now test Library App login
import urllib.request, urllib.parse
data = urllib.parse.urlencode({"username": "admin@gimpa.edu.gh", "password": "Password123!"}).encode("utf-8")
req = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data)
with urllib.request.urlopen(req) as resp:
    print("[SUCCESS] Library App Admin Login:", resp.read().decode())
"""

sftp = client.open_sftp()
with sftp.file('/tmp/test_admin_sync.py', 'w') as f:
    f.write(test_admin)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/test_admin_sync.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
