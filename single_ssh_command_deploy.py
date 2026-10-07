import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

cmd = "bash -c \"crontab -r 2>/dev/null || true; cd /home/admin/web/thesis.manamatechnologies.com/app && rm -f .git/index.lock && git fetch origin main && git reset --hard origin/main && git log -n 1 --oneline && cd frontend && npm run build && cp -rf build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ && echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend gimpa-frontend nginx && echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl status gimpa-frontend --no-pager\""

def run_once():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Connecting SSH...", flush=True)
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
    print("Connected! Executing single combined deploy command...", flush=True)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    stdin.close()
    
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    print("OUTPUT:\n" + out, flush=True)
    if err:
        print("ERRORS:\n" + err, flush=True)
        
    client.close()
    print("SSH session closed cleanly.", flush=True)
    return True

for i in range(1, 4):
    print(f"\n--- TRY {i} ---", flush=True)
    try:
        if run_once():
            print("\nDEPLOYMENT AND RESTART SUCCESSFUL!", flush=True)
            break
    except Exception as e:
        print(f"Try {i} error: {e}", flush=True)
        time.sleep(3)
