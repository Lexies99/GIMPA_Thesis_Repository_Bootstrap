import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

script_body = """
import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
new_pass = "Librarian@2026!"
hashed = pwd_context.hash(new_pass)

# Update Thesis DB
conn = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db')
c = conn.cursor()
c.execute("UPDATE users SET hashed_password = ?, must_change_password = 1, is_active = 1 WHERE email = 'librarian@gimpa.edu.gh'", (hashed,))
conn.commit()
print("Updated Thesis DB. Rows affected:", c.rowcount)
conn.close()

# Update Password Database / IDP
try:
    idp_conn = sqlite3.connect('/home/admin/services/password_database/password_database.db')
    idp_c = idp_conn.cursor()
    idp_c.execute("UPDATE users SET password_hash = ?, is_active = 1 WHERE email = 'librarian@gimpa.edu.gh'", (hashed,))
    if idp_c.rowcount == 0:
        idp_c.execute('''
            INSERT INTO users (email, password_hash, full_name, role, roles, is_admin, is_active, is_verified, failed_login_attempts, created_at, updated_at)
            VALUES ('librarian@gimpa.edu.gh', ?, 'Samuel Laryea', 'librarian', '["librarian"]', 1, 1, 1, 0, datetime('now'), datetime('now'))
        ''', (hashed,))
    idp_conn.commit()
    print("Updated IDP DB. Rows affected:", idp_c.rowcount)
    idp_conn.close()
except Exception as e:
    print("IDP update note:", e)

print("SUCCESS: Password for librarian@gimpa.edu.gh is now:", new_pass)
"""

sftp = client.open_sftp()
with sftp.file('/tmp/set_pass.py', 'w') as f:
    f.write(script_body)
sftp.close()

stdin, stdout, stderr = client.exec_command("/home/admin/web/thesis.manamatechnologies.com/app/venv/bin/python3 /tmp/set_pass.py")
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
client.close()
