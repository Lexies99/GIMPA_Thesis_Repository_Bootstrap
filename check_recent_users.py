import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

cmd = """python3 -c "
import sqlite3
for dbpath in ['/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db', '/home/admin/web/thesis.manamatechnologies.com/app/backend/gimpa_thesis.db', '/home/admin/web/thesis.manamatechnologies.com/app/data/gimpa_thesis.db']:
    try:
        conn = sqlite3.connect(dbpath)
        c = conn.cursor()
        c.execute('SELECT id, email, full_name, role, created_at FROM users ORDER BY id DESC LIMIT 5')
        rows = c.fetchall()
        print('DB:', dbpath)
        for r in rows:
            print(' ', r)
    except Exception as e:
        pass
" """
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
client.close()
