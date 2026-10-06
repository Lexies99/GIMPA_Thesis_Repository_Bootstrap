import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("46.62.214.146", username="root", password="ANCugiE4jL3q")
sftp = client.open_sftp()
with sftp.open('/tmp/update_users.py', 'w') as f:
    f.write('''
import sqlite3
conn = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db')
c = conn.cursor()
c.execute("UPDATE users SET school = 'GIMPA Business School' WHERE email IN ('dean@gimpa.edu.gh', 'eadaku@gimpa.edu.gh')")
c.execute("UPDATE users SET school = 'School of Technology and Social Sciences (SOTSS)' WHERE email = 'kofi.mensah@gimpa.edu.gh'")
c.execute("UPDATE users SET school = 'School of Technology and Social Sciences (SOTSS)', department = 'Computer Science' WHERE email IN ('kwame.boadu@adj.gimpa.edu.gh', 'yaw.asante@gimpa.edu.gh')")
conn.commit()
print("Live DB updated:", c.execute("SELECT email, role, school, department FROM users WHERE role IN ('dean', 'hod', 'project_coordinator')").fetchall())
conn.close()
''')
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/update_users.py')
print("OUT:\n", stdout.read().decode())
print("ERR:\n", stderr.read().decode())
client.close()
