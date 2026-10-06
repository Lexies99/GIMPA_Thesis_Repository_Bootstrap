import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

inspect_dean = """import sqlite3

c_thesis = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db').cursor()
c_thesis.execute("SELECT id, email, hashed_password, is_active FROM users WHERE email='dean@gimpa.edu.gh'")
print("Thesis Dean row:", c_thesis.fetchone())

c_idp = sqlite3.connect('/home/admin/services/password_database/password_database.db').cursor()
c_idp.execute("SELECT id, email, password_hash, is_active FROM users WHERE email='dean@gimpa.edu.gh'")
print("IDP Dean row:", c_idp.fetchone())
"""

sftp = client.open_sftp()
with sftp.file('/tmp/inspect_dean.py', 'w') as f:
    f.write(inspect_dean)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/inspect_dean.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
