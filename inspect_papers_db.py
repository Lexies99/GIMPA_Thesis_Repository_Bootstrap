import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

inspect_db = r"""import sqlite3

conn = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db')
c = conn.cursor()

c.execute("SELECT id, title, status, file_path, discipline, created_by_id, supervisor_id FROM papers ORDER BY id DESC LIMIT 20")
rows = c.fetchall()
print(f"Total papers retrieved: {len(rows)}")
for r in rows:
    print(r)

print("\nDistinct Paper Statuses:")
c.execute("SELECT status, count(*) FROM papers GROUP BY status")
for s in c.fetchall():
    print(s)

print("\nUsers with roles:")
c.execute("SELECT id, email, role, is_admin, department, school FROM users WHERE role != 'student' LIMIT 20")
for u in c.fetchall():
    print(u)
"""

sftp = client.open_sftp()
with sftp.file('/tmp/inspect_papers_db.py', 'w') as f:
    f.write(inspect_db)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/inspect_papers_db.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

client.close()
