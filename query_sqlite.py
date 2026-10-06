import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=30)
remote_script = """
import sqlite3
conn = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db')
cur = conn.cursor()
cur.execute('''
SELECT u.id, u.email, u.full_name, u.role, u.program, u.department, u.school,
  (SELECT MAX(meeting_date) FROM phd_supervision_logs WHERE student_id = u.id) as last_meeting
FROM users u
WHERE lower(coalesce(u.program, '')) LIKE '%phd%' OR lower(coalesce(u.program, '')) LIKE '%doctor%' OR u.id IN (SELECT student_id FROM phd_supervision_logs);
''')
for r in cur.fetchall():
    print(r)
"""
sftp = client.open_sftp()
with sftp.file('/tmp/check_sqlite.py', 'w') as f:
    f.write(remote_script)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/check_sqlite.py')
print("STDOUT:\n", stdout.read().decode('utf-8'))
print("STDERR:\n", stderr.read().decode('utf-8'))
client.close()

