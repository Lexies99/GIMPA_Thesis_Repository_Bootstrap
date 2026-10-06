import sys, os, sqlite3, paramiko

sys.stdout.reconfigure(encoding='utf-8')

SERVER_IP = '46.62.214.146'
SERVER_USER = 'root'
SERVER_PASS = 'ANCugiE4jL3q'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SERVER_IP, port=22, username=SERVER_USER, password=SERVER_PASS, timeout=30)
sftp = client.open_sftp()

print("[1/6] Remote database migration...")
migration_sql = """
import sqlite3

db_path = '/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

def add_col_if_missing(table, col, col_type):
    c.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in c.fetchall()]
    if col not in cols:
        print(f"Adding {col} to {table}...")
        c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")

add_col_if_missing('users', 'specialization', "TEXT DEFAULT ''")
add_col_if_missing('users', 'research_interests', "TEXT DEFAULT ''")
add_col_if_missing('users', 'max_student_ceiling', "INTEGER DEFAULT 5")

add_col_if_missing('papers', 'plagiarism_score', "REAL DEFAULT 0.0")
add_col_if_missing('papers', 'plagiarism_status', "TEXT DEFAULT 'clean'")
add_col_if_missing('papers', 'plagiarism_report_json', "TEXT DEFAULT NULL")
add_col_if_missing('papers', 'plagiarism_checked_at', "TEXT DEFAULT NULL")

conn.commit()
conn.close()
print("Remote DB schema migration completed.")
"""

stdin, stdout, stderr = client.exec_command(f"python3 -c \"{migration_sql}\"")
print(stdout.read().decode('utf-8', errors='replace'))
err = stderr.read().decode('utf-8', errors='replace')
if err:
    print("Migration err:", err)

print("[2/6] Uploading backend service and route files...")
backend_files = [
    ("app/services/plagiarism_service.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/services/plagiarism_service.py"),
    ("app/services/matching_service.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/services/matching_service.py"),
    ("app/services/integrity_service.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/services/integrity_service.py"),
    ("app/services/supervisor_report_service.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/services/supervisor_report_service.py"),
    ("app/models/user.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/models/user.py"),
    ("app/models/paper.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/models/paper.py"),
    ("app/models/thesis_system.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/models/thesis_system.py"),
    ("app/api/deps.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/api/deps.py"),
    ("app/api/routes/theses.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/api/routes/theses.py"),
    ("app/api/routes/papers.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/api/routes/papers.py"),
    ("app/api/routes/auth.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/api/routes/auth.py"),
    ("app/api/routes/users.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/api/routes/users.py"),
    ("app/api/routes/phd.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/api/routes/phd.py"),
    ("app/schemas/user.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/schemas/user.py"),
    ("app/schemas/token.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/schemas/token.py"),
    ("app/services/notification_service.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/services/notification_service.py"),
    ("app/services/user_service.py", "/home/admin/web/thesis.manamatechnologies.com/app/app/services/user_service.py"),
]

local_root = r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap"
for rel_src, rem_dst in backend_files:
    loc = os.path.join(local_root, rel_src.replace('/', '\\'))
    print(f"  Uploading {rel_src} -> {rem_dst}")
    sftp.put(loc, rem_dst)

print("[3/6] Uploading frontend files...")
frontend_files = [
    ("frontend/app/lib/api.ts", "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/lib/api.ts"),
    ("frontend/app/context/AuthContext.tsx", "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/context/AuthContext.tsx"),
    ("frontend/app/routes/home.tsx", "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/routes/home.tsx"),
    ("frontend/app/routes/submit-proposal.tsx", "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/routes/submit-proposal.tsx"),
    ("frontend/app/components/library/Dashboard.tsx", "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/components/library/Dashboard.tsx"),
    ("frontend/app/components/library/ApprovalWorkflow.tsx", "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/components/library/ApprovalWorkflow.tsx"),
    ("frontend/app/components/library/PhdHub.tsx", "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/components/library/PhdHub.tsx"),
    ("frontend/app/components/library/AccountManagement.tsx", "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/components/library/AccountManagement.tsx"),
]

for rel_src, rem_dst in frontend_files:
    loc = os.path.join(local_root, rel_src.replace('/', '\\'))
    print(f"  Uploading {rel_src} -> {rem_dst}")
    sftp.put(loc, rem_dst)

sftp.close()

print("[4/6] Restarting gimpa-backend...")
stdin, stdout, stderr = client.exec_command("systemctl restart gimpa-backend")
stdout.channel.recv_exit_status()
stdin, stdout, stderr = client.exec_command("systemctl status gimpa-backend --no-pager")
print(stdout.read().decode('utf-8', errors='replace')[:300])

print("[5/6] Building frontend on server & syncing client bundle...")
stdin, stdout, stderr = client.exec_command("cd /home/admin/web/thesis.manamatechnologies.com/app/frontend && npm run build")
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("Remote build log:")
for line in out.splitlines()[-10:]:
    print("  ", line)

cmd_sync = (
    "cp -ru /home/admin/web/thesis.manamatechnologies.com/app/frontend/build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ && "
    "chown -R admin:admin /home/admin/web/thesis.manamatechnologies.com/public_html /home/admin/web/thesis.manamatechnologies.com/app/frontend/build && "
    "systemctl restart gimpa-frontend"
)
stdin, stdout, stderr = client.exec_command(cmd_sync)
stdout.channel.recv_exit_status()

print("[6/6] Checking system status...")
stdin, stdout, stderr = client.exec_command("systemctl status gimpa-frontend --no-pager")
print(stdout.read().decode('utf-8', errors='replace')[:300])

client.close()
print("All features deployed successfully!")
