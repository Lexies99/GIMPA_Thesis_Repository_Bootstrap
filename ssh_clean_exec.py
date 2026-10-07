import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def run_ssh_cmd(cmd):
    print(f"\n>>> Running: {cmd}", flush=True)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    stdin.close()  # Close stdin so the remote process does not hang waiting for input
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print("STDOUT:\n" + out, flush=True)
    if err:
        print("STDERR:\n" + err, flush=True)
    return out

print("Connecting SSH...", flush=True)
try:
    client.connect(
        '46.62.214.146',
        port=22,
        username='admin',
        password='PsasaqecmCFNgu43wfkRgxMKR',
        look_for_keys=False,
        allow_agent=False,
        timeout=30,
        banner_timeout=30,
        auth_timeout=30
    )
    print("SSH CONNECTED!", flush=True)
    
    run_ssh_cmd('whoami')
    run_ssh_cmd('crontab -r || true')
    run_ssh_cmd("pkill -9 -f 'npm run build' || true")
    run_ssh_cmd("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend")
    run_ssh_cmd("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-frontend")
    run_ssh_cmd("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart nginx")
    run_ssh_cmd("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl status gimpa-backend gimpa-frontend nginx --no-pager")
    
    client.close()
    print("\nEXECUTION FINISHED CLEANLY!", flush=True)
except Exception as e:
    print("SSH execution error:", e, flush=True)
