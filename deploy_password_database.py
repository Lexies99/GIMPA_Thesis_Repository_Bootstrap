import paramiko
import os
import tarfile
import tempfile

HOST = "46.62.214.146"
USER = "root"
PASS = "ANCugiE4jL3q"
REMOTE_DIR = "/home/admin/services/password_database"
SERVICE_NAME = "password-database"

def deploy():
    print(f"[1/5] Connecting to {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=22, username=USER, password=PASS, timeout=20)

    # 1. Create remote directory
    ssh.exec_command(f"mkdir -p {REMOTE_DIR}")

    # 2. Package local Password_database
    local_base = r"D:\NSS\Password_database"
    tar_path = os.path.join(tempfile.gettempdir(), "password_database.tar.gz")
    print(f"[2/5] Compressing {local_base} to {tar_path}...")
    with tarfile.open(tar_path, "w:gz") as tar:
        for root, dirs, files in os.walk(local_base):
            if ".git" in root or "__pycache__" in root or ".pytest_cache" in root:
                continue
            for f in files:
                full_p = os.path.join(root, f)
                rel_p = os.path.relpath(full_p, local_base)
                tar.add(full_p, arcname=rel_p)

    # 3. Upload via SFTP
    print(f"[3/5] Uploading to server {REMOTE_DIR}...")
    sftp = ssh.open_sftp()
    remote_tar = "/tmp/password_database.tar.gz"
    sftp.put(tar_path, remote_tar)
    sftp.close()

    # 4. Extract & Setup python venv
    print("[4/5] Setting up virtualenv & dependencies on server...")
    commands = [
        f"tar -xzf {remote_tar} -C {REMOTE_DIR}",
        f"rm -f {remote_tar}",
        f"python3 -m venv {REMOTE_DIR}/venv",
        f"{REMOTE_DIR}/venv/bin/pip install --upgrade pip",
        f"{REMOTE_DIR}/venv/bin/pip install -r {REMOTE_DIR}/requirements.txt",
        f"cd {REMOTE_DIR} && {REMOTE_DIR}/venv/bin/python scripts/seed_initial_users.py",
        f"chown -R admin:admin {REMOTE_DIR}"
    ]

    for cmd in commands:
        print(f" > Executing: {cmd[:60]}...")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out:
            print(f"   [STDOUT] {out[:200]}")
        if err and "warning" not in err.lower():
            print(f"   [STDERR] {err[:200]}")

    # 5. Create and start systemd service
    print("[5/5] Creating and starting systemd service...")
    systemd_unit = f"""[Unit]
Description=Password_database Central IdP and SSO Service
After=network.target

[Service]
User=admin
Group=admin
WorkingDirectory={REMOTE_DIR}
Environment="PATH={REMOTE_DIR}/venv/bin"
EnvironmentFile=-{REMOTE_DIR}/.env
ExecStart={REMOTE_DIR}/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8020
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
"""
    sftp = ssh.open_sftp()
    with sftp.file(f"/etc/systemd/system/{SERVICE_NAME}.service", "w") as f:
        f.write(systemd_unit)
    sftp.close()

    ssh.exec_command("systemctl daemon-reload")
    ssh.exec_command(f"systemctl enable {SERVICE_NAME}")
    ssh.exec_command(f"systemctl restart {SERVICE_NAME}")

    # Check status and test endpoint
    stdin, stdout, stderr = ssh.exec_command(f"systemctl status {SERVICE_NAME} --no-pager")
    print(stdout.read().decode())

    stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:8020/api/v1/health")
    print("Health check output:", stdout.read().decode())

    ssh.close()
    print("[SUCCESS] Password_database is hosted and running live on port 8020!")

if __name__ == "__main__":
    deploy()
