import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

server_script = """import sqlite3
import json
import urllib.request
import urllib.parse

# 1. Sync users from Thesis to Password_database
print("[1/3] Syncing users from Thesis DB into Password_database...")
thesis_conn = sqlite3.connect("/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db")
thesis_c = thesis_conn.cursor()

idp_conn = sqlite3.connect("/home/admin/services/password_database/password_database.db")
idp_c = idp_conn.cursor()

thesis_c.execute("SELECT id, email, hashed_password, full_name, school_id, school, department, role, is_admin, is_active FROM users")
thesis_users = thesis_c.fetchall()

for u in thesis_users:
    uid, email, pwd_hash, full_name, school_id, school, department, role, is_admin, is_active = u
    email = email.strip().lower()
    
    thesis_c.execute("SELECT role FROM user_roles WHERE user_id = ?", (uid,))
    roles = [r[0] for r in thesis_c.fetchall()]
    if not roles and role:
        roles = [role]
    if is_admin and "system_admin" not in roles:
        roles.append("system_admin")

    idp_c.execute("SELECT id FROM users WHERE email = ?", (email,))
    row = idp_c.fetchone()
    if row:
        idp_c.execute('''
            UPDATE users SET 
                password_hash = ?, full_name = ?, school = ?, department = ?, 
                role = ?, roles = ?, is_admin = ?, is_active = ?, failed_login_attempts = 0
            WHERE email = ?
        ''', (pwd_hash, full_name, school, department, role or "student", json.dumps(roles), 1 if is_admin else 0, 1 if is_active else 0, email))
        print(f"Updated user in IDP: {email}")
    else:
        idp_c.execute('''
            INSERT INTO users (
                email, password_hash, full_name, school, department, 
                role, roles, is_admin, is_active, is_verified, failed_login_attempts, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))
        ''', (email, pwd_hash, full_name, school, department, role or "student", json.dumps(roles), 1 if is_admin else 0, 1 if is_active else 0))
        print(f"Inserted user into IDP: {email}")

idp_conn.commit()
idp_conn.close()
thesis_conn.close()
print("All users synchronized into Password_database successfully!")

# 2. Update libraryapp backend
print("[2/3] Updating Library App backend...")
path = "/home/admin/web/libraryapp.manamatechnologies.com/public_html/backend/main.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("http://127.0.0.1:8011/api/auth/sso/verify-credentials", "http://127.0.0.1:8020/api/v1/auth/verify-credentials")
content = content.replace("http://127.0.0.1:8011/api/auth/sso/sync-password", "http://127.0.0.1:8020/api/v1/auth/sync-password")
content = content.replace('"identifier": email', '"email": email')
content = content.replace('"app_id": "libraryapp"', '"client_app": "libraryapp"')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated libraryapp main.py to target Password_database port 8020")
"""

sftp = client.open_sftp()
with sftp.file('/tmp/sync_and_setup.py', 'w') as f:
    f.write(server_script)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/sync_and_setup.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

print("Restarting services...")
stdin, stdout, stderr = client.exec_command('systemctl restart sotss && systemctl restart password-database')
print(stdout.read().decode('utf-8', errors='replace'))

test_script = """import urllib.request, urllib.parse, json

# Test login for lecturer on library app
data = urllib.parse.urlencode({
    "username": "lecturer@gimpa.edu.gh",
    "password": "Password123!"
}).encode("utf-8")

req = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data)
try:
    with urllib.request.urlopen(req) as resp:
        print("Library App Login (lecturer): Status", resp.status)
        res_json = json.loads(resp.read().decode())
        print("Logged in as:", res_json.get("email"), "| Role:", res_json.get("role"), "| is_admin:", res_json.get("is_admin"))
except Exception as e:
    print("Login error:", e)

# Test login for admin on library app
data = urllib.parse.urlencode({
    "username": "admin@gimpa.edu.gh",
    "password": "Password123!"
}).encode("utf-8")

req = urllib.request.Request("http://127.0.0.1:8000/api/login", data=data)
try:
    with urllib.request.urlopen(req) as resp:
        print("Library App Login (admin): Status", resp.status)
        res_json = json.loads(resp.read().decode())
        print("Logged in as:", res_json.get("email"), "| Role:", res_json.get("role"), "| is_admin:", res_json.get("is_admin"))
except Exception as e:
    print("Login error:", e)
"""

sftp = client.open_sftp()
with sftp.file('/tmp/test_login.py', 'w') as f:
    f.write(test_script)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/test_login.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
