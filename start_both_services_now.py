import urllib.request, urllib.parse, http.cookiejar, ssl, re, time, sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

# Login
resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='ignore')
token = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html).group(1)

login_data = urllib.parse.urlencode({'user': 'admin', 'password': 'PsasaqecmCFNgu43wfkRgxMKR', 'token': token}).encode('utf-8')
opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))
print('Logged into HestiaCP.', flush=True)

# Delete existing crons
resp_list = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_list = resp_list.read().decode('utf-8', errors='ignore')
job_ids = set(re.findall(r'job=(\d+)', html_list))
tok_m = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_list)
if tok_m:
    cur_tok = tok_m.group(1)
    for jid in job_ids:
        try:
            del_url = f'https://46.62.214.146:8083/delete/cron/?job={jid}&token={cur_tok}'
            opener.open(urllib.request.Request(del_url, headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
            print(f'Deleted cron {jid}', flush=True)
        except Exception as e:
            print(f'Error deleting {jid}: {e}', flush=True)

# Add restart cron
resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

cmd = """/bin/bash -c "echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend gimpa-frontend nginx" """

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
print('Added restart cron. Waiting 65s for execution...', flush=True)
time.sleep(65)

# Clean up crons
resp_list2 = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_list2 = resp_list2.read().decode('utf-8', errors='ignore')
job_ids2 = set(re.findall(r'job=(\d+)', html_list2))
tok_m2 = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_list2)
if tok_m2:
    cur_tok2 = tok_m2.group(1)
    for jid in job_ids2:
        try:
            del_url = f'https://46.62.214.146:8083/delete/cron/?job={jid}&token={cur_tok2}'
            opener.open(urllib.request.Request(del_url, headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
            print(f'Deleted cron {jid}', flush=True)
        except Exception as e:
            print(f'Error deleting {jid}: {e}', flush=True)

print('Restart complete and crons cleared.', flush=True)
