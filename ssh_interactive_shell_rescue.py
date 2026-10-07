import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

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
    timeout=30,
    banner_timeout=30,
    auth_timeout=30
)
print("SSH Connected! Opening interactive shell...", flush=True)

chan = client.invoke_shell(term='vt100', width=120, height=40)
time.sleep(2)

def send_and_wait(cmd, wait_sec=5):
    print(f"\n>>> Sending: {cmd}", flush=True)
    chan.send(cmd + "\n")
    time.sleep(wait_sec)
    buf = ""
    while chan.recv_ready():
        buf += chan.recv(4096).decode('utf-8', errors='ignore')
    print("OUTPUT:\n" + buf, flush=True)
    return buf

send_and_wait("whoami", 2)
send_and_wait("crontab -r", 2)
send_and_wait("pkill -9 -f 'npm run build'", 2)
send_and_wait("cd /home/admin/web/thesis.manamatechnologies.com/app && rm -f .git/index.lock && git fetch origin main && git reset --hard origin/main && git log -n 1 --oneline", 5)
send_and_wait("cd /home/admin/web/thesis.manamatechnologies.com/app/frontend && cp -ru build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ 2>/dev/null || true", 3)
send_and_wait("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend gimpa-frontend nginx", 5)
send_and_wait("echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl status gimpa-backend gimpa-frontend --no-pager", 3)

chan.close()
client.close()
print("\nALL RESCUE COMMANDS EXECUTED VIA INTERACTIVE SHELL!", flush=True)
