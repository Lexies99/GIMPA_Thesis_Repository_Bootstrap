import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Connecting as ROOT...", flush=True)
try:
    client.connect(
        '46.62.214.146',
        port=22,
        username='root',
        password='ANCugiE4jL3q',
        look_for_keys=False,
        allow_agent=False,
        timeout=15,
        banner_timeout=30,
        auth_timeout=30
    )
    print("ROOT SSH CONNECTED!", flush=True)
    
    def run_root(cmd):
        print(f"\n# {cmd}", flush=True)
        stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
        stdin.close()
        out = stdout.read().decode('utf-8', errors='ignore')
        err = stderr.read().decode('utf-8', errors='ignore')
        if out:
            print("OUT:\n" + out, flush=True)
        if err:
            print("ERR:\n" + err, flush=True)
        return out

    run_root("whoami")
    run_root("crontab -r -u admin 2>/dev/null || true")
    run_root("pkill -9 -f 'npm run build' 2>/dev/null || true")
    run_root("cd /home/admin/web/thesis.manamatechnologies.com/app && rm -f .git/index.lock && git fetch origin main && git reset --hard origin/main && git log -n 1 --oneline")
    run_root("cd /home/admin/web/thesis.manamatechnologies.com/app/frontend && cp -ru build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ 2>/dev/null || true")
    run_root("systemctl restart gimpa-backend gimpa-frontend nginx")
    run_root("systemctl status gimpa-backend gimpa-frontend nginx --no-pager")
    
    client.close()
    print("\nROOT DEPLOY AND RESTART COMPLETE!", flush=True)
except Exception as e:
    print("Root SSH Error:", e, flush=True)
