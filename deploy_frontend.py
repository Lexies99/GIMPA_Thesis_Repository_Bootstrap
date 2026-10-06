import sys, paramiko

sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=30)

sftp = client.open_sftp()

print("[1/5] Uploading backend & frontend files...")
sftp.put(
    r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\app\schemas\user.py",
    "/home/admin/web/thesis.manamatechnologies.com/app/app/schemas/user.py"
)
sftp.put(
    r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\app\api\routes\users.py",
    "/home/admin/web/thesis.manamatechnologies.com/app/app/api/routes/users.py"
)
sftp.put(
    r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\frontend\app\lib\api.ts",
    "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/lib/api.ts"
)
sftp.put(
    r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\frontend\app\context\AuthContext.tsx",
    "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/context/AuthContext.tsx"
)
sftp.put(
    r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\frontend\app\routes\home.tsx",
    "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/routes/home.tsx"
)
sftp.put(
    r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\frontend\app\components\library\ApprovalWorkflow.tsx",
    "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/components/library/ApprovalWorkflow.tsx"
)
sftp.put(
    r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\frontend\app\components\library\Dashboard.tsx",
    "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/components/library/Dashboard.tsx"
)
sftp.put(
    r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\app\api\routes\phd.py",
    "/home/admin/web/thesis.manamatechnologies.com/app/app/api/routes/phd.py"
)
sftp.put(
    r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\app\services\notification_service.py",
    "/home/admin/web/thesis.manamatechnologies.com/app/app/services/notification_service.py"
)
sftp.put(
    r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap\frontend\app\components\library\PhdHub.tsx",
    "/home/admin/web/thesis.manamatechnologies.com/app/frontend/app/components/library/PhdHub.tsx"
)
sftp.close()
print("Uploaded all updated backend and frontend files.")

print("[2/5] Restarting gimpa-backend...")
stdin, stdout, stderr = client.exec_command("systemctl restart gimpa-backend")
print("Restarted gimpa-backend.")

print("[3/5] Running npm run build on remote server...")
stdin, stdout, stderr = client.exec_command(
    "cd /home/admin/web/thesis.manamatechnologies.com/app/frontend && npm run build"
)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("Build output:\n", out)
if err and "warning" not in err.lower():
    print("Build err:\n", err)

print("[3/5] Syncing build/client to public_html...")
cmd_sync = (
    "cp -ru /home/admin/web/thesis.manamatechnologies.com/app/frontend/build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ && "
    "chown -R admin:admin /home/admin/web/thesis.manamatechnologies.com/public_html /home/admin/web/thesis.manamatechnologies.com/app/frontend/build"
)
stdin, stdout, stderr = client.exec_command(cmd_sync)
print(stdout.read().decode('utf-8', errors='replace'))

print("[4/5] Restarting gimpa-frontend...")
stdin, stdout, stderr = client.exec_command("systemctl restart gimpa-frontend")
print("Restarted gimpa-frontend.")

print("[5/5] Checking status...")
stdin, stdout, stderr = client.exec_command("systemctl status gimpa-frontend --no-pager")
print(stdout.read().decode('utf-8', errors='replace')[:400])

client.close()
print("Done!")
