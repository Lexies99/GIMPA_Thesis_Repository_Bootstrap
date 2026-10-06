import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

inspect_code = """import requests

# Test directly against Password_database port 8020
r = requests.post("http://127.0.0.1:8020/api/v1/auth/verify-credentials", json={
    "email": "lecturer@gimpa.edu.gh",
    "password": "Password123!",
    "client_app": "libraryapp"
})
print("Direct IDP response status:", r.status_code)
print("Direct IDP response JSON:", r.text)

# Check database record for lecturer@gimpa.edu.gh in Password_database
import sqlite3
c = sqlite3.connect("/home/admin/services/password_database/password_database.db").cursor()
c.execute("SELECT id, email, password_hash, role, roles, is_active FROM users WHERE email='lecturer@gimpa.edu.gh'")
print("IDP DB row:", c.fetchone())
"""

sftp = client.open_sftp()
with sftp.file('/tmp/inspect_idp.py', 'w') as f:
    f.write(inspect_code)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/inspect_idp.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
