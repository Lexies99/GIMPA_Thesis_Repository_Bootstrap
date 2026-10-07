import os, sys, ssl, urllib.request, urllib.parse, http.cookiejar, re, time, paramiko

SERVER_IP = '46.62.214.146'
ADMIN_USER = 'admin'
ADMIN_PASS = 'PsasaqecmCFNgu43wfkRgxMKR'
REMOTE_APP_DIR = '/home/admin/web/thesis.manamatechnologies.com/app'
REMOTE_PUBLIC_DIR = '/home/admin/web/thesis.manamatechnologies.com/public_html'
LOCAL_ROOT = r'D:\NSS\GIMPA_Thesis_Repository_Bootstrap'

print("[1/4] Connecting to SFTP as admin...")
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

# 2. Upload built client and server bundles
print("\n[2/4] Uploading fresh built frontend bundles...")
local_client_build = os.path.join(LOCAL_ROOT, 'frontend', 'build', 'client')
if os.path.exists(local_client_build):
    upload_dir_recursive(local_client_build, REMOTE_PUBLIC_DIR)
    upload_dir_recursive(local_client_build, f"{REMOTE_APP_DIR}/frontend/build/client")

local_server_build = os.path.join(LOCAL_ROOT, 'frontend', 'build', 'server')
if os.path.exists(local_server_build):
    upload_dir_recursive(local_server_build, f"{REMOTE_APP_DIR}/frontend/build/server")

# Also upload package.json and frontend components
frontend_src_files = [
    "frontend/app/components/library/AccountManagement.tsx",
    "frontend/app/components/library/DocumentUpload.tsx",
    "frontend/app/components/library/Dashboard.tsx",
    "frontend/app/lib/api.ts",
]
for fsf in frontend_src_files:
    loc = os.path.join(LOCAL_ROOT, fsf.replace('/', '\\'))
    if os.path.exists(loc):
        upload_file(loc, f"{REMOTE_APP_DIR}/{fsf}")

sftp.close()
client.close()
print("All files transferred successfully!")

# 3. Trigger restart of node server on port 9011 via HestiaCP
print("\n[3/4] Triggering service reload on server...")
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

resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/cron/', 'User-Agent': 'Mozilla/5.0'}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

# Kill old frontend node process and restart with port 9011
restart_cmd = """/bin/bash -c "LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/restart_status.log; echo 'RESTARTING_NODE_PORT_9011' > $LOG; pkill -9 -f 'react-router-serve' >> $LOG 2>&1; pkill -9 -f 'node.*9011' >> $LOG 2>&1; cd /home/admin/web/thesis.manamatechnologies.com/app/frontend >> $LOG 2>&1; PORT=9011 nohup npx react-router-serve ./build/server/index.js --port 9011 > /tmp/frontend_9011.log 2>&1 & echo 'NODE_9011_RELOADED_OK' >> $LOG 2>&1" """

post_data = urllib.parse.urlencode({
    'token': form_tok,
    'ok': 'Add',
    'v_min': '*',
    'v_hour': '*',
    'v_day': '*',
    'v_month': '*',
    'v_wday': '*',
    'v_cmd': restart_cmd.strip()
}).encode('utf-8')

req_save = urllib.request.Request('https://46.62.214.146:8083/add/cron/', data=post_data, headers={
    'Referer': 'https://46.62.214.146:8083/add/cron/',
    'Origin': 'https://46.62.214.146:8083',
    'User-Agent': 'Mozilla/5.0',
    'Content-Type': 'application/x-www-form-urlencoded'
})
resp_save = opener.open(req_save)
print("Cron reload task scheduled, status:", resp_save.status)

print("\n[4/4] Deployment complete! Live URL: https://thesis.manamatechnologies.com")
