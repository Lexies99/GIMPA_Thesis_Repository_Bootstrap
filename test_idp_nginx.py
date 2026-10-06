import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=15)

conf = '''location ^~ /idp/ {
    proxy_pass http://127.0.0.1:8020/;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
'''

sftp = client.open_sftp()
with sftp.file('/home/admin/conf/web/thesis.manamatechnologies.com/nginx.ssl.conf_idp', 'w') as f:
    f.write(conf)
with sftp.file('/home/admin/conf/web/thesis.manamatechnologies.com/nginx.conf_idp', 'w') as f:
    f.write(conf)
sftp.close()

stdin, stdout, stderr = client.exec_command('nginx -t && systemctl reload nginx')
print('Nginx reload:', stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = client.exec_command('curl -s -k -L https://thesis.manamatechnologies.com/idp/api/v1/health')
print('Health test:', stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = client.exec_command('curl -s -k -L https://thesis.manamatechnologies.com/idp/')
print('Root test:', stdout.read().decode('utf-8', errors='replace'))

client.close()
