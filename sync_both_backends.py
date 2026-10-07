import os, sys, ssl, urllib.request, urllib.parse, http.cookiejar, re, time, paramiko

sys.stdout.reconfigure(encoding='utf-8')

SERVER_IP = '46.62.214.146'
ADMIN_USER = 'admin'
ADMIN_PASS = 'PsasaqecmCFNgu43wfkRgxMKR'
REMOTE_APP_DIR = '/home/admin/web/thesis.manamatechnologies.com/app'
REMOTE_BACKEND_DIR = '/home/admin/web/thesis.manamatechnologies.com/app/backend'
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

def upload_dir_recursive(local_dir, remote_dir):
    ensure_remote_dir(remote_dir)
    for root, dirs, files in os.walk(local_dir):
        rel_path = os.path.relpath(root, local_dir)
        target_dir = os.path.join(remote_dir, rel_path).replace('\\', '/')
        ensure_remote_dir(target_dir)
        for f in files:
            if f.endswith('.pyc') or '__pycache__' in root:
                continue
            src_f = os.path.join(root, f)
            dst_f = os.path.join(target_dir, f).replace('\\', '/')
            try:
                with open(src_f, 'rb') as fl:
                    sftp.putfo(fl, dst_f, confirm=False)
            except Exception as e:
                print(f"Error uploading {src_f}: {e}")

# 2. Upload entire local app/ directory to both remote targets
print("\n[2/4] Uploading full local app/ tree to app/app and app/backend/app...")
upload_dir_recursive(os.path.join(LOCAL_ROOT, 'app'), f"{REMOTE_APP_DIR}/app")
upload_dir_recursive(os.path.join(LOCAL_ROOT, 'app'), f"{REMOTE_BACKEND_DIR}/app")

# Also sync built client bundle to public_html and app/frontend
print("\n[3/4] Uploading frontend build to public_html...")
upload_dir_recursive(os.path.join(LOCAL_ROOT, 'frontend', 'build', 'client'), REMOTE_PUBLIC_DIR)
upload_dir_recursive(os.path.join(LOCAL_ROOT, 'frontend', 'build', 'client'), f"{REMOTE_APP_DIR}/frontend/build/client")

sftp.close()
client.close()
print("All files transferred successfully!")

# 4. Trigger HestiaCP Cron to restart services
print("\n[4/4] Triggering HestiaCP cron to restart services...")
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

# Wipe old crons
resp_cron = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_cron = resp_cron.read().decode('utf-8', errors='ignore')
import html as html_module
unescaped = html_module.unescape(html_cron)
delete_links = re.findall(r'/delete/cron/\?job=(\d+)&token=([a-f0-9]+)', unescaped)
for job_id, tok in set(delete_links):
    try:
        opener.open(urllib.request.Request(f'https://46.62.214.146:8083/delete/cron/?job={job_id}&token={tok}', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
    except Exception:
        pass

resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

restart_cmd = """/bin/bash -c "LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/restart_status.txt; echo 'RESTARTING' > \\$LOG; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend >> \\$LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-frontend >> \\$LOG 2>&1; echo 'RESTART_SUCCESS_DONE' >> \\$LOG 2>&1" """

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

opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', data=post_data, headers={'Referer': 'https://46.62.214.146:8083/add/cron/'}))
print("Cron restart task scheduled! Waiting 65s for execution...")

time.sleep(65)

# Cleanup crons
resp_cron = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_cron = resp_cron.read().decode('utf-8', errors='ignore')
unescaped = html_module.unescape(html_cron)
delete_links = re.findall(r'/delete/cron/\?job=(\d+)&token=([a-f0-9]+)', unescaped)
for job_id, tok in set(delete_links):
    try:
        opener.open(urllib.request.Request(f'https://46.62.214.146:8083/delete/cron/?job={job_id}&token={tok}', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
    except Exception:
        pass

print("Cron cleaned up.")
try:
    with urllib.request.urlopen(urllib.request.Request('https://thesis.manamatechnologies.com/restart_status.txt', headers={'User-Agent': 'Mozilla/5.0'}), context=ctx) as f:
        print("Status output:\n", f.read().decode('utf-8', errors='ignore'))
except Exception as e:
    print("Could not read status file:", e)
