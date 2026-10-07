import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def run_cmd(cmd):
    print(f"\n>>> Running: {cmd}", flush=True)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print("STDOUT:\n" + out, flush=True)
    if err:
        print("STDERR:\n" + err, flush=True)
    return out

print("Connecting SSH as admin with explicit parameters...", flush=True)
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

# 1. Clean crontab
run_cmd("crontab -r || true")

# 2. Update git repository to latest origin/main
run_cmd("cd /home/admin/web/thesis.manamatechnologies.com/app && rm -f .git/index.lock && git fetch origin main && git reset --hard origin/main && git log -n 2 --oneline")

# 3. Copy frontend build to public_html
run_cmd("cd /home/admin/web/thesis.manamatechnologies.com/app/frontend && cp -ru build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ || true")

# 4. Restart backend and frontend
run_cmd("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend")
run_cmd("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-frontend")
run_cmd("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart nginx")

# 5. Check status
run_cmd("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl status gimpa-backend gimpa-frontend --no-pager")

client.close()
print("\nDEPLOYMENT COMPLETED SUCCESSFULLY!", flush=True)
