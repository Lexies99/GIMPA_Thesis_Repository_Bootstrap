import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=15)

# Check libraryapp backend login logic
stdin, stdout, stderr = client.exec_command('sed -n "110,180p" /home/admin/web/libraryapp.manamatechnologies.com/public_html/backend/main.py')
print('=== LIBRARY APP LOGIN ===')
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
