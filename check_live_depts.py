import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='admin', password='PsasaqecmCFNgu43wfkRgxMKR', timeout=20)

inspect_code = """import sqlite3

for db_path in [
    '/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db',
    '/home/admin/web/thesis.manamatechnologies.com/public_html/gimpa_thesis.db',
    '/home/admin/web/thesis.manamatechnologies.com/public_html/backend/gimpa_thesis.db'
]:
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        print(f"=== DB: {db_path} ===")
        
        # Check tables
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in c.fetchall()]
        print("Tables count:", len(tables))
        
        if 'institutions' in tables:
            c.execute("SELECT id, name FROM institutions")
            insts = c.fetchall()
            print("Institutions:", insts)
            
        if 'departments' in tables:
            c.execute("SELECT id, institution_id, name, hod_user_id, dean_user_id FROM departments")
            depts = c.fetchall()
            print("Departments:", depts)
            
        if 'users' in tables:
            c.execute("SELECT id, email, full_name, role, school, department FROM users WHERE role IN ('dean', 'hod', 'system_admin', 'deputy_rector') OR email LIKE '%adabor%'")
            leaders = c.fetchall()
            print("Leadership Users:", leaders)
            
        conn.close()
    except Exception as e:
        print(f"Error for {db_path}: {e}")
"""

target = '/home/admin/web/thesis.manamatechnologies.com/public_html/inspect_depts.py'
sftp = client.open_sftp()
with sftp.file(target, 'w') as f:
    f.write(inspect_code)
sftp.close()

stdin, stdout, stderr = client.exec_command(f'python3 {target}')
print('STDOUT:')
print(stdout.read().decode('utf-8', errors='replace'))
print('STDERR:')
print(stderr.read().decode('utf-8', errors='replace'))
client.close()
