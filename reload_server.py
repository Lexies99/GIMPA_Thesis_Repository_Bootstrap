import urllib.request, urllib.parse, http.cookiejar, ssl, re, time

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

resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={
    'Referer': 'https://46.62.214.146:8083/list/cron/',
    'User-Agent': 'Mozilla/5.0'
}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

# Script command
admin_hash = '$2b$12$u1PuFa1sn0jZNN10QAOB7eYKdXKR32/.PbuRBUflrNOamiEDZHCCi'
cmd = f"""/bin/bash -c "LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/deploy_status.txt; echo 'RUNNING_DEPLOY' > \\$LOG; cd /home/admin/web/thesis.manamatechnologies.com/app/frontend >> \\$LOG 2>&1; rm -rf build >> \\$LOG 2>&1; npm run build >> \\$LOG 2>&1; cp -ru build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ >> \\$LOG 2>&1; python3 -c \\"import sqlite3; conn=sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db'); conn.cursor().execute('UPDATE users SET hashed_password=\\\'{admin_hash}\\\' WHERE email=\\\'admin@gimpa.edu.gh\\\''); conn.commit(); conn.close(); print('Admin pass set')\\" >> \\$LOG 2>&1; pkill -9 -f 'react-router-serve' >> \\$LOG 2>&1; pkill -9 -f 'uvicorn app.main:app' >> \\$LOG 2>&1; nohup python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2 > /tmp/backend.log 2>&1 & nohup npm run start -- --port 3000 > /tmp/frontend.log 2>&1 & echo 'RELOADED_PROCESSES_OK' >> \\$LOG 2>&1" """

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
print('Scheduled fresh reload job, status:', resp_save.status)
