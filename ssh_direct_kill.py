import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Connecting to SSH with extended banner timeout...", flush=True)
try:
    client.connect(
        '46.62.214.146',
        port=22,
        username='root',
        password='ANCugiE4jL3q',
        timeout=30,
        banner_timeout=60,
        auth_timeout=30
    )
    print("SSH root CONNECTED successfully!", flush=True)
    
    # 1. Kill any runaway build/npm/node/uvicorn processes
    cmds = [
        "killall -9 npm node 2>/dev/null || true",
        "rm -f /var/spool/cron/crontabs/admin",
        "crontab -r -u admin 2>/dev/null || true",
        "systemctl restart cron",
        "systemctl restart gimpa-backend",
        "systemctl restart gimpa-frontend",
        "systemctl restart nginx",
        "systemctl restart hestia",
        "systemctl status gimpa-backend gimpa-frontend nginx --no-pager"
    ]
    for c in cmds:
        print(f"\n--- Running: {c} ---", flush=True)
        stdin, stdout, stderr = client.exec_command(c)
        print("STDOUT:", stdout.read().decode('utf-8', errors='ignore'), flush=True)
        print("STDERR:", stderr.read().decode('utf-8', errors='ignore'), flush=True)
        
    client.close()
    print("\nALL CLEANED AND RESTARTED CLEANLY!", flush=True)
except Exception as e:
    print("SSH connection error:", e, flush=True)
