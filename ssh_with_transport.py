import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Connecting with explicit SSH flags...", flush=True)
try:
    client.connect(
        '46.62.214.146',
        port=22,
        username='admin',
        password='PsasaqecmCFNgu43wfkRgxMKR',
        look_for_keys=False,
        allow_agent=False,
        timeout=60,
        banner_timeout=60,
        auth_timeout=60
    )
    print("SSH CONNECTED!", flush=True)
    stdin, stdout, stderr = client.exec_command('whoami')
    print("User:", stdout.read().decode().strip(), flush=True)
    
    # 1. Clear crontab
    print("Clearing crontab...", flush=True)
    stdin, stdout, stderr = client.exec_command('crontab -r || true')
    print(stdout.read().decode(), flush=True)
    
    # 2. Kill runaway build/node
    print("Killing runaways...", flush=True)
    client.exec_command("pkill -9 -f 'npm run build' || true")
    client.exec_command("pkill -9 -f 'node' || true")
    client.exec_command("pkill -9 -f 'uvicorn' || true")
    
    # 3. Clean restart services
    print("Restarting services...", flush=True)
    stdin, stdout, stderr = client.exec_command("echo PsasaqecmCFNgu43wfkRgxMKR | sudo -S systemctl restart gimpa-backend gimpa-frontend nginx")
    print(stdout.read().decode(), flush=True)
    print(stderr.read().decode(), flush=True)
    
    # 4. Check status
    print("Checking status...", flush=True)
    stdin, stdout, stderr = client.exec_command("echo PsasaqecmCFNgu43wfkRgxMKR | sudo -S systemctl status gimpa-backend gimpa-frontend nginx --no-pager")
    print(stdout.read().decode(), flush=True)
    
    client.close()
    print("ALL DONE!", flush=True)
except Exception as e:
    print("SSH error:", e, flush=True)
