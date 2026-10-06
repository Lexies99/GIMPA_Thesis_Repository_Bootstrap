import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("46.62.214.146", username="root", password="ANCugiE4jL3q")

stdin, stdout, stderr = client.exec_command('''python3 -c "
import sqlite3, json
conn = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db')
c = conn.cursor()
roles = c.execute(\\"SELECT u.id, u.email, u.role, ur.role FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id WHERE u.email IN ('josbudu@gimpa.edu.gh', 'fapboadu@gimpa.edu.gh')\\").fetchall()
print('USER_ROLES =', json.dumps(roles))
" ''')
print(stdout.read().decode())
client.close()
