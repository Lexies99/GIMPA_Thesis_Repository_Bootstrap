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
print('Logged into HestiaCP.')

# Delete all existing cron jobs
resp_list = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_list = resp_list.read().decode('utf-8', errors='ignore')
job_ids = re.findall(r'job=(\d+)', html_list)
tok_m = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_list)
if tok_m:
    cur_tok = tok_m.group(1)
    for jid in set(job_ids):
        try:
            del_url = f'https://46.62.214.146:8083/delete/cron/?job={jid}&token={cur_tok}'
            opener.open(urllib.request.Request(del_url, headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
            print(f'Deleted old job {jid}')
        except Exception as e:
            print(f'Error deleting {jid}: {e}')

# Get add form token
resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

# Full deployment and sudo -S restart
deploy_cmd = """/bin/bash -c "LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/deploy_status.txt; echo 'START_RUN' > \\$LOG; cd /home/admin/web/thesis.manamatechnologies.com/app >> \\$LOG 2>&1; git fetch origin main >> \\$LOG 2>&1; git reset --hard origin/main >> \\$LOG 2>&1; cd /home/admin/web/thesis.manamatechnologies.com/app/frontend >> \\$LOG 2>&1; npm run build >> \\$LOG 2>&1; cp -ru build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ >> \\$LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-frontend >> \\$LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend >> \\$LOG 2>&1; echo 'DEPLOY_AND_RESTART_ALL_DONE' >> \\$LOG 2>&1" """

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

resp_save = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', data=post_data, headers={
    'Referer': 'https://46.62.214.146:8083/add/cron/',
    'Content-Type': 'application/x-www-form-urlencoded'
}))
print('Added deploy & restart cron job, status:', resp_save.status)
