import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

cmd = 'sed -n "160,240p" /home/admin/web/libraryapp.manamatechnologies.com/public_html/backend/main.py'
stdin, stdout, stderr = client.exec_command(cmd)
print('=== LIBRARY APP LOGIN CODE ===')
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
