import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

sftp = client.open_sftp()
local_path = r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\app\services\user_service.py"
remote_path = "/home/admin/web/thesis.manamatechnologies.com/app/app/services/user_service.py"
sftp.put(local_path, remote_path)
sftp.close()
print("Uploaded user_service.py to remote server.")

stdin, stdout, stderr = client.exec_command("systemctl restart gimpa-backend")
print("Restarted gimpa-backend.")

stdin, stdout, stderr = client.exec_command("systemctl status gimpa-backend --no-pager")
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
