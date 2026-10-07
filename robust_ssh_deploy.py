import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

def attempt_deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print("Connecting to 46.62.214.146:22 as admin...", flush=True)
    client.connect(
        '46.62.214.146',
        port=22,
        username='admin',
        password='PsasaqecmCFNgu43wfkRgxMKR',
        look_for_keys=False,
        allow_agent=False,
        timeout=45,
        banner_timeout=45,
        auth_timeout=45
    )
    print("SSH CONNECTED!", flush=True)
    
    def exec_c(cmd):
        print(f"\n>>> Running: {cmd}", flush=True)
        stdin, stdout, stderr = client.exec_command(cmd, timeout=45)
        stdin.close()
        out = stdout.read().decode('utf-8', errors='ignore')
        err = stderr.read().decode('utf-8', errors='ignore')
        if out:
            print("STDOUT:\n" + out, flush=True)
        if err:
            print("STDERR:\n" + err, flush=True)
        return out
        
    exec_c("crontab -r 2>/dev/null || true")
    exec_c("pkill -9 -f 'npm run build' 2>/dev/null || true")
    exec_c("cd /home/admin/web/thesis.manamatechnologies.com/app && rm -f .git/index.lock && git fetch origin main && git reset --hard origin/main && git log -n 2 --oneline")
    exec_c("cd /home/admin/web/thesis.manamatechnologies.com/app/frontend && cp -ru build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ 2>/dev/null || true")
    exec_c("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend gimpa-frontend nginx")
    exec_c("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl status gimpa-backend gimpa-frontend --no-pager")
    
    client.close()
    print("\nSUCCESSFULLY DEPLOYED AND RESTARTED SERVICES!", flush=True)
    return True

for attempt in range(1, 6):
    print(f"\n=== ATTEMPT {attempt}/5 ===", flush=True)
    try:
        if attempt_deploy():
            break
    except Exception as e:
        print(f"Attempt {attempt} failed: {e}", flush=True)
        time.sleep(5)
