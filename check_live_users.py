import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("46.62.214.146", username="root", password="ANCugiE4jL3q")
sftp = client.open_sftp()
with sftp.open('/tmp/check_schools.py', 'w') as f:
    f.write('''
import sqlite3, json
conn = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db')
c = conn.cursor()
schools = c.execute("SELECT DISTINCT school FROM users WHERE school IS NOT NULL").fetchall()
depts = c.execute("SELECT DISTINCT department FROM users WHERE department IS NOT NULL").fetchall()
staff = c.execute("SELECT id, email, role, school, department FROM users WHERE role IN ('dean', 'hod', 'project_coordinator', 'lecturer', 'project_supervisor')").fetchall()
print('SCHOOLS:', json.dumps(schools, indent=2))
print('DEPTS:', json.dumps(depts, indent=2))
print('STAFF:', json.dumps(staff, indent=2))
''')
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/check_schools.py')
print("OUT:\n", stdout.read().decode())
client.close()
