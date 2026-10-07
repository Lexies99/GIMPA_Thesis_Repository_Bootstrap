import urllib.request, urllib.parse, http.cookiejar, ssl, re, time, html as html_module

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

# 1. Login to HestiaCP
resp = opener.open('https://46.62.214.146:8083/login/')
html = resp.read().decode('utf-8', errors='ignore')
token = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html).group(1)

login_data = urllib.parse.urlencode({'user': 'admin', 'password': 'PsasaqecmCFNgu43wfkRgxMKR', 'token': token}).encode('utf-8')
opener.open(urllib.request.Request('https://46.62.214.146:8083/login/', data=login_data))

# 2. Delete all existing cron jobs
resp_cron = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_cron = resp_cron.read().decode('utf-8', errors='ignore')
unescaped = html_module.unescape(html_cron)
delete_links = re.findall(r'/delete/cron/\?job=(\d+)&token=([a-f0-9]+)', unescaped)
for job_id, tok in set(delete_links):
    try:
        opener.open(urllib.request.Request(f'https://46.62.214.146:8083/delete/cron/?job={job_id}&token={tok}', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
    except Exception:
        pass

# 3. Add fresh cron command
resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/cron/', 'User-Agent': 'Mozilla/5.0'}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

cmd = """/bin/bash -c "LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/restart_verify.log; echo 'STARTING_RESTART' > $LOG; cd /home/admin/web/thesis.manamatechnologies.com/app/frontend >> $LOG 2>&1; npm run build >> $LOG 2>&1; cp -rf build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ >> $LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl restart gimpa-frontend gimpa-backend nginx >> $LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S systemctl status gimpa-frontend --no-pager >> $LOG 2>&1; echo 'RESTART_FINISHED' >> $LOG 2>&1" """

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
opener.open(req_save)
print("Restart & rebuild cron scheduled! Waiting 65s for cron runner...")

time.sleep(65)

# Cleanup cron
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
    with urllib.request.urlopen(urllib.request.Request('https://thesis.manamatechnologies.com/restart_verify.log', headers={'User-Agent': 'Mozilla/5.0'}), context=ctx) as f:
        print("Verification Log:\n", f.read().decode('utf-8', errors='ignore'))
except Exception as e:
    print("Could not read verification log:", e)
