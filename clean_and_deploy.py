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
print('Logged into HestiaCP.')

# Delete all existing jobs
resp_cron = opener.open(urllib.request.Request('https://46.62.214.146:8083/list/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/user/'}))
html_cron = resp_cron.read().decode('utf-8', errors='ignore')

import html as html_module
unescaped = html_module.unescape(html_cron)
delete_links = re.findall(r'/delete/cron/\?job=(\d+)&token=([a-f0-9]+)', unescaped)
for job_id, tok in set(delete_links):
    del_url = f'https://46.62.214.146:8083/delete/cron/?job={job_id}&token={tok}'
    try:
        r = opener.open(urllib.request.Request(del_url, headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
        print(f'Deleted job {job_id}')
    except Exception as e:
        print(f'Error deleting {job_id}: {e}')

# Get fresh add token
resp_add = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', headers={'Referer': 'https://46.62.214.146:8083/list/cron/'}))
html_add = resp_add.read().decode('utf-8', errors='ignore')
form_tok = re.search(r'name=["\']token["\']\s+value=["\']([^"\']+)["\']', html_add).group(1)

# Add single clean deploy script execution
script_text = """/bin/bash -c "LOG=/home/admin/web/thesis.manamatechnologies.com/public_html/deploy_status.txt; echo 'RUNNING_DEPLOY_ALL' > \\$LOG; cd /home/admin/web/thesis.manamatechnologies.com/app/frontend >> \\$LOG 2>&1; git fetch origin main >> \\$LOG 2>&1; git reset --hard origin/main >> \\$LOG 2>&1; npm run build >> \\$LOG 2>&1; cp -ru build/client/* /home/admin/web/thesis.manamatechnologies.com/public_html/ >> \\$LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S /bin/systemctl restart gimpa-frontend >> \\$LOG 2>&1; echo 'PsasaqecmCFNgu43wfkRgxMKR' | sudo -S /bin/systemctl restart gimpa-backend >> \\$LOG 2>&1; echo 'DEPLOY_DONE_SUCCESS' >> \\$LOG 2>&1" """

post_data = urllib.parse.urlencode({
    'token': form_tok,
    'ok': 'Add',
    'v_min': '*',
    'v_hour': '*',
    'v_day': '*',
    'v_month': '*',
    'v_wday': '*',
    'v_cmd': script_text.strip()
}).encode('utf-8')

resp_save = opener.open(urllib.request.Request('https://46.62.214.146:8083/add/cron/', data=post_data, headers={
    'Referer': 'https://46.62.214.146:8083/add/cron/',
    'Content-Type': 'application/x-www-form-urlencoded'
}))
print('Added clean single deploy job, status:', resp_save.status)
