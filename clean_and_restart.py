import urllib.request, urllib.parse, http.cookiejar, ssl, re, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='ignore')
token = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html).group(1)

login_data = urllib.parse.urlencode({'user': 'admin', 'password': 'PsasaqecmCFNgu43wfkRgxMKR', 'token': token}).encode('utf-8')
opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))

resp_cron = opener.open('https://46.62.214.146:8083/list/cron/')
html_cron = resp_cron.read().decode('utf-8', errors='ignore')
jobs = re.findall(r'href=["\'](/delete/cron/\?job=(\d+)&amp;token=([a-f0-9]+))["\']', html_cron)
print('Found cron jobs to delete:', len(jobs))
for path, job_id, tok in jobs:
    print(f'Deleting job {job_id}...')
    try:
        del_url = f'https://46.62.214.146:8083/delete/cron/?job={job_id}&token={tok}'
        opener.open(urllib.request.Request(del_url, headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
    except Exception as e:
        print(f'Err deleting {job_id}: {e}')

resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={
    'Referer': 'https://46.62.214.146:8083/list/cron/',
    'User-Agent': 'Mozilla/5.0'
}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

admin_hash = '$2b$12$u1PuFa1sn0jZNN10QAOB7eYKdXKR32/.PbuRBUflrNOamiEDZHCCi'
cmd = f"""/bin/bash -c "LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/deploy_status.txt; echo 'STARTING_SERVICES_RESTART' > \\$LOG; python3 -c \\"import sqlite3; conn=sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db'); conn.cursor().execute('UPDATE users SET hashed_password=\\\'{admin_hash}\\\' WHERE email=\\\'admin@gimpa.edu.gh\\\''); conn.commit(); conn.close(); print('Admin password set to Admin12345')\\" >> \\$LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-backend >> \\$LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-frontend >> \\$LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart nginx >> \\$LOG 2>&1; echo 'SERVICES_SUCCESSFULLY_RESTARTED' >> \\$LOG 2>&1" """

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

req_save = urllib.request.Request('https://46.62.214.146:8083/add/cron/', data=post_data, headers={
    'Referer': 'https://46.62.214.146:8083/add/cron/',
    'Origin': 'https://46.62.214.146:8083',
    'User-Agent': 'Mozilla/5.0',
    'Content-Type': 'application/x-www-form-urlencoded'
})
resp_save = opener.open(req_save)
print('Added clean cron job, status:', resp_save.status)
