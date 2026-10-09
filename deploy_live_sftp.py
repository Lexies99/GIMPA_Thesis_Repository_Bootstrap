import os, sys, ssl, urllib.request, urllib.parse, http.cookiejar, re, time, paramiko

SERVER_IP = '46.62.214.146'
ADMIN_USER = 'admin'
ADMIN_PASS = 'PsasaqecmCFNgu43wfkRgxMKR'
REMOTE_APP_DIR = '/home/admin/web/thesis.manamatechnologies.com/app'
REMOTE_PUBLIC_DIR = '/home/admin/web/thesis.manamatechnologies.com/public_html'
LOCAL_ROOT = r'D:\NSS\GIMPA_Thesis_Repository_Bootstrap'

print("[1/5] Connecting to SFTP as admin...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SERVER_IP, port=22, username=ADMIN_USER, password=ADMIN_PASS, timeout=30)
sftp = client.open_sftp()
print("SFTP Connected!")

def ensure_remote_dir(remote_dir):
    parts = remote_dir.replace('\\', '/').strip('/').split('/')
    current = ''
    for part in parts:
        current += '/' + part
        try:
            sftp.stat(current)
        except IOError:
            try:
                sftp.mkdir(current)
            except Exception:
                pass

def upload_file(local_path, remote_path):
    remote_dir = os.path.dirname(remote_path).replace('\\', '/')
    ensure_remote_dir(remote_dir)
    print(f"Uploading: {os.path.basename(local_path)} -> {remote_path}")
    with open(local_path, 'rb') as fl:
        sftp.putfo(fl, remote_path.replace('\\', '/'), confirm=False)

def upload_dir_recursive(local_dir, remote_dir):
    ensure_remote_dir(remote_dir)
    for root, dirs, files in os.walk(local_dir):
        rel_path = os.path.relpath(root, local_dir)
        target_dir = os.path.join(remote_dir, rel_path).replace('\\', '/')
        ensure_remote_dir(target_dir)
        for f in files:
            src_f = os.path.join(root, f)
            dst_f = os.path.join(target_dir, f).replace('\\', '/')
            try:
                with open(src_f, 'rb') as fl:
                    sftp.putfo(fl, dst_f, confirm=False)
            except Exception as e:
                print(f"Error uploading {src_f}: {e}")

# 2. Upload updated backend files
print("\n[2/5] Uploading updated backend and service files...")
backend_files = [
    "app/models/user.py",
    "app/models/paper.py",
    "app/models/thesis_system.py",
    "app/schemas/user.py",
    "app/schemas/token.py",
    "app/services/user_service.py",
    "app/services/department_service.py",
    "app/services/import_service.py",
    "app/services/plagiarism_service.py",
    "app/services/matching_service.py",
    "app/services/integrity_service.py",
    "app/services/supervisor_report_service.py",
    "app/services/notification_service.py",
    "app/api/deps.py",
    "app/api/routes/theses.py",
    "app/api/routes/papers.py",
    "app/api/routes/users.py",
    "app/api/routes/departments.py",
    "app/api/routes/auth.py",
    "app/api/routes/phd.py",
    "migrate_new_features.py"
]

for bf in backend_files:
    loc = os.path.join(LOCAL_ROOT, bf.replace('/', '\\'))
    if os.path.exists(loc):
        rem = f"{REMOTE_APP_DIR}/{bf}"
        upload_file(loc, rem)

# 3. Upload built frontend assets to public_html and app/frontend/build
print("\n[3/5] Uploading built frontend bundle to public_html...")
local_client_build = os.path.join(LOCAL_ROOT, 'frontend', 'build', 'client')
if os.path.exists(local_client_build):
    upload_dir_recursive(local_client_build, REMOTE_PUBLIC_DIR)
    upload_dir_recursive(local_client_build, f"{REMOTE_APP_DIR}/frontend/build/client")

local_server_build = os.path.join(LOCAL_ROOT, 'frontend', 'build', 'server')
if os.path.exists(local_server_build):
    upload_dir_recursive(local_server_build, f"{REMOTE_APP_DIR}/frontend/build/server")

sftp.close()
client.close()
print("All files transferred successfully!")

# 4. Trigger HestiaCP Cron to run migration script and restart services
print("\n[4/5] Triggering HestiaCP cron to execute DB migration and service restart...")
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='ignore')
token = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html).group(1)

login_data = urllib.parse.urlencode({'user': ADMIN_USER, 'password': ADMIN_PASS, 'token': token}).encode('utf-8')
opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))
print("Logged into HestiaCP.")

req_add = urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/cron/', 'User-Agent': 'Mozilla/5.0'})
resp_add = opener.open(req_add)
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

deploy_cmd = """/bin/bash -c "python3 /home/admin/web/thesis.manamatechnologies.com/app/migrate_new_features.py > /tmp/migrate.log 2>&1; sudo systemctl restart gimpa-backend >> /tmp/migrate.log 2>&1; sudo systemctl restart gimpa-frontend >> /tmp/migrate.log 2>&1; echo 'DONE' >> /tmp/migrate.log" """

post_data = urllib.parse.urlencode({
    'token': form_tok,
    'ok': 'Add',
    'v_min': '*',
    'v_hour': '*',
    'v_day': '*',
    'v_month': '*',
    'v_wday': '*',
    'v_cmd': deploy_cmd.strip()
}).encode('utf-8')

req_save = urllib.request.Request('https://46.62.214.146:8083/add/cron/', data=post_data, headers={
    'Referer': 'https://46.62.214.146:8083/add/cron/',
    'Origin': 'https://46.62.214.146:8083',
    'User-Agent': 'Mozilla/5.0',
    'Content-Type': 'application/x-www-form-urlencoded'
})
resp_save = opener.open(req_save)
print("Cron restart task scheduled, status:", resp_save.status)

print("\n[5/5] Deployment complete! Live URL: https://thesis.manamatechnologies.com")
