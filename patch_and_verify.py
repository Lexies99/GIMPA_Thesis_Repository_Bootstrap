import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

update_code = """path = "/home/admin/web/libraryapp.manamatechnologies.com/public_html/backend/main.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = '''            if sso_resp.status == 200:
                sso_data = json.loads(sso_resp.read().decode('utf-8'))
                if sso_data.get("authenticated"):
                    sso_user = sso_data.get("user")'''

new_block = '''            if sso_resp.status == 200:
                sso_data = json.loads(sso_resp.read().decode('utf-8'))
                if sso_data.get("valid") or sso_data.get("authenticated"):
                    sso_user = sso_data.get("user") or sso_data'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated SSO parser in libraryapp backend.")
else:
    print("Old block not found directly, performing flexible replace.")
    content = content.replace('if sso_data.get("authenticated"):', 'if sso_data.get("valid") or sso_data.get("authenticated"):')
    content = content.replace('sso_user = sso_data.get("user")', 'sso_user = sso_data.get("user") or sso_data')
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Flexible replacement done.")
"""

sftp = client.open_sftp()
with sftp.file('/tmp/patch_lib_sso.py', 'w') as f:
    f.write(update_code)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/patch_lib_sso.py')
print(stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = client.exec_command('systemctl restart sotss')
print("Restarted sotss.")

import time
time.sleep(2)

test_code = """import urllib.request, urllib.parse, json

# Test lecturer login
data = urllib.parse.urlencode({"username": "lecturer@gimpa.edu.gh", "password": "Password123!"}).encode("utf-8")
req = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data)
try:
    with urllib.request.urlopen(req) as resp:
        print("[SUCCESS] Library App Login (Lecturer):", resp.read().decode())
except Exception as e:
    print("Lecturer login error:", e)

# Test admin login
data = urllib.parse.urlencode({"username": "admin@gimpa.edu.gh", "password": "Password123!"}).encode("utf-8")
req = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data)
try:
    with urllib.request.urlopen(req) as resp:
        print("[SUCCESS] Library App Login (Admin):", resp.read().decode())
except Exception as e:
    print("Admin login error:", e)

# Test dean login
data = urllib.parse.urlencode({"username": "dean@gimpa.edu.gh", "password": "Password123!"}).encode("utf-8")
req = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data)
try:
    with urllib.request.urlopen(req) as resp:
        print("[SUCCESS] Library App Login (Dean):", resp.read().decode())
except Exception as e:
    print("Dean login error:", e)
"""

sftp = client.open_sftp()
with sftp.file('/tmp/test_logins_now.py', 'w') as f:
    f.write(test_code)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/test_logins_now.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
