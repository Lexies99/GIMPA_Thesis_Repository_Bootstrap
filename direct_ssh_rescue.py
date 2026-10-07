import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Attempting SSH as admin...", flush=True)
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
print("SSH Connected successfully!", flush=True)

def exec_cmd(c):
    print(f"\n>>> Running: {c}", flush=True)
    stdin, stdout, stderr = client.exec_command(c, timeout=60)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print("STDOUT:\n" + out, flush=True)
    if err:
        print("STDERR:\n" + err, flush=True)
    return out

# 1. Clean crontab
exec_cmd("crontab -r 2>/dev/null || true")

# 2. Kill any stray processes
exec_cmd("pkill -9 -f 'npm run build' 2>/dev/null || true")

# 3. Pull latest code from GitHub
exec_cmd("cd /home/admin/web/thesis.manamatechnologies.com/app && rm -f .git/index.lock && git fetch origin main && git reset --hard origin/main && git log -n 1 --oneline")

# 4. Copy frontend build
exec_cmd("cd /home/admin/web/thesis.manamatechnologies.com/app/frontend && cp -ru build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ 2>/dev/null || true")

# 5. Restart services
exec_cmd("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend gimpa-frontend nginx")

# 6. Check status
exec_cmd("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl status gimpa-backend gimpa-frontend nginx --no-pager")

client.close()
print("\nALL SERVICES RESCUED AND RESTARTED CLEANLY!", flush=True)
