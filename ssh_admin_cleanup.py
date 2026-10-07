import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print('Attempting SSH as admin...', flush=True)
try:
    client.connect('46.62.214.146', port=22, username='admin', password='PsasaqecmCFNgu43wfkRgxMKR', timeout=15, banner_timeout=30)
    print('SSH as admin CONNECTED!', flush=True)
    
    stdin, stdout, stderr = client.exec_command('whoami')
    print('User:', stdout.read().decode('utf-8').strip(), flush=True)
    
    cmds = [
        "crontab -r || true",
        "pkill -9 -f 'npm run build' || true",
        "pkill -9 -f 'node' || true",
        "pkill -9 -f 'uvicorn' || true",
        "echo PsasaqecmCFNgu43wfkRgxMKR | sudo -S systemctl restart gimpa-backend",
        "echo PsasaqecmCFNgu43wfkRgxMKR | sudo -S systemctl restart gimpa-frontend",
        "echo PsasaqecmCFNgu43wfkRgxMKR | sudo -S systemctl restart nginx",
        "echo PsasaqecmCFNgu43wfkRgxMKR | sudo -S systemctl status gimpa-backend gimpa-frontend nginx --no-pager"
    ]
    for c in cmds:
        print(f"\n--- Running: {c} ---", flush=True)
        stdin, stdout, stderr = client.exec_command(c)
        print("STDOUT:\n" + stdout.read().decode('utf-8', errors='ignore'), flush=True)
        print("STDERR:\n" + stderr.read().decode('utf-8', errors='ignore'), flush=True)
        
    client.close()
    print("\nALL PROCESSES CLEANED AND RESTARTED!", flush=True)
except Exception as e:
    print("SSH admin error:", e, flush=True)
