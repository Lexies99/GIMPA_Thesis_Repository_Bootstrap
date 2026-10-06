import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("46.62.214.146", username="root", password="ANCugiE4jL3q")

sftp = client.open_sftp()
with sftp.open('/tmp/clear_must_change.py', 'w') as f:
    f.write('''
import sqlite3
conn = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db')
c = conn.cursor()
c.execute("UPDATE users SET must_change_password=0")
# Also clean up secondary role 'dean' from josbudu (id 117) so josbudu is purely a lecturer/supervisor
c.execute("DELETE FROM user_roles WHERE user_id=117 AND role='dean'")
conn.commit()
print("All must_change_password set to 0. Cleaned up josbudu secondary role.")
conn.close()
''')
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/clear_must_change.py')
print("OUT:\n", stdout.read().decode())
print("ERR:\n", stderr.read().decode())
client.close()
