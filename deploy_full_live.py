import paramiko
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Connecting as ROOT...", flush=True)
client.connect(
    '46.62.214.146',
    port=22,
    username='root',
    password='ANCugiE4jL3q',
    look_for_keys=False,
    allow_agent=False,
    timeout=20,
    banner_timeout=30,
    auth_timeout=30
)
print("ROOT SSH CONNECTED!", flush=True)

def run_root(cmd, timeout=60):
    print(f"\n# {cmd}", flush=True)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    stdin.close()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print("OUT:\n" + out, flush=True)
    if err:
        print("ERR:\n" + err, flush=True)
    return out

# 1. Fetch latest git code
run_root("cd /home/admin/web/thesis.manamatechnologies.com/app && rm -f .git/index.lock && git fetch origin main && git reset --hard origin/main && git log -n 1 --oneline")

# 2. Build frontend on remote server
print("Building frontend on remote server...", flush=True)
run_root("cd /home/admin/web/thesis.manamatechnologies.com/app/frontend && npm run build", timeout=120)

# 3. Copy built client assets to public_html and ensure correct ownership
run_root("cp -r /home/admin/web/thesis.manamatechnologies.com/app/frontend/build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/")
run_root("chown -R admin:admin /home/admin/web/thesis.manamatechnologies.com/public_html /home/admin/web/thesis.manamatechnologies.com/app")

# 4. Restart backend, frontend, and nginx
run_root("systemctl restart gimpa-backend gimpa-frontend nginx")

# 5. Check status
run_root("systemctl status gimpa-backend gimpa-frontend nginx --no-pager")

client.close()
print("\n>>> LIVE DEPLOYMENT AND SERVICE RESTART SUCCESSFUL! <<<", flush=True)
