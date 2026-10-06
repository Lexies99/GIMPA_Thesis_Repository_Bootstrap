import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

test_full_roundtrip = r"""import urllib.request, urllib.parse, json, requests

print("=== [TEST 1] Change password for lecturer@gimpa.edu.gh via Central IdP / Thesis ===")
r_sync = requests.post("http://127.0.0.1:8020/api/v1/auth/sync-password", 
    headers={"X-API-Key": "master-internal-auth-key-2026"},
    json={
        "email": "lecturer@gimpa.edu.gh",
        "new_password": "LecturerPass2026!",
        "client_app": "test_suite"
    }
)
print("Password change status:", r_sync.status_code)

print("=== [TEST 2] Verify login on Library App with NEW password ===")
data_new = urllib.parse.urlencode({"username": "lecturer@gimpa.edu.gh", "password": "LecturerPass2026!"}).encode("utf-8")
req_lib = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data_new)
with urllib.request.urlopen(req_lib) as resp:
    print("[SUCCESS] Library App Login status:", resp.status)
    print("         User:", json.loads(resp.read().decode()).get("user"))

print("=== [TEST 3] Verify login on Thesis App with NEW password ===")
req_thes = urllib.request.Request("http://127.0.0.1:8011/api/auth/login", data=data_new)
with urllib.request.urlopen(req_thes) as resp:
    print("[SUCCESS] Thesis App Login status:", resp.status)
    print("         Token:", resp.read().decode()[:40])

print("=== [TEST 4] Verify OLD password fails on BOTH apps ===")
data_old = urllib.parse.urlencode({"username": "lecturer@gimpa.edu.gh", "password": "OldPassword123!"}).encode("utf-8")
try:
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8000/api/login", data=data_old))
    print("[-] Error: Old password should have failed on Library App")
except Exception as e:
    print("[+] Old password properly rejected on Library App:", e)

try:
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8011/api/auth/login", data=data_old))
    print("[-] Error: Old password should have failed on Thesis App")
except Exception as e:
    print("[+] Old password properly rejected on Thesis App:", e)
"""

sftp = client.open_sftp()
with sftp.file('/tmp/test_full_roundtrip.py', 'w') as f:
    f.write(test_full_roundtrip)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/test_full_roundtrip.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
