import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=30)
remote_code = """
import psycopg2
conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/thesis')
cur = conn.cursor()
cur.execute('''
    SELECT u.id, u.email, u.full_name, u.program, u.department, u.school
    FROM users u
    WHERE (lower(u.program) LIKE '%phd%' OR lower(u.program) LIKE '%doctor%')
      AND u.role IN ('student', 'member');
''')
rows = cur.fetchall()
for r in rows:
    cur.execute('SELECT MAX(meeting_date) FROM phd_supervision_logs WHERE student_id = %s', (r[0],))
    last_meeting = cur.fetchone()[0]
    print('Student ID:', r[0], '| Email:', r[1], '| Name:', r[2], '| Dept:', r[4], '| School:', r[5], '| Last Meeting:', last_meeting)
"""
stdin, stdout, stderr = client.exec_command(f"python3 -c {repr(remote_code)}")
out = stdout.read().decode('utf-8')
err = stderr.read().decode('utf-8')
print('STDOUT:\n', out)
print('STDERR:\n', err)
client.close()
