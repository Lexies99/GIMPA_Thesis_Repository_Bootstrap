import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=20)

inspect_script = """
import os
for env_path in [
    '/home/admin/web/thesis.manamatechnologies.com/app/.env',
    '/home/admin/web/thesis.manamatechnologies.com/app/backend/.env',
    '/home/admin/web/thesis.manamatechnologies.com/app/data/.env'
]:
    if os.path.exists(env_path):
        print(f"=== {env_path} ===")
        with open(env_path) as f:
            for line in f:
                if any(k in line.upper() for k in ['SMTP', 'MAIL', 'EMAIL']):
                    # Mask password
                    if 'PASS' in line.upper():
                        key, _, _ = line.partition('=')
                        print(f"{key}=********")
                    else:
                        print(line.strip())
"""

sftp = client.open_sftp()
with sftp.file('/tmp/check_smtp.py', 'w') as f:
    f.write(inspect_script)
sftp.close()

stdin, stdout, stderr = client.exec_command("/home/admin/web/thesis.manamatechnologies.com/app/venv/bin/python3 /tmp/check_smtp.py")
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
client.close()
