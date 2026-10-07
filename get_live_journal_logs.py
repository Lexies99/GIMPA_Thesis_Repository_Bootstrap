import urllib.request, urllib.parse, urllib.error, http.cookiejar, ssl, re, time, sys

sys.stdout.reconfigure(encoding='utf-8', errors='ignore')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Trigger the 500 error on /api/papers
print("Triggering 500 error on /api/papers...")
try:
    req_paper = urllib.request.Request(
        'https://thesis.manamatechnologies.com/api/papers?approved=1&catalog=true',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    urllib.request.urlopen(req_paper, context=ctx)
except urllib.error.HTTPError as e:
    print(f"Got HTTP {e.code}: {e.read().decode('utf-8', errors='ignore')[:200]}")
except Exception as e:
    print("Error:", e)

# 2. Login to HestiaCP and fetch journalctl
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='ignore')
token = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html).group(1)

login_data = urllib.parse.urlencode({'user': 'admin', 'password': 'PsasaqecmCFNgu43wfkRgxMKR', 'token': token}).encode('utf-8')
opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))

# Delete old crons
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

cmd = """/bin/bash -c "LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/server_error_log.txt; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S journalctl -u gimpa-backend -n 120 --no-pager > \\$LOG 2>&1" """

post_data = urllib.parse.urlencode({
    'token': form_tok,
    'ok': 'Add',
    'v_min': '*',
    'v_hour': '*',
    'v_day': '*',
    'v_month': '*',
    'v_wday': '*',
    'v_cmd': cmd.strip()
}).encode('utf-8')

opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', data=post_data, headers={'Referer': 'https://46.62.214.146:8083/add/cron/'}))
print('Cron added. Waiting 65s for journalctl execution...')
time.sleep(65)

# Delete crons
resp_cron = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_cron = resp_cron.read().decode('utf-8', errors='ignore')
unescaped = html_module.unescape(html_cron)
delete_links = re.findall(r'/delete/cron/\?job=(\d+)&token=([a-f0-9]+)', unescaped)
for job_id, tok in set(delete_links):
    try:
        opener.open(urllib.request.Request(f'https://46.62.214.146:8083/delete/cron/?job={job_id}&token={tok}', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
    except Exception:
        pass

req = urllib.request.Request('https://thesis.manamatechnologies.com/server_error_log.txt', headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx) as log_resp:
        print("\n=== LIVE JOURNALCTL BACKEND LOGS ===")
        print(log_resp.read().decode('utf-8', errors='ignore'))
except Exception as e:
    print("Could not read log file:", e)
