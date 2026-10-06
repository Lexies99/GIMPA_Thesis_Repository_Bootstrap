import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=15)

# Check how nginx includes custom configs for thesis
cmd = 'grep -rn "nginx.ssl.conf_" /etc/nginx/ /home/admin/conf/web/'
stdin, stdout, stderr = client.exec_command(cmd)
print('Includes found:\n', stdout.read().decode('utf-8', errors='replace'))

cmd2 = 'cat /etc/nginx/conf.d/domains/thesis.manamatechnologies.com.ssl.conf | grep -A 10 "include "'
stdin, stdout, stderr = client.exec_command(cmd2)
print('SSL Conf includes:\n', stdout.read().decode('utf-8', errors='replace'))

client.close()
