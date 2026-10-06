import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=30)
stdin, stdout, stderr = client.exec_command(
    'sudo -u postgres psql -d thesis -t -c "SELECT id, email, full_name, role, roles, department, school FROM users WHERE role IN (\'system_admin\', \'project_coordinator\', \'hod\') OR email LIKE \'%admin%\';"'
)

out = stdout.read().decode('utf-8')
err = stderr.read().decode('utf-8')
print('STDOUT:\n', out)
print('STDERR:\n', err)
client.close()
