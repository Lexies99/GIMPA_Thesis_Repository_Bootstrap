import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

test_both = """import urllib.request, urllib.parse, json

data = urllib.parse.urlencode({"username": "admin@gimpa.edu.gh", "password": "Admin12345"}).encode("utf-8")

# 1. Test Library App Login
req1 = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data)
with urllib.request.urlopen(req1) as r1:
    print("[1] Library App Login status:", r1.status)
    print("    User:", json.loads(r1.read().decode()).get("user"))

# 2. Test Thesis App Login
req2 = urllib.request.Request("http://127.0.0.1:8011/api/auth/login", data=data)
with urllib.request.urlopen(req2) as r2:
    print("[2] Thesis App Login status:", r2.status)
    res2 = json.loads(r2.read().decode())
    print("    Access Token (first 30 chars):", res2.get("access_token")[:30])

# 3. Test Dean Login on both apps
data_dean = urllib.parse.urlencode({"username": "dean@gimpa.edu.gh", "password": "Password123!"}).encode("utf-8")

req3 = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data_dean)
with urllib.request.urlopen(req3) as r3:
    print("[3] Library App Login (Dean) status:", r3.status)
    print("    User:", json.loads(r3.read().decode()).get("user"))

req4 = urllib.request.Request("http://127.0.0.1:8011/api/auth/login", data=data_dean)
with urllib.request.urlopen(req4) as r4:
    print("[4] Thesis App Login (Dean) status:", r4.status)
    res4 = json.loads(r4.read().decode())
    print("    Access Token (first 30 chars):", res4.get("access_token")[:30])
"""

sftp = client.open_sftp()
with sftp.file('/tmp/test_both_apps.py', 'w') as f:
    f.write(test_both)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/test_both_apps.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
