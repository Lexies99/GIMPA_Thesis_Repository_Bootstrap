import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("46.62.214.146", username="root", password="ANCugiE4jL3q")

sftp = client.open_sftp()
with sftp.open('/tmp/get_admin_hash.py', 'w') as f:
    f.write('''
import sqlite3
conn = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db')
c = conn.cursor()
row = c.execute("SELECT hashed_password FROM users WHERE email='admin@gimpa.edu.gh'").fetchone()
admin_hash = row[0]
print("Admin hash:", admin_hash)
# Set all test accounts to this same hash so we can log in with Password123! or whatever admin uses
c.execute("UPDATE users SET hashed_password=? WHERE email IN ('phd.candidate@st.gimpa.edu.gh', 'josbudu@gimpa.edu.gh', 'eadaku@gimpa.edu.gh', 'kofi.mensah@gimpa.edu.gh', 'kwame.boadu@adj.gimpa.edu.gh', 'yaw.asante@gimpa.edu.gh', 'fapboadu@gimpa.edu.gh', 'john.smith@st.gimpa.edu.gh')", (admin_hash,))
conn.commit()
print("Updated test users with valid hash.")
conn.close()
''')
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/get_admin_hash.py')
print("OUT:\n", stdout.read().decode())
print("ERR:\n", stderr.read().decode())
client.close()
